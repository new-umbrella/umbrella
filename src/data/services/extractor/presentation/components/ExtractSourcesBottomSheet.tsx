import {
  View,
  StyleSheet,
  Alert,
  Linking,
  Image,
  DeviceEventEmitter,
  Dimensions,
} from 'react-native';
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { ScrollView } from 'react-native-gesture-handler';
import {
  ActivityIndicator,
  List,
  useTheme,
  Text,
  Portal,
  Dialog,
  Button,
} from 'react-native-paper';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import RawAudio from '../../../../../features/plugins/data/model/media/RawAudio';
import RawVideo from '../../../../../features/plugins/data/model/media/RawVideo';
import ExtractorAudio from '../../../../../features/plugins/data/model/media/ExtractorAudio';
import MediaType from '../../../../../features/plugins/data/model/media/MediaType';
import ExtractorVideo from '../../../../../features/plugins/data/model/media/ExtractorVideo';
import { useExtractorServiceStore } from '../state/ExtractorServiceStore';
import SendIntentAndroid from 'react-native-send-intent';
import DetailedItem from '../../../../../features/plugins/data/model/item/DetailedItem';
import { ExtractorViewModel } from '../viewmodels/ExtractorViewModel';
import LazyImage from '../../../../../core/shared/components/LazyImage';
import RNWebVideoCaster, {
  WebVideoCasterOptions,
  SubtitleTrack,
} from 'rn-web-video-caster';
import detectVideoMimeType from '../../../../../core/utils/detectVideoMimeType';
import { useNavigation } from '@react-navigation/native';
import { MediaToView } from '../../../../../features/media/domain/entities/MediaToView';
import { bridge as createBridge } from '@webview-bridge/react-native';
import { WebViewMessageEvent } from 'react-native-webview';
import { FiltersEngine, Request as AdblockRequest } from '@ghostery/adblocker';
import { InterceptingWebView } from 'react-native-intercepting-webview';

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

  // Track native intercept readiness (declare early so it's not used before declaration)
  const [nativeInterceptReady, setNativeInterceptReady] =
    useState<boolean>(false);

  // Build a regex that matches likely video/subtitle asset URLs (ext + query/hash).
  const nativeUrlRegex = new RegExp(
    '\\.(m3u8|mp4|mkv|webm|flv|mov|avi|wmv|m4p|m4b|m4v|srt|vtt|ass|ssa|smi)(\\?.*)?$',
    'i',
  );

  // webviewExtraProps will be spread into the WebView. It includes nativeUrlRegex/onNativeMatch
  // and DOM-hooking / echo flags when an intercepting implementation is available.
  // Helper: strict extension/substring-based media URL filter used for native matches and JS results.
  const isAllowedMediaUrl = (rawUrl?: string): boolean => {
    try {
      if (!rawUrl || typeof rawUrl !== 'string') return false;
      const s = rawUrl.split('?')[0].split('#')[0].trim();
      if (!s) return false;
      const lower = s.toLowerCase();
      // Quick substring check for streaming playlist
      if (lower.indexOf('.m3u8') !== -1) return true;
      const parts = s.split('.');
      if (parts.length < 2) return false;
      const ext = parts[parts.length - 1].toLowerCase();
      if (/^(m3u8|mp4|mkv|webm|flv|mov|avi|wmv|m4p|m4b|m4v|ts)$/.test(ext))
        return true;
      if (/^(srt|vtt|ass|ssa|smi)$/.test(ext)) return true;
      return false;
    } catch (e) {
      return false;
    }
  };

  // Initialize adblock engine (prebuilt ads+tracking). Keep in ref so we can access it from message handler.
  const adblockEngineRef = React.useRef<any | null>(null);
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Use the prebuilt filters that include ads + tracking for broad blocking.
        const engine = await FiltersEngine.fromPrebuiltAdsAndTracking(
          fetch as any,
        );
        if (mounted) {
          adblockEngineRef.current = engine;
          try {
            console.log('[ExtractorBottomSheet] adblock engine initialized');
          } catch (e) { }
        }
      } catch (e) {
        try {
          console.warn(
            '[ExtractorBottomSheet] Failed to initialize adblock engine',
            e,
          );
        } catch (e2) { }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const extractorViewModel = useRef(new ExtractorViewModel()).current;

  // WebView local state to force reload when request changes
  const webviewRef = useRef<any>(null);
  const requestStartRef = useRef<number | null>(null);
  const lastKickProgressRef = useRef<number>(0);
  // Timer ref used to fall back to enabling navigation when native intercept doesn't signal readiness.
  const nativeReadyTimeoutRef = useRef<any>(null);
  // Keep last message from WebView for debugging UI
  const [lastWebviewMessage, setLastWebviewMessage] = useState<{
    videos: string[];
    subtitles: string[];
  } | null>(null);

  // Accumulate matches from native/DOM hooks and echo them to the store
  const matchedVideosRef = useRef<Set<string>>(new Set());
  const matchedSubtitlesRef = useRef<Set<string>>(new Set());
  // Map of matched URL -> request headers captured from native match
  const headersByUrlRef = useRef<Record<string, Record<string, string>>>({});

  // Track which probe URLs we've already followed per original request
  // to avoid re-following the same iframe/page multiple times.
  const followedProbesRef = useRef<
    Record<string, { set: Set<string>; count: number }>
  >({});


  // Reset accumulators when a new webview request arrives
  useEffect(() => {
    matchedVideosRef.current.clear();
    matchedSubtitlesRef.current.clear();
    headersByUrlRef.current = {};
    setLastWebviewMessage(null);
  }, [currentWebviewRequest?.id]);

  // State for player choice dialog
  const [playerDialogVisible, setPlayerDialogVisible] =
    useState<boolean>(false);
  const [selectedMedia, setSelectedMedia] = useState<
    RawAudio | RawVideo | null
  >(null);

  useEffect(() => {
    const doExtraction = async () => {
      try {
        console.log(
          '[ExtractorBottomSheet] doExtraction start — rawSources length:',
          rawSources.length,
        );
      } catch (e) { }

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

      try {
        console.log(
          '[ExtractorBottomSheet] readySources count:',
          readySources.length,
          'toBeExtracted count:',
          sourcesToBeExtracted.length,
        );
      } catch (e) { }

      // Set ready sources immediately so UI can display any direct sources
      try {
        setSources(readySources);
        console.log(
          '[ExtractorBottomSheet] setSources(readySources) ->',
          readySources,
        );
      } catch (e) {
        console.warn('[ExtractorBottomSheet] failed to set readySources', e);
      }

      if (sourcesToBeExtracted.length > 0) {
        try {
          // Extract sources one by one and accumulate results, then set once.
          const allExtractedSources: (RawAudio | RawVideo)[] = [];
          for (const source of sourcesToBeExtracted) {
            try {
              console.log(
                '[ExtractorBottomSheet] extracting source:',
                (source as any).url,
              );
              const extractedSources = (await extractorViewModel.extract(
                source,
              )) as (RawAudio | RawVideo)[];
              console.log(
                '[ExtractorBottomSheet] extractedSources for',
                (source as any).url,
                extractedSources,
              );
              if (Array.isArray(extractedSources) && extractedSources.length) {
                allExtractedSources.push(...extractedSources);
              }
            } catch (error) {
              console.warn('Extraction error for source:', source, error);
              continue;
            }
          }

          // Update sources with all extracted results at once (preserve readySources)
          try {
            const merged = [...readySources, ...allExtractedSources];
            console.log(
              '[ExtractorBottomSheet] setting merged sources:',
              merged,
            );
            setSources(merged);
          } catch (e) {
            console.warn('Failed to set sources after extraction', e);
          }
        } catch (error) {
          console.warn('Extraction error:', error);
        }
      } else {
        try {
          console.log(
            '[ExtractorBottomSheet] no sourcesToBeExtracted, leaving readySources as-is',
          );
        } catch (e) { }
      }

      try {
        console.log(
          '[ExtractorBottomSheet] doExtraction finished — setting extracting false',
        );
      } catch (e) { }
      setExtracting(false);
    };

    if (!extracting && rawSources.length > 0) {
      doExtraction();
    }
    // Re-run extraction when rawSources changes or extracting state changes
  }, [rawSources, extracting]);

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
                  onPress: () => { },
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
                  onPress: () => { },
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

  return (
    <>
      <BottomSheet
        ref={bottomSheetRef}
        index={bottomSheetVisible ? 0 : -1}
        snapPoints={useMemo(() => ['50%'], [])}
        handleStyle={{ backgroundColor: theme.colors.surface }}
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
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>
              Extractor Debug
            </Text>
            <Text style={{ color: '#fff' }}>
              Request:{' '}
              {currentWebviewRequest ? currentWebviewRequest.id : 'none'}
            </Text>
            <Text style={{ color: '#fff' }} numberOfLines={2}>
              URL: {currentWebviewRequest ? currentWebviewRequest.url : '-'}
            </Text>
            <Text style={{ color: '#fff' }}>
              Last message:{' '}
              {lastWebviewMessage ? JSON.stringify(lastWebviewMessage) : 'none'}
            </Text>
          </View>

          {/* Conditionally render WebView only when a request is active */}
          {currentWebviewRequest ? (
            <View style={{ marginBottom: 12 }}>
              <Text style={{ marginBottom: 6 }} numberOfLines={1}>
                WebView: {currentWebviewRequest.url}
              </Text>
              <View
                renderToHardwareTextureAndroid
                needsOffscreenAlphaCompositing
                style={{ height: Dimensions.get('window').height, width: Dimensions.get('window').width, opacity: 0, position: 'absolute', zIndex: -9999 }}>
                <InterceptingWebView
                  style={{ flex: 1 }}
                  source={{ uri: currentWebviewRequest.url }}
                  echoAllRequestsFromJS={true}
                  aggressiveDomHooking={true}
                  onIntercept={(request: any) => {
                    try {
                      const url = String(request?.url || '').trim();
                      if (!url) return;
                      if (isAllowedMediaUrl(url)) {
                        const isSub = /\.(srt|vtt|ass|ssa|smi)(\?.*)?$/i.test(url.split('#')[0]);
                        if (isSub) {
                          matchedSubtitlesRef.current.add(url);
                        } else {
                          matchedVideosRef.current.add(url);
                        }
                        setLastWebviewMessage({
                          videos: Array.from(matchedVideosRef.current),
                          subtitles: Array.from(matchedSubtitlesRef.current),
                        });
                        if (currentWebviewRequest) {
                          receiveWebviewResponse(currentWebviewRequest.id, {
                            videos: Array.from(matchedVideosRef.current),
                            subtitles: Array.from(matchedSubtitlesRef.current),
                            __meta: { postedAt: Date.now(), waitMs: currentWebviewRequest.waitMs ?? 1500 },
                          });
                        }
                      }
                    } catch (e) { }
                  }}
                  nativeUrlRegex={nativeUrlRegex.source}
                  onNativeMatch={(e: any) => {
                    try {
                      const url = String(e?.request?.url || e?.url || '').trim();
                      if (!url) return;
                      if (isAllowedMediaUrl(url)) {
                        // Capture request headers if available
                        const hdrs = e.request?.headers;
                        if (hdrs && typeof hdrs === 'object') {
                          headersByUrlRef.current[url] = hdrs as Record<string, string>;
                        }
                        const isSub = /\.(srt|vtt|ass|ssa|smi)(\?.*)?$/i.test(url.split('#')[0]);
                        if (isSub) {
                          matchedSubtitlesRef.current.add(url);
                        } else {
                          matchedVideosRef.current.add(url);
                        }
                        setLastWebviewMessage({
                          videos: Array.from(matchedVideosRef.current),
                          subtitles: Array.from(matchedSubtitlesRef.current),
                        });
                        if (currentWebviewRequest) {
                          receiveWebviewResponse(currentWebviewRequest.id, {
                            videos: Array.from(matchedVideosRef.current),
                            subtitles: Array.from(matchedSubtitlesRef.current),
                            headersByUrl: headersByUrlRef.current,
                            __meta: { postedAt: Date.now(), waitMs: currentWebviewRequest.waitMs ?? 1500 },
                          });
                        }
                      }
                    } catch (e) { }
                  }}
                />
              </View>
            </View>
          ) : null}

          {sources.length < 1 ? (
            extracting ? (
              <ActivityIndicator size="large" />
            ) : (
              <Text style={{ textAlign: 'center' }}>No Sources Found</Text>
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
                      <Image source={{ uri: source.iconUrl }} {...props} />
                    ) : (
                      <LazyImage
                        placeholderSource="square"
                        style={{ borderRadius: 4 }}
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
                    (navigation as any).navigate('media', { media: mediaToView });
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
      {/* (Debug InterceptingWebView is rendered inside BottomSheetView above) */}
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
