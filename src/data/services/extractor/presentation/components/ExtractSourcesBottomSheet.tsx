import {View, StyleSheet, Alert, Linking, Image} from 'react-native';
import React, {useEffect, useMemo, useState, useCallback, useRef} from 'react';
import {ScrollView} from 'react-native-gesture-handler';
import {
  ActivityIndicator,
  List,
  useTheme,
  Text,
  Portal,
  Dialog,
  Button,
} from 'react-native-paper';
import BottomSheet, {BottomSheetView} from '@gorhom/bottom-sheet';
import {BottomSheetMethods} from '@gorhom/bottom-sheet/lib/typescript/types';
import RawAudio from '../../../../../features/plugins/data/model/media/RawAudio';
import RawVideo from '../../../../../features/plugins/data/model/media/RawVideo';
import ExtractorAudio from '../../../../../features/plugins/data/model/media/ExtractorAudio';
import MediaType from '../../../../../features/plugins/data/model/media/MediaType';
import ExtractorVideo from '../../../../../features/plugins/data/model/media/ExtractorVideo';
import {useExtractorServiceStore} from '../state/ExtractorServiceStore';
import SendIntentAndroid from 'react-native-send-intent';
import DetailedItem from '../../../../../features/plugins/data/model/item/DetailedItem';
import {ExtractorViewModel} from '../viewmodels/ExtractorViewModel';
import LazyImage from '../../../../../core/shared/components/LazyImage';
import RNWebVideoCaster, {
  WebVideoCasterOptions,
  SubtitleTrack,
} from 'rn-web-video-caster';
import detectVideoMimeType from '../../../../../core/utils/detectVideoMimeType';
import {useNavigation} from '@react-navigation/native';
import {MediaToView} from '../../../../../features/media/domain/entities/MediaToView';
import {
  createWebView,
  bridge as createBridge,
} from '@webview-bridge/react-native';
import {WebViewMessageEvent} from 'react-native-webview';

const ExtractorSourcesBottomSheet = ({
  bottomSheetRef,
}: {
  bottomSheetRef: React.RefObject<BottomSheetMethods>;
}) => {
  const theme = useTheme();
  const navigation = useNavigation();

  const {
    detailedItem,
    mediaIndex,
    extracting,
    setExtracting,
    bottomSheetVisible,
    setBottomSheetVisible: setVisible,
    rawSources,
    setRawSources,
    sources,
    setSources,

    // webview extraction helpers from the store
    currentWebviewRequest,
    receiveWebviewResponse,
  } = useExtractorServiceStore(state => state);

  // Create a lightweight webview-bridge here so injected pages can call native methods
  // instead of (or in addition to) window.ReactNativeWebView.postMessage.
  // We keep the bridge creation inside the component so it can close over the
  // current receiveWebviewResponse and currentWebviewRequest values.
  const appBridge = React.useMemo(() => {
    try {
      return createBridge({
        // This method will be callable from the web context. The injected JS will
        // call `window.bridge.postWebviewPayload(JSON.stringify(payload))`.
        async postWebviewPayload(payloadStr: string) {
          try {
            const payload =
              typeof payloadStr === 'string'
                ? JSON.parse(payloadStr)
                : payloadStr;
            // Forward payload to the extractor store using the current request id
            // If there's no active request, just ignore.
            try {
              const state = useExtractorServiceStore.getState();
              const current = state.currentWebviewRequest;
              if (current && current.id) {
                state.receiveWebviewResponse(current.id, payload);
              } else {
                // no active request - still log for debugging
                console.log(
                  '[ExtractorBottomSheet][bridge] No active webview request - payload dropped',
                  payload,
                );
              }
            } catch (e) {
              console.warn(
                '[ExtractorBottomSheet][bridge] Failed to forward payload to store',
                e,
              );
            }
            return true;
          } catch (e) {
            try {
              console.warn('[ExtractorBottomSheet][bridge] invalid payload', e);
            } catch (e2) {}
            return false;
          }
        },
      });
    } catch (e) {
      console.warn('[ExtractorBottomSheet] createBridge failed', e);
      return null as any;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Create the WebView component bound to our bridge. Using useMemo avoids
  // recreating the component on every render.
  const {WebView: BridgeWebView} = React.useMemo(() => {
    try {
      if (appBridge) {
        return createWebView({bridge: appBridge, debug: true});
      }
    } catch (e) {
      console.warn('[ExtractorBottomSheet] createWebView failed', e);
    }
    // Fallback: return an object shape with the original WebView so rest of code is unchanged.
    return {WebView: (require('react-native-webview') as any).WebView};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appBridge]);

  const extractorViewModel = useRef(new ExtractorViewModel()).current;

  // WebView local state to force reload when request changes
  const [webviewKey, setWebviewKey] = useState(0);
  const webviewRef = useRef<any>(null);
  const requestStartRef = useRef<number | null>(null);
  // Keep last message from WebView for debugging UI
  const [lastWebviewMessage, setLastWebviewMessage] = useState<{
    videos: string[];
    subtitles: string[];
  } | null>(null);

  useEffect(() => {
    if (currentWebviewRequest) {
      // bump key so WebView reloads the new url
      setWebviewKey(k => k + 1);
      // record the start time for this request so we can enforce waitMs
      try {
        requestStartRef.current = Date.now();
      } catch (e) {}
      try {
        console.log(
          '[ExtractorBottomSheet] currentWebviewRequest:',
          currentWebviewRequest,
        );
      } catch (e) {}
    } else {
      // clear start time when no active request
      try {
        requestStartRef.current = null;
      } catch (e) {}
      try {
        console.log('[ExtractorBottomSheet] no currentWebviewRequest');
      } catch (e) {}
    }
  }, [currentWebviewRequest]);

  // Handler for messages coming from the injected JS inside the WebView.
  // Enforces the configured waitMs by deferring processing of early messages.
  const handleWebviewMessage = (event: WebViewMessageEvent) => {
    // Helper to actually process and forward the payload to the store
    const processPayload = (payload: any) => {
      try {
        // Support special probe messages from the injected script where each inspected
        // request is posted back as { probeUrl, ext, isVideo, isSubtitle, __meta }.
        if (payload && payload.probeUrl) {
          try {
            console.log(
              '[ExtractorBottomSheet] Probe from WebView — inspected URL:',
              payload.probeUrl,
              'ext:',
              payload.ext,
              'isVideo:',
              payload.isVideo,
              'isSubtitle:',
              payload.isSubtitle,
              'meta:',
              payload.__meta || payload.meta,
            );
          } catch (e) {}
          // Do not resolve the store promise for probe-only messages.
          return;
        }

        const videos = Array.isArray(payload.videos) ? payload.videos : [];
        const subtitles = Array.isArray(payload.subtitles)
          ? payload.subtitles
          : [];
        try {
          console.log('[ExtractorBottomSheet] WebView posted message:', {
            videos,
            subtitles,
            meta: payload.__meta,
          });
        } catch (e) {}
        // store last message for visible debug panel
        setLastWebviewMessage({videos, subtitles});
        if (currentWebviewRequest && currentWebviewRequest.id) {
          // send response to store which will resolve the pending promise
          // Include the __meta payload so the store can enforce the correct
          // minimum wait time based on when the WebView actually posted.
          receiveWebviewResponse(currentWebviewRequest.id, {
            videos,
            subtitles,
            __meta:
              payload && payload.__meta
                ? payload.__meta
                : {
                    postedAt: Date.now(),
                    waitMs:
                      (currentWebviewRequest && currentWebviewRequest.waitMs) ||
                      1500,
                  },
          } as any);
        }
      } catch (e) {
        try {
          console.warn(
            '[ExtractorBottomSheet] Failed to process WebView message',
            e,
          );
        } catch (e2) {}
      }
    };

    try {
      const payload = JSON.parse(event.nativeEvent?.data || '{}');
      const wait =
        (currentWebviewRequest && currentWebviewRequest.waitMs) || 1500;
      const start = requestStartRef.current || Date.now();
      const elapsed = Date.now() - start;
      if (elapsed < wait) {
        const remaining = wait - elapsed;
        try {
          console.log(
            '[ExtractorBottomSheet] Received WebView message early — deferring processing for ms:',
            remaining,
            'requestId:',
            currentWebviewRequest ? currentWebviewRequest.id : 'none',
          );
        } catch (e) {}
        const expectedRequestId = currentWebviewRequest
          ? currentWebviewRequest.id
          : null;
        setTimeout(() => {
          // Only process if the same request is still active
          if (
            !currentWebviewRequest ||
            currentWebviewRequest.id !== expectedRequestId
          ) {
            try {
              console.log(
                '[ExtractorBottomSheet] Request changed — dropping deferred message',
              );
            } catch (e) {}
            return;
          }
          processPayload(payload);
        }, remaining);
        return;
      }
      // enough time has elapsed — process immediately
      processPayload(payload);
    } catch (e) {
      try {
        console.warn(
          '[ExtractorBottomSheet] Failed to parse WebView message',
          e,
        );
      } catch (e2) {}
      setLastWebviewMessage({videos: [], subtitles: []});
      if (currentWebviewRequest && currentWebviewRequest.id) {
        // Include meta so the store can correctly compute any remaining wait
        receiveWebviewResponse(currentWebviewRequest.id, {
          videos: [],
          subtitles: [],
          __meta: {
            postedAt: Date.now(),
            waitMs:
              (currentWebviewRequest && currentWebviewRequest.waitMs) || 1500,
          },
        });
      }
    }
  };

  // State for player choice dialog
  const [playerDialogVisible, setPlayerDialogVisible] =
    useState<boolean>(false);
  const [selectedMedia, setSelectedMedia] = useState<
    RawAudio | RawVideo | null
  >(null);

  useEffect(() => {
    const doExtraction = async () => {
      // console.log('rawSources', rawSources);
      if (rawSources.length === 0) return;

      setExtracting(true);

      const sourcesToBeExtracted: (ExtractorAudio | ExtractorVideo)[] = [];
      const readySources: (RawAudio | RawVideo)[] = [];

      rawSources.forEach(source => {
        if (
          source.type === MediaType.ExtractorAudio ||
          source.type === MediaType.ExtractorVideo
        ) {
          sourcesToBeExtracted.push(source as ExtractorAudio | ExtractorVideo);
        } else {
          readySources.push(source as RawAudio | RawVideo);
        }
      });

      // Set ready sources immediately
      setSources(readySources);

      if (sourcesToBeExtracted.length > 0) {
        try {
          // Extract sources that need extraction in parallel
          // const extractionPromises = sourcesToBeExtracted.map(
          //   source =>
          //     new Promise<RawAudio[] | RawVideo[]>(resolve => {
          //       try {
          //         resolve(extractorViewModel.extract(source));
          //       } catch (error) {
          //         console.warn('Extraction error:', error);
          //         resolve([]);
          //       }
          //     }),
          //   // extractorViewModel.extract(source),
          // );

          // const results = await Promise.all(extractionPromises);
          // console.log('results', results);
          // const allExtractedSources = results.flat();

          // setSources([...sources, ...allExtractedSources]);

          // Extract sources one by one
          for (const source of sourcesToBeExtracted) {
            try {
              const extractedSources = await extractorViewModel.extract(source);
              setSources([...sources, ...extractedSources]);
            } catch (error) {
              console.warn('Extraction error:', error);
              continue;
            }
          }

          // Update sources with all extracted results at once
        } catch (error) {
          console.warn('Extraction error:', error);
        }
      }

      setExtracting(false);
    };

    if (!extracting && rawSources.length > 0) {
      doExtraction();
    }
  }, []);

  const openMedia = useCallback(
    async (
      media: RawAudio | RawVideo,
      item: DetailedItem,
      index: number = 0,
      mediaPlayerToOpen: 'mxplayer' | 'webvideocast' = 'webvideocast',
    ): Promise<void> => {
      if (mediaPlayerToOpen === 'mxplayer') {
        await SendIntentAndroid.isAppInstalled(
          'com.mxtech.videoplayer.ad',
        ).then(async isInstalled => {
          if (isInstalled) {
            await SendIntentAndroid.openAppWithData(
              'com.mxtech.videoplayer.ad',
              media.url,
              'video/*',
              {
                title: item.name + ' - ' + item.media[index].name,
                headers: JSON.stringify(media.headers),
              },
            );
          } else {
            Alert.alert(
              'MX Player is not installed, would you like to install it?',
              'You can always install it later from the Play Store',
              [
                {
                  text: 'Cancel',
                  onPress: () => {},
                  style: 'cancel',
                },
                {
                  text: 'Install',
                  onPress: async () => {
                    await Linking.openURL(
                      'market://details?id=com.mxtech.videoplayer.ad',
                    );
                  },
                },
              ],
            );
          }
        });
      } else {
        await SendIntentAndroid.isAppInstalled(
          'com.instantbits.cast.webvideo',
        ).then(async isInstalled => {
          if (isInstalled) {
            const options: WebVideoCasterOptions = {
              videoURL: media.url,
              title: item.name + ' - ' + item.media[index].name,
              posterURL: media.iconUrl,
              headers: media.headers,
              subtitles: media.subtitles,
              hideVideoAddress: false,
              position: 0,
              filename:
                item.name +
                ' - ' +
                item.media[index].name +
                media.url.split('/').pop(),
              suppressErrorMessage: false,
              mimeType: detectVideoMimeType(media.url),
            };
          } else {
            Alert.alert(
              'Web Video Cast is not installed, would you like to install it?',
              'You can always install it later from the Play Store',
              [
                {
                  text: 'Cancel',
                  onPress: () => {},
                  style: 'cancel',
                },
                {
                  text: 'Install',
                  onPress: async () => {
                    await Linking.openURL(
                      'market://details?id=com.instantbits.cast.webvideo',
                    );
                  },
                },
              ],
            );
          }
        });
      }
    },
    [],
  );

  // console.log("rawSources", rawSources)

  // Build injected JS string with a configurable wait time (ms).
  // Ensure the page waits until it has fully loaded, then wait `ms`
  // milliseconds before posting extraction results back to RN.
  const buildInjectedJS = (waitMs: number = 1500) => {
    const ms = Number(waitMs) || 1500;
    return `
    (function() {
      try {
        const found = { videos: [], subtitles: [] };
        function pushIfUnique(arr, v) {
          if (!v) return;
          if (arr.indexOf(v) === -1) arr.push(v);
        }
        function inspectUrl(u) {
          try {
            if (!u) return;
            const s = String(u);
            // canonicalize path portion to detect extension
            const p = s.split('?')[0].split('#')[0];
            const m = p.match(/\\.([a-z0-9]{1,6})$/i);
            const ext = m && m[1] ? m[1].toLowerCase() : '';
            const lu = s.toLowerCase();
            const isVideoByExt = !!ext && /^(m3u8|mp4|mkv|webm|flv|mov|avi|wmv|m4p|m4b|m4v)$/i.test(ext);
            const isSubtitleByExt = !!ext && /^(srt|vtt|ass|ssa|smi)$/i.test(ext);
            const isVideoByHint = lu.indexOf('m3u8') !== -1;
            const isVideo = isVideoByExt || isVideoByHint;
            const isSubtitle = isSubtitleByExt;
            // Post a probe so native can log every inspected request
            try {
              const _msg = JSON.stringify({
                probeUrl: s,
                ext: ext,
                isVideo: isVideo,
                isSubtitle: isSubtitle,
                __meta: { postedAt: Date.now(), waitMs: ${ms}, stage: 'probe' },
              });
              if (window.bridge && typeof window.bridge.postWebviewPayload === 'function') {
                try { window.bridge.postWebviewPayload(_msg); } catch(e){}
              } else if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
                try { window.ReactNativeWebView.postMessage(_msg); } catch(e){}
              }
            } catch (e) {}
            // Only collect when it clearly looks like a video or subtitle
            if (isVideo) {
              pushIfUnique(found.videos, s);
            }
            if (isSubtitle) {
              pushIfUnique(found.subtitles, s);
            }
          } catch (e) {}
        }

        // Override fetch
        const origFetch = window.fetch;
        window.fetch = function() {
          try {
            const url = arguments[0] && (typeof arguments[0] === 'string' ? arguments[0] : (arguments[0] && arguments[0].url));
            inspectUrl(url);
          } catch(e){}
          return origFetch.apply(this, arguments);
        };

        // Override XHR open
        (function() {
          const OrigXHR = window.XMLHttpRequest;
          function XHRInterceptor() {
            const xhr = new OrigXHR();
            const origOpen = xhr.open;
            xhr.open = function(method, url) {
              try { inspectUrl(url); } catch(e){}
              return origOpen.apply(this, arguments);
            };
            return xhr;
          }
          XHRInterceptor.prototype = OrigXHR.prototype;
          window.XMLHttpRequest = XHRInterceptor;
        })();

        // Observe additions to DOM for <video>, <source>, <track> and scan iframes.
        // For iframes we attempt to inspect the iframe's src and, when same-origin,
        // probe the iframe's performance entries and location to discover network requests.
        function inspectMediaElements() {
          try {
            const vids = Array.from(document.querySelectorAll('video, source, track'));
            vids.forEach(el => {
              const src = el.src || (el.getAttribute && el.getAttribute('src'));
              inspectUrl(src);
            });

            // Inspect anchors/links that might point directly to media or subtitles
            try {
              const links = Array.from(document.querySelectorAll('a, link'));
              links.forEach(a => {
                try {
                  const href = a.href || (a.getAttribute && a.getAttribute('href'));
                  inspectUrl(href);
                } catch(e){}
              });
            } catch(e){}

            // Inspect iframes: check iframe.src and, when same-origin, inspect its resources
            try {
              const iframes = Array.from(document.querySelectorAll('iframe'));
              iframes.forEach(frame => {
                try {
                  const fsrc = frame.src || (frame.getAttribute && frame.getAttribute('src'));
                  inspectUrl(fsrc, true);
                } catch(e){}
  
                try {
                  // If iframe is same-origin we can access its performance entries and location
                  const cw = frame.contentWindow;
                  if (cw) {
                    try {
                      // Try to inspect iframe location (may throw for cross-origin)
                      const loc = cw.location && cw.location.href;
                      inspectUrl(loc, true);
                    } catch(e){}
  
                    try {
                      // If same-origin, inspect performance resource entries inside iframe
                      if (cw.performance && typeof cw.performance.getEntriesByType === 'function') {
                        const entries = cw.performance.getEntriesByType('resource') || [];
                        entries.forEach(en => {
                          try {
                            if (en && en.name) inspectUrl(en.name, true);
                          } catch(e){}
                        });
                      } else if (cw.performance && cw.performance.getEntries) {
                        const entries = cw.performance.getEntries() || [];
                        entries.forEach(en => {
                          try {
                            if (en && en.name) inspectUrl(en.name, true);
                          } catch(e){}
                        });
                      }
                    } catch(e){}
                  }
                } catch(e){}
              });
            } catch(e){}
          } catch(e){}
        }

        // Try to parse performance entries for resources loaded.
        // Prefer getEntriesByType('resource') which contains network requests
        // (fetch/XHR, images, media, etc.). Fall back to getEntries().
        try {
          if (performance && typeof performance.getEntriesByType === 'function') {
            const entries = performance.getEntriesByType('resource') || [];
            entries.forEach(en => {
              try {
                if (en && en.name) inspectUrl(en.name);
              } catch(e){}
            });
          } else if (performance && performance.getEntries) {
            const entries = performance.getEntries();
            entries.forEach(en => {
              try {
                if (en && en.name) inspectUrl(en.name);
              } catch(e){}
            });
          }
        } catch(e){}

        // Expose a function that can be called to post the latest found results
        window.__postFound = function() {
          try {
            inspectMediaElements();
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              videos: found.videos,
              subtitles: found.subtitles,
              __meta: { postedAt: Date.now(), waitMs: ${ms}, stage: 'manual' }
            }));
          } catch(e){}
        };

        // Helper that posts results and includes metadata for debugging
        function _postWithMeta(stage) {
          try {
            inspectMediaElements();
            const _msg = JSON.stringify({
              videos: found.videos,
              subtitles: found.subtitles,
              __meta: { postedAt: Date.now(), waitMs: ${ms}, stage: stage }
            });
            if (window.bridge && typeof window.bridge.postWebviewPayload === 'function') {
              try { window.bridge.postWebviewPayload(_msg); } catch(e){}
            } else if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
              try { window.ReactNativeWebView.postMessage(_msg); } catch(e){}
            }
          } catch(e){}
        }

        // If page already complete, wait ms then post. Otherwise wait for load event first.
        function schedulePost() {
          try {
            if (document.readyState === 'complete') {
              setTimeout(function(){ _postWithMeta('afterComplete'); }, ${ms});
              // extra retry in case dynamic loads happen
              setTimeout(function(){ _postWithMeta('afterComplete-retry'); }, ${
                ms * 2
              });
            } else {
              window.addEventListener('load', function() {
                try {
                  setTimeout(function(){ _postWithMeta('onLoad'); }, ${ms});
                  setTimeout(function(){ _postWithMeta('onLoad-retry'); }, ${
                    ms * 2
                  });
                } catch(e){}
              }, {once: true});
              // Fallback: if load never fires, still post after a maximum timeout
              setTimeout(function(){ _postWithMeta('fallback-max-timeout'); }, ${
                ms * 3
              });
            }
          } catch(e){}
        }

        // Initial quick inspect to capture any synchronous resources
        inspectMediaElements();
        // Schedule the timed post after load/complete as described
        schedulePost();

      } catch(e) {
        try {
          const _msg = JSON.stringify({videos: [], subtitles: [], __meta: {error: true}});
          if (window.bridge && typeof window.bridge.postWebviewPayload === 'function') {
            try { window.bridge.postWebviewPayload(_msg); } catch(e){}
          } else if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
            try { window.ReactNativeWebView.postMessage(_msg); } catch(e){}
          }
        } catch(e){}
      }
    })();
    true;
    `;
  };

  return (
    <>
      <BottomSheet
        ref={bottomSheetRef}
        index={bottomSheetVisible ? 0 : -1}
        snapPoints={useMemo(() => ['50%'], [])}
        handleStyle={{backgroundColor: theme.colors.surface}}
        enablePanDownToClose={true}
        enableDynamicSizing={true}
        backgroundStyle={{
          backgroundColor: theme.colors.surface,
        }}
        onClose={() => {
          setVisible(false);
          setExtracting(false);
          // setNoSources(false);
          setRawSources([]);
          setSources([]);
          setPlayerDialogVisible(false);
          setSelectedMedia(null);
        }}>
        <BottomSheetView style={styles.bottomSheetOptions}>
          {/* Debug panel (visible) */}
          <View
            style={{
              padding: 8,
              backgroundColor: '#111',
              marginBottom: 8,
              borderRadius: 6,
            }}>
            <Text style={{color: '#fff', fontWeight: 'bold'}}>
              Extractor Debug
            </Text>
            <Text style={{color: '#fff'}}>
              Request:{' '}
              {currentWebviewRequest ? currentWebviewRequest.id : 'none'}
            </Text>
            <Text style={{color: '#fff'}} numberOfLines={2}>
              URL: {currentWebviewRequest ? currentWebviewRequest.url : '-'}
            </Text>
            <Text style={{color: '#fff'}}>
              Last message:{' '}
              {lastWebviewMessage ? JSON.stringify(lastWebviewMessage) : 'none'}
            </Text>
          </View>

          {sources.length < 1 ? (
            !extracting ? (
              <Text style={{textAlign: 'center'}}>No Sources Found</Text>
            ) : (
              <ActivityIndicator size="large" />
            )
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                flexGrow: 1,
              }}>
              {sources.map((source, sourceIndex) => (
                <List.Item
                  key={sourceIndex}
                  title={source.name}
                  left={(props: any) =>
                    source.iconUrl ? (
                      <Image source={{uri: source.iconUrl}} {...props} />
                    ) : (
                      <LazyImage
                        placeholderSource="square"
                        style={{borderRadius: 4}}
                      />
                    )
                  }
                  onPress={() => {
                    // Navigate to MediaNavigator with the selected source
                    const mediaToView: MediaToView = {
                      type: (source.type === MediaType.RawVideo
                        ? 'Video'
                        : 'Audio') as MediaToView['type'],
                      media: [source],
                      details: detailedItem,
                      index: 0,
                    };
                    (navigation as any).navigate('media', {media: mediaToView});
                  }}
                  onLongPress={() => {
                    setSelectedMedia(source);
                    setPlayerDialogVisible(true);
                  }}
                />
              ))}
            </ScrollView>
          )}
        </BottomSheetView>
      </BottomSheet>

      {/* Player choice dialog */}
      <Portal>
        <Dialog
          visible={playerDialogVisible}
          onDismiss={() => setPlayerDialogVisible(false)}>
          <Dialog.Title>Select Video Player</Dialog.Title>
          <Dialog.Content>
            <Text>Which video player would you like to use?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setPlayerDialogVisible(false);
                if (selectedMedia) {
                  openMedia(
                    selectedMedia,
                    detailedItem,
                    mediaIndex,
                    'mxplayer',
                  );
                  setSelectedMedia(null);
                }
              }}>
              MX Player
            </Button>
            <Button
              onPress={() => {
                setPlayerDialogVisible(false);
                if (selectedMedia) {
                  openMedia(
                    selectedMedia,
                    detailedItem,
                    mediaIndex,
                    'webvideocast',
                  );
                  setSelectedMedia(null);
                }
              }}>
              Web Video Cast
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Hidden WebView for extraction */}
      {currentWebviewRequest ? (
        <View style={{height: 150, width: '100%'}}>
          <BridgeWebView
            key={webviewKey}
            ref={webviewRef}
            source={{uri: currentWebviewRequest.url}}
            javaScriptEnabled={true}
            // Run interception script as early as possible (before content loads)
            // so we can override fetch/XHR before the page executes its network code.
            injectedJavaScriptBeforeContentLoaded={buildInjectedJS(
              (currentWebviewRequest && currentWebviewRequest.waitMs) || 1500,
            )}
            // Also keep injectedJavaScript for extra post-detection once page loads
            injectedJavaScript={buildInjectedJS(
              (currentWebviewRequest && currentWebviewRequest.waitMs) || 1500,
            )}
            onMessage={handleWebviewMessage}
            originWhitelist={['*']}
            startInLoadingState={true}
            // Improve compatibility: enable DOM storage / cookies
            domStorageEnabled={true}
            sharedCookiesEnabled={true}
            thirdPartyCookiesEnabled={true}
            // Use a real browser userAgent to avoid simplified mobile sites that hide resources
            userAgent={
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
            onLoadEnd={() => {
              try {
                const wait =
                  (currentWebviewRequest && currentWebviewRequest.waitMs) ||
                  1500;
                try {
                  console.log(
                    '[ExtractorBottomSheet] onLoadEnd (native) — scheduling inject after waitMs:',
                    wait,
                    'requestId:',
                    currentWebviewRequest ? currentWebviewRequest.id : 'none',
                  );
                } catch (e) {}
                // Fallback native-side injection in case the page's timer or load
                // listener doesn't run as expected. This runs after the same waitMs.
                // Capture the expected request id so we don't inject for stale requests.
                const expectedRequestId = currentWebviewRequest
                  ? currentWebviewRequest.id
                  : null;
                setTimeout(() => {
                  // Only inject if the same request is still active
                  if (
                    !currentWebviewRequest ||
                    currentWebviewRequest.id !== expectedRequestId
                  ) {
                    try {
                      console.log(
                        '[ExtractorBottomSheet] Skipping native inject — request changed',
                        'expected:',
                        expectedRequestId,
                        'current:',
                        currentWebviewRequest
                          ? currentWebviewRequest.id
                          : 'none',
                      );
                    } catch (e) {}
                    return;
                  }
                  try {
                    console.log(
                      '[ExtractorBottomSheet] (native) injecting __postFound after waitMs:',
                      wait,
                      'requestId:',
                      currentWebviewRequest ? currentWebviewRequest.id : 'none',
                    );
                  } catch (e) {}
                  try {
                    if (
                      webviewRef.current &&
                      webviewRef.current.injectJavaScript
                    ) {
                      webviewRef.current.injectJavaScript(
                        'try{ window.__postFound && window.__postFound(); }catch(e){};true;',
                      );
                    }
                  } catch (e) {
                    try {
                      console.warn(
                        '[ExtractorBottomSheet] native injectJavaScript failed',
                        e,
                      );
                    } catch (e2) {}
                  }
                }, wait);
              } catch (e) {
                try {
                  console.warn(
                    '[ExtractorBottomSheet] onLoadEnd handler failed',
                    e,
                  );
                } catch (e2) {}
              }
            }}
          />
        </View>
      ) : null}
    </>
  );
};

export default ExtractorSourcesBottomSheet;

const styles = StyleSheet.create({
  bottomSheetOptions: {
    flex: 1,
    flexDirection: 'column',
    padding: 16,
  },
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cardWrapper: {
    width: '30%',
    marginHorizontal: '1.5%',
    marginVertical: '1.5%',
  },
});
