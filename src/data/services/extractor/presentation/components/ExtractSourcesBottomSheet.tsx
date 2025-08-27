import {
  View,
  StyleSheet,
  Alert,
  Linking,
  Image,
  DeviceEventEmitter,
} from 'react-native';
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
import {bridge as createBridge} from '@webview-bridge/react-native';
import {WebViewMessageEvent} from 'react-native-webview';
import {FiltersEngine, Request as AdblockRequest} from '@ghostery/adblocker';
import {
  InterceptEvent,
  InterceptWebView,
} from '../../../../../core/shared/components/intercepting-webview';

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

            // If native interception is available, ignore JS bridge payloads.
            // This prevents the injected script from overriding native matches.
            try {
              if (
                interceptingAvailableRef &&
                interceptingAvailableRef.current
              ) {
                try {
                  console.log(
                    '[ExtractorBottomSheet][bridge] Ignoring JS bridge payload because native interception is active',
                    payload && payload.__meta
                      ? payload.__meta.stage
                      : undefined,
                  );
                } catch (e) {}
                return true;
              }
            } catch (e) {}

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

  // Create the WebView component. To guarantee onMessage compatibility,
  // prefer the local InterceptWebView when present, otherwise fall back
  // to react-native-webview (no 3rd-party package required).
  const WebViewComponent = React.useMemo(() => {
    try {
      // Prefer the in-repo InterceptWebView so we get adblock + native interception.
      // Use a relative require so bundlers that don't include the file won't fail at module-eval time.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const local = require('../../../../../core/shared/components/intercepting-webview');
      const localCandidate =
        local && (local.InterceptWebView || local.default || local);
      if (localCandidate) {
        return localCandidate;
      }
    } catch (e) {
      // not available — continue to fallback
    }
    try {
      return (require('react-native-webview') as any).WebView;
    } catch (e) {
      console.warn(
        '[ExtractorBottomSheet] failed to load a WebView implementation',
        e,
      );
      return (require('react-native-webview') as any).WebView;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // State that tracks whether the native intercept implementation has reported readiness.
  // Detect whether an intercepting WebView implementation is available.
  // Prefer the local in-repo InterceptWebView only (no 3rd-party require).
  // Use the module's exported `nativeInterceptAvailable` flag so we only treat
  // the implementation as "intercepting" when the native Android component is present.
  const interceptingAvailableRef = React.useRef<boolean>(false);
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const local = require('../../../../../core/shared/components/intercepting-webview');
    const localCandidate =
      local && (local.InterceptWebView || local.default || local);
    const nativeAvailable = !!(
      local && local.nativeInterceptAvailable === true
    );
    interceptingAvailableRef.current = !!localCandidate && nativeAvailable;
    try {
      console.log(
        '[ExtractorBottomSheet] interceptingAvailable (native):',
        interceptingAvailableRef.current,
        'module.nativeInterceptAvailable:',
        nativeAvailable,
      );
    } catch (e) {}
  } catch (e) {
    interceptingAvailableRef.current = false;
  }

  // When using a native intercepting WebView, prefer nativeUrlRegex + onNativeMatch.
  // Build a regex that matches likely video/subtitle asset URLs (ext + query/hash).
  const nativeUrlRegex = new RegExp(
    '\\.(m3u8|mp4|mkv|webm|flv|mov|avi|wmv|m4p|m4b|m4v|srt|vtt|ass|ssa|smi)(\\?.*)?$',
    'i',
  );

  // webviewExtraProps will be spread into the WebView. It includes nativeUrlRegex/onNativeMatch
  // and DOM-hooking / echo flags when an intercepting implementation is available.
  // Helper: strict extension/substring-based media URL filter used for native matches and JS results.
  const isAllowedMediaUrl = (rawUrl?: string) => {
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

  const webviewExtraProps: any = {};
  if (interceptingAvailableRef.current) {
    // Ensure the native view receives the nativeUrlRegex prop as early as possible
    // (before we navigate). This increases the chance the native interceptor sees
    // the first resource requests. Use the request-specific regex when provided.
    const currentReq = currentWebviewRequest as any;
    const requestRegex =
      currentReq && currentReq.nativeUrlRegex
        ? currentReq.nativeUrlRegex
        : nativeUrlRegex && nativeUrlRegex.source
        ? nativeUrlRegex.source
        : String(nativeUrlRegex);
    webviewExtraProps.nativeUrlRegex = requestRegex;
    // Keep aggressive DOM hooking available for native implementations.
    webviewExtraProps.aggressiveDomHooking = true;
    // Until native explicitly signals readiness, allow JS-discovered requests to be echoed
    // so the fallback path can still function. Once nativeInterceptReady becomes true,
    // we will stop echoing JS results (handled in message processing).
    webviewExtraProps.echoAllRequestsFromJS = !nativeInterceptReady;
    webviewExtraProps.onMessage = (e: any) => {
      console.log('[ExtractorBottomSheet] ===== onMessage', e.nativeEvent.data);
    };
    webviewExtraProps.onNativeMatch = (matchInfo: any) => {
      try {
        // matchInfo shape can vary across implementations; try common fields.
        const candidateRaw =
          (matchInfo &&
            (matchInfo.url || (matchInfo.request && matchInfo.request.url))) ||
          (matchInfo && matchInfo.match && matchInfo.match[0]) ||
          (matchInfo && matchInfo.matchedUrl) ||
          null;
        if (!candidateRaw) return;
        const candidate = String(candidateRaw).trim();

        // Reject obvious player/container page URLs (common false-positives) early.
        // Examples: newplayer.php, any .php page, '/player' paths, '/watch' endpoints, etc.
        try {
          if (/(?:\.php\b|\/player\b|newplayer|\/watch\b)/i.test(candidate)) {
            try {
              console.log(
                '[ExtractorBottomSheet] onNativeMatch ignored player/container URL (false-positive):',
                candidate,
              );
            } catch (e) {}
            return;
          }
        } catch (e) {}

        // Strictly allow only well-known media/subtitle extensions before forwarding
        if (!isAllowedMediaUrl(candidate)) {
          try {
            console.log(
              '[ExtractorBottomSheet] onNativeMatch ignored non-media url:',
              candidate,
            );
          } catch (e) {}
          return;
        }

        const p = String(candidate).split('?')[0].split('#')[0];
        const ext = p.split('.').pop() || '';
        const isSubtitle = /^(srt|vtt|ass|ssa|smi)$/i.test(ext);
        const isVideo =
          /^(m3u8|mp4|mkv|webm|flv|mov|avi|wmv|m4p|m4b|m4v)$/i.test(ext) ||
          String(candidate).toLowerCase().includes('.m3u8');

        // Update debug UI
        try {
          setLastWebviewMessage({
            videos: isVideo ? [candidate] : [],
            subtitles: isSubtitle ? [candidate] : [],
          });
        } catch (e) {}

        // Forward to extractor store under current request id so waiting callers resolve.
        try {
          const state = useExtractorServiceStore.getState();
          const current = state.currentWebviewRequest;
          if (current && current.id) {
            state.receiveWebviewResponse(current.id, {
              videos: isVideo ? [candidate] : [],
              subtitles: isSubtitle ? [candidate] : [],
              __meta: {
                postedAt: Date.now(),
                waitMs: (current && current.waitMs) || 10000,
                stage: 'native-match',
              },
            } as any);
          }
        } catch (e) {}
      } catch (e) {}
    };

    // Log and surface raw native intercept events for diagnostics only.
    webviewExtraProps.onIntercept = (evt: InterceptEvent | any) => {
      try {
        const u = (evt && (evt.url || evt.nativeEvent?.url)) || null;
        console.log(
          '[ExtractorBottomSheet] onIntercept event (native):',
          u,
          'kind:',
          evt?.kind || 'native',
        );
        try {
          setLastWebviewMessage({
            videos: u ? [u] : [],
            subtitles: [],
          });
        } catch (e) {}
        // IMPORTANT: Do NOT forward raw onIntercept events to the store here.
        // Native intercepts are handled via onNativeMatch (which applies strict filtering).
        // Keeping onIntercept diagnostic-only prevents noisy non-media URLs from polluting the store.
      } catch (e) {}
    };
  }

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
          } catch (e) {}
        }
      } catch (e) {
        try {
          console.warn(
            '[ExtractorBottomSheet] Failed to initialize adblock engine',
            e,
          );
        } catch (e2) {}
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const extractorViewModel = useRef(new ExtractorViewModel()).current;

  // WebView local state to force reload when request changes
  const [webviewKey, setWebviewKey] = useState(0);
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

  // Hold whether the (native) WebView is mounted and ready to intercept requests.
  // We mount the native view immediately when the bottom sheet opens but delay
  // navigating to the requested URL until the native view has laid out so the
  // native interceptors receive the nativeUrlRegex before network activity starts.
  const [webviewReady, setWebviewReady] = useState<boolean>(false);
  const [pendingSourceUrl, setPendingSourceUrl] = useState<string | null>(null);
  // When a native intercept implementation is present, wait briefly after the native
  // view has laid out to allow the native side to receive nativeUrlRegex before
  // we navigate. readyToNavigate gates when the WebView will be sent the target URL.
  const [readyToNavigate, setReadyToNavigate] = useState<boolean>(false);

  // Track which probe URLs we've already followed per original request
  // to avoid re-following the same iframe/page multiple times.
  const followedProbesRef = useRef<
    Record<string, {set: Set<string>; count: number}>
  >({});

  useEffect(() => {
    try {
      const url = currentWebviewRequest ? currentWebviewRequest.url : null;
      setPendingSourceUrl(url);
      // Reset readiness flags so each new request waits for a fresh ready signal.
      setWebviewReady(false);
      setNativeInterceptReady(false);
      // reset navigation gate until native view is ready to receive props
      setReadyToNavigate(false);
      // bump key so native view remounts with latest nativeUrlRegex when a new request arrives
      setWebviewKey(k => k + 1);
      try {
        console.log('[ExtractorBottomSheet] pendingSourceUrl set:', url);
      } catch (e) {}
    } catch (e) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWebviewRequest]);

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

  // Ensure the hidden WebView is mounted as soon as the bottom sheet opens so native interception
  // can begin capturing requests immediately. Force a remount to apply the latest nativeUrlRegex.
  useEffect(() => {
    if (bottomSheetVisible) {
      try {
        console.log(
          '[ExtractorBottomSheet] Bottom sheet opened — forcing WebView remount for interception',
        );
      } catch (e) {}
      try {
        setWebviewKey(k => k + 1);
      } catch (e) {}
    }
  }, [bottomSheetVisible]);

  // Listen for a readiness event emitted by the native InterceptWebView implementation
  // so we can log and optionally kick the page into a state where requests will be intercepted.
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      'RNInterceptNativeReady',
      (data: any) => {
        try {
          console.log('[ExtractorBottomSheet] RNInterceptNativeReady:', data);
        } catch (e) {}
        try {
          // Mark native intercept as ready so we can navigate safely when using native interception.
          setNativeInterceptReady(true);
        } catch (e) {}
        try {
          // Clear any pending navigation timeout since native is ready.
          try {
            if (nativeReadyTimeoutRef.current) {
              clearTimeout(nativeReadyTimeoutRef.current);
              nativeReadyTimeoutRef.current = null;
            }
          } catch (e) {}
        } catch (e) {}
        try {
          // Ping the webview so its bridge is active and we can confirm interception readiness.
          if (webviewRef.current && webviewRef.current.injectJavaScript) {
            webviewRef.current.injectJavaScript(
              "(function(){ try{ window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({__ping:true,stage:'native-ready',ts:Date.now()})); }catch(e){} })(); true;",
            );
          }
        } catch (e) {}
        try {
          // If the webview has already mounted and we have a pending URL, reload so the
          // native component picks up the latest nativeUrlRegex before the target page loads.
          const shouldReload =
            webviewReady &&
            pendingSourceUrl &&
            interceptingAvailableRef &&
            interceptingAvailableRef.current;
          if (shouldReload && webviewRef.current && webviewRef.current.reload) {
            try {
              console.log(
                '[ExtractorBottomSheet] Native intercept ready — reloading WebView to apply nativeUrlRegex before navigating',
              );
            } catch (e) {}
            try {
              webviewRef.current.reload();
            } catch (e) {}
          }
        } catch (e) {}
      },
    );
    return () => {
      try {
        sub.remove();
      } catch (e) {}
    };
  }, [webviewReady, pendingSourceUrl]);

  // When readyToNavigate flips true, trigger a reload so the WebView navigates
  // after the native component has had a chance to receive nativeUrlRegex.
  useEffect(() => {
    try {
      if (readyToNavigate && pendingSourceUrl) {
        try {
          console.log(
            '[ExtractorBottomSheet] readyToNavigate true — reloading/navigating WebView',
            pendingSourceUrl,
          );
        } catch (e) {}
        try {
          if (webviewRef.current && webviewRef.current.reload) {
            webviewRef.current.reload();
          }
        } catch (e) {}
      }
    } catch (e) {}
  }, [readyToNavigate, pendingSourceUrl]);

  // Handler for messages coming from the injected JS inside the WebView.
  // Enforces the configured waitMs by deferring processing of early messages.
  const handleWebviewMessage = (event: WebViewMessageEvent) => {
    // Helper to actually process and forward the payload to the store
    const processPayload = (payload: any) => {
      try {
        // Handle pings for diagnostics
        if (payload && payload.__ping) {
          try {
            console.log('[ExtractorBottomSheet] __ping from WebView:', payload);
          } catch (e) {}
          return;
        }
        // Handle batch of candidate URLs (e.g., iframe/player pages) to follow in hidden WebView
        if (payload && Array.isArray(payload.probeBatch)) {
          try {
            const state = useExtractorServiceStore.getState();
            const current = state.currentWebviewRequest;
            const currentId = current ? current.id : null;
            const baseUrl = current?.url;
            const unique: string[] = [];
            (payload.probeBatch as string[]).forEach(raw => {
              try {
                if (!raw || typeof raw !== 'string') return;
                let abs = raw;
                try {
                  abs = new URL(raw, baseUrl).toString();
                } catch (e) {}
                if (!/^https?:/i.test(abs)) return;
                if (unique.indexOf(abs) === -1) unique.push(abs);
              } catch (e) {}
            });
            const currentOrigin = (() => {
              try {
                return new URL(baseUrl || '').origin;
              } catch (e) {
                return null;
              }
            })();
            const blockedHosts = [
              'google.com',
              'gstatic.com',
              'google-analytics.com',
              'googlesyndication.com',
              'doubleclick.net',
              'statically.io',
              'histats.com',
              'wordpress.com',
              'wp.com',
              'cloudflare.com',
              'cloudflareinsights.com',
              'facebook.com',
              'twitter.com',
              'bing.com',
              'yahoo.com',
            ];
            const allowKeyword =
              /embed|player|play|watch|stream|video|hls|m3u8|vid|file|cloud|rapid|tape|dood|moon|viz|mcloud|rabbit|rc|playback/i;
            const toFollow: string[] = [];
            for (const u of unique) {
              try {
                const urlObj = new URL(u);
                const host = urlObj.hostname || '';
                if (currentOrigin && urlObj.origin === currentOrigin) continue;
                if (blockedHosts.some(b => host.endsWith(b))) continue;
                if (!allowKeyword.test(u)) continue;
                toFollow.push(u);
                if (toFollow.length >= 4) break;
              } catch (e) {}
            }
            toFollow.forEach(async u => {
              try {
                const iframeResult = await state.sendWebviewRequest(
                  u,
                  25000,
                  2000,
                );
                try {
                  const iframeVideos = Array.isArray(iframeResult?.videos)
                    ? (iframeResult.videos as string[]).filter(v =>
                        isAllowedMediaUrl(String(v)),
                      )
                    : [];
                  const iframeSubs = Array.isArray(iframeResult?.subtitles)
                    ? (iframeResult.subtitles as string[]).filter(s =>
                        isAllowedMediaUrl(String(s)),
                      )
                    : [];
                  // Only forward if we discovered media/subtitles
                  if (iframeVideos.length > 0 || iframeSubs.length > 0) {
                    receiveWebviewResponse(currentId!, {
                      videos: iframeVideos,
                      subtitles: iframeSubs,
                      __meta: {
                        postedAt: Date.now(),
                        waitMs: 1500,
                        stage: 'batch-follow',
                      },
                    } as any);
                  } else {
                    try {
                      console.log(
                        '[ExtractorBottomSheet] batch-follow returned no media (filtered out non-media):',
                        u,
                      );
                    } catch (e) {}
                  }
                } catch (e) {}
              } catch (e) {
                try {
                  console.warn(
                    '[ExtractorBottomSheet] Batch-follow failed for',
                    u,
                    e,
                  );
                } catch (e2) {}
              }
            });
          } catch (e) {}
          return;
        }
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

          // If adblock engine is ready, check the probed URL and drop it early if it matches filters.
          try {
            const probeRaw = payload.probeUrl;
            if (
              probeRaw &&
              typeof probeRaw === 'string' &&
              adblockEngineRef.current
            ) {
              try {
                // Resolve probe against currentWebviewRequest.url when possible
                const base =
                  (currentWebviewRequest && currentWebviewRequest.url) ||
                  undefined;
                let probeAbs = probeRaw;
                try {
                  if (base) {
                    probeAbs = new URL(probeRaw, base).toString();
                  } else {
                    try {
                      probeAbs = new URL(probeRaw).toString();
                    } catch (e) {
                      // leave probeAbs as-is if it can't be resolved
                    }
                  }
                } catch (e) {}

                const req = AdblockRequest.fromRawDetails({
                  url: probeAbs,
                  type: 'other',
                  sourceUrl: base,
                });
                const matchResult = adblockEngineRef.current.match(req);
                if (matchResult && matchResult.match) {
                  try {
                    console.log(
                      '[ExtractorBottomSheet] Adblock matched probe — dropping:',
                      probeAbs,
                      matchResult.filter
                        ? matchResult.filter.getFilter()
                        : null,
                    );
                  } catch (e) {}
                  // Don't follow or report ad/tracker probes further.
                  return;
                }
              } catch (e) {}
            }
          } catch (e) {}

          // Try to follow iframe/page probes when they appear to be different-origin
          // HTML pages (likely player iframes). This will load the probed URL in the
          // hidden WebView (via sendWebviewRequest) and merge discovered videos back
          // into the original request so m3u8s loaded inside cross-origin iframes
          // can be discovered.
          try {
            const probeUrlRaw = payload.probeUrl;
            const state = useExtractorServiceStore.getState();
            const current = state.currentWebviewRequest;
            const currentId = current ? current.id : null;
            if (probeUrlRaw && typeof probeUrlRaw === 'string' && currentId) {
              // Resolve relative URLs against the current request URL when possible
              let probeAbs = probeUrlRaw;
              try {
                probeAbs = new URL(probeUrlRaw, current!.url).toString();
              } catch (e) {}

              // Only follow http(s) URLs
              try {
                const u = new URL(probeAbs);
                if (u.protocol === 'http:' || u.protocol === 'https:') {
                  // Avoid following URLs on the same origin as the current page:
                  // same-origin fetches should already be visible via propagated interceptors.
                  const currentOrigin = (() => {
                    try {
                      return new URL(current!.url).origin;
                    } catch (e) {
                      return null;
                    }
                  })();
                  const probeOrigin = u.origin;

                  const followedEntry =
                    followedProbesRef.current[currentId] ||
                    (followedProbesRef.current[currentId] = {
                      set: new Set<string>(),
                      count: 0,
                    });

                  // Limit number of followed probes per original request to prevent thundering
                  const MAX_FOLLOW = 4;

                  if (
                    probeOrigin !== currentOrigin &&
                    !followedEntry.set.has(probeAbs) &&
                    followedEntry.count < MAX_FOLLOW
                  ) {
                    followedEntry.set.add(probeAbs);
                    followedEntry.count++;
                    // Perform the follow in background (do not block message processing).
                    (async () => {
                      try {
                        console.log(
                          '[ExtractorBottomSheet] Following probed iframe/page URL in hidden WebView:',
                          probeAbs,
                          'for originalRequestId:',
                          currentId,
                        );
                        // Use a slightly longer timeout for iframe pages which may load additional resources.
                        const iframeResult = await state.sendWebviewRequest(
                          probeAbs,
                          25000,
                          2000,
                        );
                        try {
                          console.log(
                            '[ExtractorBottomSheet] Follow result for',
                            probeAbs,
                            iframeResult,
                          );
                        } catch (e) {}
                        // Merge iframeResult into the latest payload returned to the original request.
                        try {
                          // Forward merged payload to the original request id so the original
                          // waiting caller receives iframe-discovered sources as well.
                          const mergedVideos = Array.isArray(
                            iframeResult.videos,
                          )
                            ? iframeResult.videos
                            : [];
                          const mergedSubs = Array.isArray(
                            iframeResult.subtitles,
                          )
                            ? iframeResult.subtitles
                            : [];
                          // Filter merged results to media-only before forwarding
                          const filteredMergedVideos = (
                            mergedVideos as string[]
                          ).filter(v => isAllowedMediaUrl(String(v)));
                          const filteredMergedSubs = (
                            mergedSubs as string[]
                          ).filter(s => isAllowedMediaUrl(String(s)));
                          if (
                            filteredMergedVideos.length > 0 ||
                            filteredMergedSubs.length > 0
                          ) {
                            receiveWebviewResponse(currentId, {
                              videos: filteredMergedVideos,
                              subtitles: filteredMergedSubs,
                              __meta: {
                                postedAt: Date.now(),
                                waitMs: 1500,
                                stage: 'iframe-follow',
                              },
                            } as any);
                          } else {
                            try {
                              console.log(
                                '[ExtractorBottomSheet] iframe-follow produced no media after filtering:',
                                probeAbs,
                              );
                            } catch (e) {}
                          }
                        } catch (e) {
                          try {
                            console.warn(
                              '[ExtractorBottomSheet] Failed to forward iframe follow results to store',
                              e,
                            );
                          } catch (e2) {}
                        }
                      } catch (e) {
                        try {
                          console.warn(
                            '[ExtractorBottomSheet] Following probe URL failed:',
                            probeAbs,
                            e,
                          );
                        } catch (e2) {}
                      }
                    })();
                  }
                }
              } catch (e) {}
            }
          } catch (e) {}

          // Do not resolve the store promise for probe-only messages.
          return;
        }

        // Normalize and strictly filter discovered URLs so we only forward well-known media/subtitle assets.
        const rawVideos = Array.isArray(payload.videos) ? payload.videos : [];
        const rawSubs = Array.isArray(payload.subtitles)
          ? payload.subtitles
          : [];
        const videos = rawVideos.filter((u: any) => {
          try {
            return isAllowedMediaUrl(String(u));
          } catch (e) {
            return false;
          }
        });
        const subtitles = rawSubs.filter((u: any) => {
          try {
            return isAllowedMediaUrl(String(u));
          } catch (e) {
            return false;
          }
        });
        try {
          console.log(
            '[ExtractorBottomSheet] WebView posted message (filtered):',
            {
              rawVideos,
              rawSubs,
              videos,
              subtitles,
              meta: payload.__meta,
            },
          );
        } catch (e) {}
        // store last message for visible debug panel (show filtered results)
        setLastWebviewMessage({videos, subtitles});

        // IMPORTANT: If native interception is available, do NOT accept JS-discovered
        // video/subtitle payloads. Rely exclusively on nativeUrlRegex + onNativeMatch
        // to report media URLs. This prevents the injected JS from preempting or
        // duplicating native-matched results.
        if (interceptingAvailableRef.current && nativeInterceptReady) {
          try {
            console.log(
              '[ExtractorBottomSheet] Native interception available — ignoring JS-discovered videos/subtitles. Waiting for native matches.',
            );
          } catch (e) {}
          return;
        }

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
                      10000,
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
        (currentWebviewRequest && currentWebviewRequest.waitMs) || 10000;
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
              (currentWebviewRequest && currentWebviewRequest.waitMs) || 10000,
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
      try {
        console.log(
          '[ExtractorBottomSheet] doExtraction start — rawSources length:',
          rawSources.length,
        );
      } catch (e) {}

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
      } catch (e) {}

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
        } catch (e) {}
      }

      try {
        console.log(
          '[ExtractorBottomSheet] doExtraction finished — setting extracting false',
        );
      } catch (e) {}
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
  const buildInjectedJS = (
    waitMs: number = 1500,
    suppressProbes: boolean = false,
  ) => {
    const ms = Number(waitMs) || 10000;
    return `
    (function() {
      try {
        const found = { videos: [], subtitles: [] };
        var __firstVideoPosted = false;
        function __postSingleVideo(u, stage){
          try{
            if(!u) return;
            const payload = JSON.stringify({
              videos: [String(u)],
              subtitles: [],
              __meta: { postedAt: Date.now(), waitMs: 0, stage: String(stage||'immediate') }
            });
            if (false && false && window.bridge && typeof window.bridge.postWebviewPayload === 'function') {
              try { window.bridge.postWebviewPayload(payload); } catch(e){}
            } else if (false && window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
              try { window.ReactNativeWebView.postMessage(payload); } catch(e){}
            } else if (false && window.webkit && window.webkit.messageHandlers && typeof window.webkit.messageHandlers.reactNativeWebView === 'object' && typeof window.webkit.messageHandlers.reactNativeWebView.postMessage === 'function') {
              try { window.webkit.messageHandlers.reactNativeWebView.postMessage(payload); } catch(e){}
            } else if (false && typeof window.postMessage === 'function') {
              try { window.postMessage(payload); } catch(e){}
            }
          } catch(e){}
        }
        // Post an immediate init probe so native logs show the injected script executed.
        try {
          const _init = JSON.stringify({
            injected: true,
            __meta: { postedAt: Date.now(), stage: 'init' }
          });
          if (false && false && window.bridge && typeof window.bridge.postWebviewPayload === 'function') {
            try { window.bridge.postWebviewPayload(_init); } catch(e){}
          } else if (false && window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
            try { window.ReactNativeWebView.postMessage(_init); } catch(e){}
          } else if (false && window.webkit && window.webkit.messageHandlers && typeof window.webkit.messageHandlers.reactNativeWebView === 'object' && typeof window.webkit.messageHandlers.reactNativeWebView.postMessage === 'function') {
            try { window.webkit.messageHandlers.reactNativeWebView.postMessage(_init); } catch(e){}
          } else if (false && typeof window.postMessage === 'function') {
            try { window.postMessage(_init); } catch(e){}
          }
        } catch(e){}
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
              if (false && false && window.bridge && typeof window.bridge.postWebviewPayload === 'function') {
                try { window.bridge.postWebviewPayload(_msg); } catch(e){}
              } else if (false && window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
                try { window.ReactNativeWebView.postMessage(_msg); } catch(e){}
              } else if (false && window.webkit && window.webkit.messageHandlers && typeof window.webkit.messageHandlers.reactNativeWebView === 'object' && typeof window.webkit.messageHandlers.reactNativeWebView.postMessage === 'function') {
                try { window.webkit.messageHandlers.reactNativeWebView.postMessage(_msg); } catch(e){}
              } else if (false && typeof window.postMessage === 'function') {
                try { window.postMessage(_msg); } catch(e){}
              }
            } catch (e) {}
            // Only collect when it clearly looks like a video or subtitle
            if (isVideo) {
              const beforeLen = found.videos.length;
              pushIfUnique(found.videos, s);
              if (!__firstVideoPosted && found.videos.length > beforeLen) {
                __firstVideoPosted = true;
                __postSingleVideo(s, 'inspect');
              }
            }
            if (isSubtitle) {
              pushIfUnique(found.subtitles, s);
            }
          } catch (e) {}
        }

        // Override fetch with ad-blocking check
        const origFetch = window.fetch;
        window.fetch = function() {
          try {
            const url = arguments[0] && (typeof arguments[0] === 'string' ? arguments[0] : (arguments[0] && arguments[0].url));
            inspectUrl(url);
            // If URL matches ad patterns, short-circuit with an empty response
            try {
              const sUrl = String(url || '');
              if (sUrl && /(^|\\.|\\/)(doubleclick|googlesyndication|google-analytics|adservice|adserver|adsystem|adroll|adsrvr|adsafeprotected|adfox|adzerk|adnxs|adcdn|adsby|ads-|advert|advertising|taboola|outbrain|adcolony|spotx|rubiconproject|pubmatic)\\b/i.test(sUrl)) {
                try {
                  // Return a minimal empty Response so site code receives something harmless.
                  return Promise.resolve(new Response('', {status: 204, statusText: 'No Content'}));
                } catch (e) {
                  // If Response constructor isn't available, fall back to resolving an empty object.
                  return Promise.resolve({});
                }
              }
            } catch (e) {}
          } catch(e){}
          // Additional network-ish APIs
          try {
            const origBeacon = navigator.sendBeacon;
            navigator.sendBeacon = function(url, data){ try { inspectUrl(url);}catch(e){} try{ return origBeacon.apply(this, arguments);}catch(e){ return false; } };
          } catch(e){}
          try {
            const origCreateElement = document.createElement;
            document.createElement = function(tag){ const el = origCreateElement.call(document, tag); try { if (tag && typeof tag === 'string') { const t = tag.toLowerCase(); if (t==='video' || t==='source' || t==='track' || t==='iframe') { try { const desc = Object.getOwnPropertyDescriptor(el.__proto__, 'src'); if (desc && desc.set) { const s = desc.set, g = desc.get; Object.defineProperty(el.__proto__, 'src', { set: function(v){ try{ inspectUrl(v);}catch(e){} return s.call(this, v); }, get: g, configurable: true, enumerable: true }); } } catch(e){} } } } catch(e){} return el; };
          } catch(e){}
          return origFetch.apply(this, arguments);
        };

        // Override XHR at prototype level for broader compatibility
        try {
          const origOpen = XMLHttpRequest.prototype.open;
          const origSend = XMLHttpRequest.prototype.send;
          XMLHttpRequest.prototype.open = function(method, url) {
            try {
              if (url && !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) {
                try { url = new URL(url, document.location.href).toString(); } catch(e){}
              }
              this.__trackedUrl = url;
              inspectUrl(url);
              try {
                const probePayload = JSON.stringify({
                  probeUrl: url,
                  source: 'xhr-open',
                  method: method,
                  __meta: { postedAt: Date.now(), waitMs: ${ms}, stage: 'probe' }
                });
                if (false && false && window.bridge && typeof window.bridge.postWebviewPayload === 'function') {
                  try { window.bridge.postWebviewPayload(probePayload); } catch(e){}
                } else if (false && window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
                  try { window.ReactNativeWebView.postMessage(probePayload); } catch(e){}
                } else if (false && window.webkit && window.webkit.messageHandlers && typeof window.webkit.messageHandlers.reactNativeWebView === 'object' && typeof window.webkit.messageHandlers.reactNativeWebView.postMessage === 'function') {
                  try { window.webkit.messageHandlers.reactNativeWebView.postMessage(probePayload); } catch(e){}
                } else if (false && typeof window.postMessage === 'function') {
                  try { window.postMessage(probePayload); } catch(e){}
                }
              } catch(e){}
              try {
                const s = String(url || '').toLowerCase();
                this.__ad_blocked = /(^|\\.|\\/)(doubleclick|googlesyndication|google-analytics|adservice|adserver|adsystem|adroll|adsrvr|adsafeprotected|adfox|adzerk|adnxs|adcdn|adsby|ads-|advert|advertising|taboola|outbrain|adcolony|spotx|rubiconproject|pubmatic)\\b/i.test(s);
              } catch(e){}
            } catch(e){}
            return origOpen.apply(this, arguments);
          };
          XMLHttpRequest.prototype.send = function(body) {
            try {
              if (this.__ad_blocked) {
                try { this.abort && this.abort(); } catch(e){}
                try { this.onreadystatechange && this.onreadystatechange(); } catch(e){}
                return;
              }
              const probePayload = JSON.stringify({
                probeUrl: this.__trackedUrl || null,
                source: 'xhr-send',
                bodyPreview: (body && body.length) ? String(body).slice(0,128) : null,
                __meta: { postedAt: Date.now(), waitMs: ${ms}, stage: 'probe' }
              });
              if (false && false && window.bridge && typeof window.bridge.postWebviewPayload === 'function') {
                try { window.bridge.postWebviewPayload(probePayload); } catch(e){}
              } else if (false && window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
                try { window.ReactNativeWebView.postMessage(probePayload); } catch(e){}
              } else if (false && window.webkit && window.webkit.messageHandlers && typeof window.webkit.messageHandlers.reactNativeWebView === 'object' && typeof window.webkit.messageHandlers.reactNativeWebView.postMessage === 'function') {
                try { window.webkit.messageHandlers.reactNativeWebView.postMessage(probePayload); } catch(e){}
              } else if (false && typeof window.postMessage === 'function') {
                try { window.postMessage(probePayload); } catch(e){}
              }
            } catch(e){}
            return origSend.apply(this, arguments);
          };
        } catch(e){}
  
        // Also hook into iframe/src assignment and DOM mutations so we detect
        // URLs that are injected later (e.g., iframes created dynamically).
        try {
          // Intercept setAttribute to catch src changes (iframe, video, source, track)
          try {
            const origSetAttribute = Element.prototype.setAttribute;
            Element.prototype.setAttribute = function(name, value) {
              try {
                const tag = this && this.tagName && this.tagName.toLowerCase();
                const isSrcAttr = (name === 'src' || name === 'data-src' || name === 'href');
                if (tag && isSrcAttr) {
                  if (tag === 'iframe' || tag === 'video' || tag === 'source' || tag === 'track') {
                    inspectUrl(value, true);
                  }
                }
              } catch (e) {}
              return origSetAttribute.apply(this, arguments);
            };
          } catch (e) {}
  
          // Intercept direct src property changes on iframe elements
          try {
            const iframeDesc = Object.getOwnPropertyDescriptor(
              HTMLIFrameElement.prototype,
              'src',
            );
            if (iframeDesc && iframeDesc.set) {
              Object.defineProperty(HTMLIFrameElement.prototype, 'src', {
                set: function(v) {
                  try {
                    inspectUrl(v, true);
                  } catch (e) {}
                  return iframeDesc.set.call(this, v);
                },
                get: iframeDesc.get,
                configurable: true,
                enumerable: true,
              });
            }
          } catch (e) {}
  
          // MutationObserver to watch for added nodes and attribute changes
          try {
            const mo = new MutationObserver(mutations => {
              try {
                mutations.forEach(m => {
                  if (m.type === 'childList' && m.addedNodes) {
                    m.addedNodes.forEach(n => {
                      try {
                        if (n && n.nodeType === 1) {
                          const el = n;
                          if (el.tagName) {
                            const tag = el.tagName.toLowerCase();
                            if (tag === 'iframe') {
                              const fsrc =
                                el.src ||
                                (el.getAttribute && el.getAttribute('src'));
                              inspectUrl(fsrc, true);
                            } else if (
                              tag === 'video' ||
                              tag === 'source' ||
                              tag === 'track' ||
                              tag === 'a' ||
                              tag === 'link'
                            ) {
                              const src =
                                el.src ||
                                el.href ||
                                (el.getAttribute &&
                                  (el.getAttribute('src') ||
                                    el.getAttribute('href')));
                              inspectUrl(src);
                            }
                            // scan subtree for any iframes inside the added node
                            try {
                              const innerIframes =
                                el.querySelectorAll && el.querySelectorAll('iframe');
                              if (innerIframes && innerIframes.length) {
                                Array.from(innerIframes).forEach(f => {
                                  try {
                                    const fsrc =
                                      f.src ||
                                      (f.getAttribute && f.getAttribute('src'));
                                    inspectUrl(fsrc, true);
                                  } catch (e) {}
                                });
                              }
                            } catch (e) {}
                          }
                        }
                      } catch (e) {}
                    });
                  } else if (m.type === 'attributes') {
                    try {
                      const tgt = m.target;
                      if (
                        tgt &&
                        tgt.tagName &&
                        tgt.tagName.toLowerCase() === 'iframe' &&
                        (m.attributeName === 'src' ||
                          m.attributeName === 'data-src')
                      ) {
                        const fsrc =
                          tgt.src ||
                          (tgt.getAttribute && tgt.getAttribute('src'));
                        inspectUrl(fsrc, true);
                      }
                    } catch (e) {}
                  }
                });
              } catch (e) {}
            });
            try {
              mo.observe(document, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['src', 'data-src', 'href'],
              });
            } catch (e) {}
          } catch (e) {}
  
          // Also override window.open to inspect navigations opened in new windows/tabs
          try {
            const origWindowOpen = window.open;
            window.open = function() {
              try {
                const url = arguments[0];
                inspectUrl(url);
              } catch (e) {}
              return origWindowOpen.apply(this, arguments);
            };
          } catch (e) {}
        } catch (e) {}

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
  
                    try {
                      // Propagate our fetch/XHR overrides into same-origin iframes so
                      // network requests initiated inside those frames are also inspected.
                      // Assigning the overridden functions from the parent window to the
                      // iframe's contentWindow ensures subsequent fetch/XHR calls inside the
                      // iframe will route through our interceptors.
                      try {
                        if (window.fetch && cw.fetch !== window.fetch) {
                          try { cw.fetch = window.fetch; } catch(e) {}
                        }
                      } catch(e) {}
                      try {
                        if (window.XMLHttpRequest && cw.XMLHttpRequest !== window.XMLHttpRequest) {
                          try { cw.XMLHttpRequest = window.XMLHttpRequest; } catch(e) {}
                        }
                      } catch(e) {}
                    } catch(e){}
                  }
                } catch(e){}
              });
            } catch(e){}
          } catch(e){}
        }

        // Hook HTMLMediaElement src setter and play() to capture currentSrc
        try {
          const mediaSrcDesc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
          if (mediaSrcDesc && mediaSrcDesc.set) {
            Object.defineProperty(HTMLMediaElement.prototype, 'src', {
              set: function(v) { try { inspectUrl(v); } catch(e){} return mediaSrcDesc.set.call(this, v); },
              get: mediaSrcDesc.get,
              configurable: true,
              enumerable: true,
            });
          }
        } catch(e){}
        try {
          const origPlay = HTMLMediaElement.prototype.play;
          if (typeof origPlay === 'function') {
            HTMLMediaElement.prototype.play = function() {
              try { inspectUrl(this && (this.currentSrc || this.src)); } catch(e){}
              try {
                var u = (this && (this.currentSrc || this.src));
                if (u && !__firstVideoPosted) { __firstVideoPosted=true; __postSingleVideo(u, 'media-play'); }
              } catch(e){}
              try { this && this.addEventListener && this.addEventListener('playing', function(){ try { inspectUrl(this && (this.currentSrc || this.src)); } catch(e){} }, {once:true}); } catch(e){}
              return origPlay.apply(this, arguments);
            };
          }
        } catch(e){}
        try {
          document.addEventListener('loadedmetadata', function(ev){ try { const t=ev && ev.target; if (t && (t.currentSrc || t.src)) { inspectUrl(t.currentSrc || t.src); if(!__firstVideoPosted){ __firstVideoPosted=true; __postSingleVideo(t.currentSrc||t.src,'loadedmetadata'); } } } catch(e){} }, true);
          document.addEventListener('canplay', function(ev){ try { const t=ev && ev.target; if (t && (t.currentSrc || t.src)) { inspectUrl(t.currentSrc || t.src); if(!__firstVideoPosted){ __firstVideoPosted=true; __postSingleVideo(t.currentSrc||t.src,'canplay'); } } } catch(e){} }, true);
          document.addEventListener('playing', function(ev){ try { const t=ev && ev.target; if (t && (t.currentSrc || t.src)) { inspectUrl(t.currentSrc || t.src); if(!__firstVideoPosted){ __firstVideoPosted=true; __postSingleVideo(t.currentSrc||t.src,'playing'); } } } catch(e){} }, true);
        } catch(e){}

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
          // Live observe resource performance entries as they occur
          try {
            const po = new PerformanceObserver(list => {
              try {
                list.getEntries().forEach(en => {
                  try {
                    if (en && en.name) {
                      const name = en.name;
                      inspectUrl(name);
                      const lower = String(name).toLowerCase();
                      if ((/(\.m3u8|\.mp4|\.webm|\.mkv|\.mov)(\?|#|$)/i.test(name) || lower.indexOf('.m3u8') !== -1) && !__firstVideoPosted) {
                        __firstVideoPosted = true;
                        __postSingleVideo(name, 'perf');
                      }
                    }
                  } catch(e){}
                });
              } catch(e){}
            });
            try { po.observe({type: 'resource', buffered: true}); } catch(e){}
          } catch(e){}
        } catch(e){}

        // Expose a function that can be called to post the latest found results
        window.__postFound = function() {
          try {
            // Reuse _postWithMeta so bridge/react-native/postMessage selection is consistent
            try { _postWithMeta('manual'); } catch(e){}
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
            if (false && false && window.bridge && typeof window.bridge.postWebviewPayload === 'function') {
              try { window.bridge.postWebviewPayload(_msg); } catch(e){}
            } else if (false && window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
              try { window.ReactNativeWebView.postMessage(_msg); } catch(e){}
            } else if (false && window.webkit && window.webkit.messageHandlers && typeof window.webkit.messageHandlers.reactNativeWebView === 'object' && typeof window.webkit.messageHandlers.reactNativeWebView.postMessage === 'function') {
              try { window.webkit.messageHandlers.reactNativeWebView.postMessage(_msg); } catch(e){}
            } else if (false && typeof window.postMessage === 'function') {
              try { window.postMessage(_msg); } catch(e){}
            }
          } catch(e){}
        }

        // If page already complete, wait ms then post. Otherwise wait for load event first.
        function schedulePost() {
          try {
            // Attempt to auto-click common "play" UI elements and directly play <video> elements
            // to trigger players that only fetch streams after user interaction.
            function attemptAutoPlay() {
              try {
                const selectors = [
                  '.jw-play',
                  '.jw-button',
                  '.vjs-big-play-button',
                  '.plyr__control--play',
                  '.play-button',
                  '[aria-label*="play" i]',
                  'button[title*="play" i]',
                  'button.play',
                  '.play',
                ];
                for (let i = 0; i < selectors.length; i++) {
                  try {
                    const sel = selectors[i];
                    const el = document.querySelector(sel);
                    if (el) {
                      try {
                        if (typeof el.click === 'function') {
                          try { el.click(); } catch(e) {}
                        } else {
                          // dispatch a synthetic mouse event if click() not available
                          try {
                            el.dispatchEvent && el.dispatchEvent(new MouseEvent('click', {bubbles:true,cancelable:true}));
                          } catch(e){}
                        }
                      } catch(e){}
                    }
                  } catch(e) {}
                }
                // Additionally try to play visible <video> elements directly
                try {
                  const vids = Array.from(document.querySelectorAll('video'));
                  vids.forEach(v => {
                    try {
                      const rect = v.getBoundingClientRect && v.getBoundingClientRect();
                      const visible = rect ? (rect.width > 20 && rect.height > 20) : true;
                      if (visible) {
                        try {
                          if (typeof v.play === 'function') {
                            const playPromise = v.play();
                            if (playPromise && typeof playPromise.then === 'function') {
                              playPromise.catch(()=>{});
                            }
                          } else {
                            // fallback to click on the video element
                            try { v.click(); } catch(e){}
                          }
                        } catch(e){}
                      }
                    } catch(e){}
                  });
                } catch(e){}
              } catch(e) {}
            }
  
            if (document.readyState === 'complete') {
              // Try to trigger autoplay heuristics before posting
              try { attemptAutoPlay(); } catch(e){}
              setTimeout(function(){ _postWithMeta('afterComplete'); }, ${ms});
              // extra retry in case dynamic loads happen
              setTimeout(function(){ _postWithMeta('afterComplete-retry'); }, ${
                ms * 2
              });
            } else {
              window.addEventListener('load', function() {
                try {
                  try { attemptAutoPlay(); } catch(e){}
                  // Try a few delayed attempts to trigger dynamic players
                  try { setTimeout(attemptAutoPlay, 500); } catch(e){}
                  try { setTimeout(attemptAutoPlay, 1500); } catch(e){}
                  setTimeout(function(){ _postWithMeta('onLoad'); }, ${ms});
                  setTimeout(function(){ _postWithMeta('onLoad-retry'); }, ${
                    ms * 2
                  });
                } catch(e){}
              }, {once: true});
              // Fallback: if load never fires, still post after a maximum timeout
              setTimeout(function(){
                try { attemptAutoPlay(); } catch(e){}
                _postWithMeta('fallback-max-timeout');
              }, ${ms * 3});
            }
          } catch(e){}
        }

        // Initial quick inspect to capture any synchronous resources
        // Extra heuristic: scan entire document HTML and inline scripts for .m3u8 occurrences
        function scanDocumentForM3U8() {
          try {
            // scan the full document HTML for .m3u8 strings (covers inline data or injected JS)
            try {
              const html = document.documentElement && document.documentElement.innerHTML;
              if (html && typeof html === 'string') {
                const re = /(?:https?:)?\/\/[^'"<>\s]+?\.m3u8(?:[?#][^'"<>\s]*)?|(?:\.\/|\.\.\/|\/)[^'"<>\s]*?\.m3u8(?:[?#][^'"<>\s]*)?/ig;
                let m;
                while ((m = re.exec(html)) !== null) {
                  try {
                    let candidate = m[0];
                    // Resolve protocol-relative and relative URLs
                    try { candidate = new URL(candidate, document.location.href).toString(); } catch(e){}
                    inspectUrl(candidate);
                  } catch(e){}
                }
              }
            } catch(e){}

            // scan inline scripts for quoted m3u8 URLs
            try {
              const scripts = Array.from(document.querySelectorAll('script'));
              scripts.forEach(s => {
                try {
                  const txt = s.textContent || '';
                  if (!txt) return;
                  if (txt.indexOf('.m3u8') === -1) return;
                  // find absolute URLs in quotes
                  const reAbs = /(['"])(https?:\/\/[^'"]+?\.m3u8(?:[?#][^'"]*)?)\\1/ig;
                  let mm;
                  while ((mm = reAbs.exec(txt)) !== null) {
                    try { inspectUrl(mm[2]); } catch(e){}
                  }
                  // find relative/fragment URLs in quotes and resolve
                  const reRel = /(['"])((?:\.\/|\.\.\/|\/)[^'"]+?\.m3u8(?:[?#][^'"]*)?)\\1/ig;
                  while ((mm = reRel.exec(txt)) !== null) {
                    try {
                      let cand = mm[2];
                      try { cand = new URL(cand, document.location.href).toString(); } catch(e){}
                      inspectUrl(cand);
                    } catch(e){}
                  }
                } catch(e){}
              });
            } catch(e){}
          } catch(e){}
        }

        // Run the document/script scan first (covers static or inlined references)
        try { scanDocumentForM3U8(); } catch(e){}

        // existing quick inspect to capture any synchronous resources
        inspectMediaElements();

        // Try to find the first iframe that contains a <video> (same-origin) or the first
        // visible <video> element on the page. Scroll to it and simulate a click/play.
        function findAndScrollToAndClick() {
          try {
            // Prefer iframe that contains a video (only works when same-origin)
            try {
              const iframes = Array.from(document.querySelectorAll('iframe'));
              for (let i = 0; i < iframes.length; i++) {
                try {
                  const f = iframes[i];
                  // scroll iframe into view first
                  try {
                    const r = f.getBoundingClientRect && f.getBoundingClientRect();
                    if (r) { try { window.scrollTo(0, (r.top + (window.pageYOffset||document.documentElement.scrollTop||document.body.scrollTop||0)) - 100); } catch(e){} }
                  } catch(e){}
                  try { f.scrollIntoView({behavior:'auto', block:'center'}); } catch(e){}
                  // attempt same-origin access to click inner video
                  try {
                    const cw = f.contentWindow;
                    if (cw && cw.document) {
                      const vid = cw.document.querySelector('video');
                      if (vid) {
                        try { f.click(); } catch(e){} // click iframe element as well
                        try {
                          const rv = vid.getBoundingClientRect && vid.getBoundingClientRect();
                          if (rv) { try { cw.scrollTo && cw.scrollTo(0, (rv.top + (cw.pageYOffset||0)) - 50); } catch(e){} }
                        } catch(e){}
                        try { vid.scrollIntoView({behavior:'auto', block:'center'}); } catch(e){}
                        try { vid.click && vid.click(); } catch(e){}
                        try { vid.play && vid.play().catch(()=>{}); } catch(e){}
                        return true;
                      }
                    }
                  } catch(e){}
                  // If same-origin check failed, try clicking the iframe element itself as a fallback
                  try { f.click(); } catch(e){}
                } catch(e){}
              }
            } catch(e){}

            // Next, try first visible <video> element on the main document
            try {
              const vids = Array.from(document.querySelectorAll('video'));
              for (let i = 0; i < vids.length; i++) {
                try {
                  const v = vids[i];
                  const rect = v.getBoundingClientRect && v.getBoundingClientRect();
                  const visible = rect ? (rect.width > 20 && rect.height > 20) : true;
                  if (visible) {
                    try { if (rect) { window.scrollTo(0, (rect.top + (window.pageYOffset||document.documentElement.scrollTop||document.body.scrollTop||0)) - 100); } } catch(e){}
                    try { v.scrollIntoView({behavior:'auto', block:'center'}); } catch(e){}
                    try { v.click && v.click(); } catch(e){}
                    try { v.play && v.play().catch(()=>{}); } catch(e){}
                    return true;
                  }
                } catch(e){}
              }
            } catch(e){}
          } catch(e){}
          return false;
        }

        try { window.__kick = function(){ try { findAndScrollToAndClick(); } catch(e){} }; } catch(e){}

        // Schedule the timed post after load/complete as described
        schedulePost();
        // Also proactively attempt to find/scroll/click a player a few times while the page populates.
        try { setTimeout(findAndScrollToAndClick, 500); } catch(e){}
        try { setTimeout(findAndScrollToAndClick, 1500); } catch(e){}
        try { setTimeout(findAndScrollToAndClick, ${ms}); } catch(e){}

      } catch(e) {
        try {
          const _msg = JSON.stringify({videos: [], subtitles: [], __meta: {error: true}});
          if (false && false && window.bridge && typeof window.bridge.postWebviewPayload === 'function') {
            try { window.bridge.postWebviewPayload(_msg); } catch(e){}
          } else if (false && window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
            try { window.ReactNativeWebView.postMessage(_msg); } catch(e){}
          } else if (false && window.webkit && window.webkit.messageHandlers && typeof window.webkit.messageHandlers.reactNativeWebView === 'object' && typeof window.webkit.messageHandlers.reactNativeWebView.postMessage === 'function') {
            try { window.webkit.messageHandlers.reactNativeWebView.postMessage(_msg); } catch(e){}
          } else if (false && typeof window.postMessage === 'function') {
            try { window.postMessage(_msg); } catch(e){}
          }
        } catch(e){}
      }
    })();
    true;
    `;
  };
  /* Added fallback working injected script (preserves original behavior) */
  const buildInjectedJS_v2 = (
    waitMs: number = 10000,
    suppressProbes: boolean = false,
  ) => {
    const ms = Number(waitMs) || 10000;
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
              if (false && false && window.bridge && typeof window.bridge.postWebviewPayload === 'function') {
                try { window.bridge.postWebviewPayload(_msg); } catch(e){}
              } else if (false && window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
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
            if (false && false && window.bridge && typeof window.bridge.postWebviewPayload === 'function') {
              try { window.bridge.postWebviewPayload(_msg); } catch(e){}
            } else if (false && window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
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
          if (false && false && window.bridge && typeof window.bridge.postWebviewPayload === 'function') {
            try { window.bridge.postWebviewPayload(_msg); } catch(e){}
          } else if (false && window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
            try { window.ReactNativeWebView.postMessage(_msg); } catch(e){}
          }
        } catch(e){}
      }
    })();
    true;
  `;
  };

  // Minimal injected script that emits immediate discovery messages during the wait window
  const buildInjectedJS_minimal = (
    waitMs: number = 10000,
    suppressProbes: boolean = false,
  ) => {
    const ms = Number(waitMs) || 10000;
    return `
    (function(){
      try{
        const found = { videos: [], subtitles: [] };

        function pushIfUnique(arr, v){
          try{
            if(!v) return false;
            const s = String(v);
            if(arr.indexOf(s) === -1){
              arr.push(s);
              return true;
            }
            return false;
          }catch(e){ return false; }
        }

        function postDiscovery(videos, subtitles, stage){
          try{
            const payload = {
              videos: Array.isArray(videos) ? videos : [],
              subtitles: Array.isArray(subtitles) ? subtitles : [],
              __meta: { postedAt: Date.now(), waitMs: ${ms}, stage: stage || 'found' }
            };
            const msg = JSON.stringify(payload);
            if (window.bridge && typeof window.bridge.postWebviewPayload === 'function') {
              try{ window.bridge.postWebviewPayload(msg); } catch(e){}
            } else if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
              try{ window.ReactNativeWebView.postMessage(msg); } catch(e){}
            }
          }catch(e){}
        }

        function inspectMediaElements(emitImmediate){
          try{
            const vids = Array.from(document.querySelectorAll('video, source, track'));
            vids.forEach(el => {
              try{
                const src = (el && (el.currentSrc || el.src)) || (el.getAttribute && el.getAttribute('src'));
                if(src){
                  const added = pushIfUnique(found.videos, src);
                  if(emitImmediate && added){
                    postDiscovery([src], [], 'immediate-video');
                  }
                }
                try {
                  if (el.tagName && String(el.tagName).toLowerCase() === 'track') {
                    const t = (el && (el.src || (el.getAttribute && el.getAttribute('src'))));
                    if(t && /\.(srt|vtt|ass|ssa|smi)(?:[?#]|$)/i.test(t)){
                      const addedSub = pushIfUnique(found.subtitles, t);
                      if(emitImmediate && addedSub){
                        postDiscovery([], [t], 'immediate-subtitle');
                      }
                    }
                  }
                } catch(e){}
              }catch(e){}
            });

            // Collect iframe src attributes (do NOT probe internals)
            try{
              const iframes = Array.from(document.querySelectorAll('iframe'));
              iframes.forEach(f => {
                try{
                  const fsrc = f && (f.src || (f.getAttribute && f.getAttribute('src')));
                  if(fsrc){
                    const added = pushIfUnique(found.videos, fsrc);
                    if(emitImmediate && added){
                      postDiscovery([fsrc], [], 'immediate-iframe');
                    }
                  }
                }catch(e){}
              });
            }catch(e){}
          }catch(e){}
        }

        // Final consolidated post after waitMs
        function postFinal(){
          try{
            inspectMediaElements(false);
            const payload = {
              videos: found.videos,
              subtitles: found.subtitles,
              __meta: { postedAt: Date.now(), waitMs: ${ms}, stage: 'final' }
            };
            const msg = JSON.stringify(payload);
            if (window.bridge && typeof window.bridge.postWebviewPayload === 'function') {
              try{ window.bridge.postWebviewPayload(msg); } catch(e){}
            } else if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
              try{ window.ReactNativeWebView.postMessage(msg); } catch(e){}
            }
          }catch(e){}
        }

        // Try to autoplay visible videos to trigger lazy loads
        function attemptAutoPlay(){
          try{
            const videos = Array.from(document.querySelectorAll('video'));
            videos.forEach(v=>{
              try{
                const rect = v.getBoundingClientRect && v.getBoundingClientRect();
                const visible = rect ? (rect.width>20 && rect.height>20) : true;
                if(visible && typeof v.play === 'function'){
                  try{ v.play().catch(()=>{}); } catch(e){}
                }
              }catch(e){}
            });
          }catch(e){}
        }

        // Initial quick scan and emit immediate discoveries
        try{ inspectMediaElements(true); } catch(e){}

        if(document.readyState === 'complete'){
          try{ attemptAutoPlay(); }catch(e){}
          setTimeout(postFinal, ${ms});
        } else {
          window.addEventListener('load', function(){
            try{ inspectMediaElements(true); } catch(e){}
            try{ attemptAutoPlay(); }catch(e){}
            setTimeout(postFinal, ${ms});
          }, {once:true});
          // Hard fallback
          setTimeout(postFinal, ${ms * 3});
        }

        // Observe DOM mutations during the wait window and emit discoveries as they appear
        try{
          const mo = new MutationObserver(mutations => {
            try{
              inspectMediaElements(true);
            }catch(e){}
          });
          try{ mo.observe(document, { childList: true, subtree: true }); } catch(e){}
        }catch(e){}

      }catch(e){}
    })();
    true;
  `;
  };
  const injectedNoProbePrefix =
    'try{ window.__autoplay_block=true; window.__nativeInterceptReady=false; function inspectUrl(u){return;} }catch(e){};true;';

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
            extracting ? (
              <ActivityIndicator size="large" />
            ) : (
              <Text style={{textAlign: 'center'}}>No Sources Found</Text>
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
      {/* Using injectedNoProbePrefix (declared above) to disable per-request probe posting in the injected script */}
      {/* Hidden WebView for extraction */}
      {bottomSheetVisible ? (
        <View style={{height: 150, width: '100%'}}>
          <WebViewComponent
            key={webviewKey}
            {...webviewExtraProps}
            ref={webviewRef}
            // Navigate to the requested URL once the native WebView has been laid out.
            // We no longer block navigation waiting for the native readiness event,
            // because that can leave the WebView blank on some devices. Native interception
            // will still report matches when it becomes available.
            source={
              webviewReady && readyToNavigate && pendingSourceUrl
                ? {uri: pendingSourceUrl}
                : {uri: 'about:blank'}
            }
            javaScriptEnabled={true}
            // Prevent autoplay before native interception is ready.
            mediaPlaybackRequiresUserAction={!webviewReady}
            // onLayout indicates the native view has mounted; enable navigation when mounted.
            onLayout={() => {
              try {
                if (!webviewReady) {
                  setWebviewReady(true);
                  try {
                    console.log(
                      '[ExtractorBottomSheet] WebView onLayout: native view mounted',
                    );
                  } catch (e) {}
                  // Schedule navigation only after a short delay when a native intercepting
                  // implementation exists so the native side receives nativeUrlRegex prop first.
                  try {
                    if (
                      interceptingAvailableRef &&
                      interceptingAvailableRef.current
                    ) {
                      // clear any previous timeout
                      try {
                        if (nativeReadyTimeoutRef.current) {
                          clearTimeout(nativeReadyTimeoutRef.current);
                        }
                      } catch (e) {}
                      nativeReadyTimeoutRef.current = setTimeout(() => {
                        try {
                          setReadyToNavigate(true);
                          try {
                            console.log(
                              '[ExtractorBottomSheet] readyToNavigate -> true (post-native-mount delay)',
                            );
                          } catch (e) {}
                        } catch (e) {}
                      }, 150);
                    } else {
                      setReadyToNavigate(true);
                    }
                  } catch (e) {}
                  // Navigation will be performed when readyToNavigate becomes true.
                }
              } catch (e) {}
            }}
            allowsInlineMediaPlayback={true}
            allowsFullscreenVideo={true}
            javaScriptCanOpenWindowsAutomatically={true}
            // Run lighter injected script (autoplay/iframe/adblock heuristics) — do not
            // use network overrides when native interception is available.
            injectedJavaScriptBeforeContentLoaded={
              interceptingAvailableRef.current
                ? injectedNoProbePrefix +
                  buildInjectedJS_minimal(
                    (currentWebviewRequest && currentWebviewRequest.waitMs) ||
                      10000,
                    interceptingAvailableRef.current,
                  )
                : buildInjectedJS_minimal(
                    (currentWebviewRequest && currentWebviewRequest.waitMs) ||
                      10000,
                    interceptingAvailableRef.current,
                  )
            }
            injectedJavaScriptBeforeContentLoadedForMainFrameOnly={false}
            // Also keep injectedJavaScript for extra post-detection once page loads
            injectedJavaScript={
              interceptingAvailableRef.current
                ? injectedNoProbePrefix +
                  buildInjectedJS_minimal(
                    (currentWebviewRequest && currentWebviewRequest.waitMs) ||
                      10000,
                    interceptingAvailableRef.current,
                  )
                : buildInjectedJS_minimal(
                    (currentWebviewRequest && currentWebviewRequest.waitMs) ||
                      10000,
                    interceptingAvailableRef.current,
                  )
            }
            injectedJavaScriptForMainFrameOnly={false}
            onMessage={handleWebviewMessage}
            originWhitelist={['*']}
            mixedContentMode={'always'}
            startInLoadingState={true}
            // Improve compatibility: enable DOM storage / cookies
            domStorageEnabled={true}
            sharedCookiesEnabled={true}
            thirdPartyCookiesEnabled={true}
            // Use a real browser userAgent to avoid simplified mobile sites that hide resources
            userAgent={
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
            onLoadStart={() => {
              try {
                lastKickProgressRef.current = 0;
                if (webviewRef.current && webviewRef.current.injectJavaScript) {
                  const wait =
                    (currentWebviewRequest && currentWebviewRequest.waitMs) ||
                    10000;
                  try {
                    webviewRef.current.injectJavaScript(
                      buildInjectedJS_minimal(
                        wait,
                        interceptingAvailableRef.current,
                      ),
                    );
                  } catch (e) {}
                  try {
                    webviewRef.current.injectJavaScript(
                      'try{ window.__kick && window.__kick(); }catch(e){};true;',
                    );
                  } catch (e) {}
                  try {
                    webviewRef.current.injectJavaScript(
                      '(function(){ try { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({__ping:true,ts:Date.now()})); } catch(e){} })(); true;',
                    );
                  } catch (e) {}
                }
              } catch (e) {}
            }}
            onLoadProgress={(e: any) => {
              try {
                const p =
                  (e &&
                    (e as any).nativeEvent &&
                    (e as any).nativeEvent.progress) ||
                  0;
                const last = lastKickProgressRef.current || 0;
                if (
                  (p >= 0.3 && last < 0.3) ||
                  (p >= 0.6 && last < 0.6) ||
                  (p >= 0.9 && last < 0.9)
                ) {
                  lastKickProgressRef.current = p;
                  if (
                    webviewRef.current &&
                    webviewRef.current.injectJavaScript
                  ) {
                    const wait2 =
                      (currentWebviewRequest && currentWebviewRequest.waitMs) ||
                      10000;
                    try {
                      webviewRef.current.injectJavaScript(
                        buildInjectedJS_minimal(
                          wait2,
                          interceptingAvailableRef.current,
                        ),
                      );
                    } catch (e) {}
                    try {
                      webviewRef.current.injectJavaScript(
                        'try{ window.__kick && window.__kick(); }catch(e){};true;',
                      );
                    } catch (e) {}
                    try {
                      webviewRef.current.injectJavaScript(
                        "(function(){ try { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({__ping:true,progress:'" +
                          String(p) +
                          "',ts:Date.now()})); } catch(e){} })(); true;",
                      );
                    } catch (e) {}
                  }
                }
              } catch (e) {}
            }}
            onLoadEnd={() => {
              try {
                const wait =
                  (currentWebviewRequest && currentWebviewRequest.waitMs) ||
                  10000;
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
                      try {
                        webviewRef.current.injectJavaScript(
                          buildInjectedJS_minimal(
                            wait,
                            interceptingAvailableRef.current,
                          ),
                        );
                      } catch (e) {}
                      try {
                        webviewRef.current.injectJavaScript(
                          'try{ window.__postFound && window.__postFound(); }catch(e){};true;',
                        );
                      } catch (e) {}
                      // Also enumerate likely player links/iframes and send back to RN for batch-follow
                      try {
                        webviewRef.current.injectJavaScript(
                          "(function(){ try{ /* probeBatch suppressed to avoid per-request probing */ window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({__ping:true,stage:'batch-suppressed',ts:Date.now()})); }catch(e){} })(); true;",
                        );
                      } catch (e) {}
                      try {
                        webviewRef.current.injectJavaScript(
                          "(function(){ try { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({__ping:true,stage:'onLoadEnd',ts:Date.now()})); } catch(e){} })(); true;",
                        );
                      } catch (e) {}
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
            onHttpError={(e: any) => {
              try {
                console.warn(
                  '[ExtractorBottomSheet] onHttpError',
                  (e as any)?.nativeEvent,
                );
              } catch (err) {}
            }}
            onError={(e: any) => {
              try {
                console.warn(
                  '[ExtractorBottomSheet] onError',
                  (e as any)?.nativeEvent,
                );
              } catch (err) {}
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
