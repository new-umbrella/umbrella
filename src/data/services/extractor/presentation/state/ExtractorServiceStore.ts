import {create} from 'zustand';
import RawAudio from '../../../../../features/plugins/data/model/media/RawAudio';
import RawVideo from '../../../../../features/plugins/data/model/media/RawVideo';
import ExtractorAudio from '../../../../../features/plugins/data/model/media/ExtractorAudio';
import ExtractorVideo from '../../../../../features/plugins/data/model/media/ExtractorVideo';
import DetailedItem from '../../../../../features/plugins/data/model/item/DetailedItem';

type WebviewResponse = {
  videos: string[];
  subtitles: string[];
  // Optional metadata coming from the WebView (postedAt, waitMs, etc.)
  __meta?: {
    postedAt?: number;
    waitMs?: number;
    stage?: string;
    error?: boolean;
    [key: string]: any;
  };
};

interface WebviewRequest {
  id: string;
  url: string;
  waitMs?: number;
  // Optional nativeUrlRegex requested by the caller (string form expected by native view)
  nativeUrlRegex?: string;
  // Timestamp (ms) when the request was created; used to enforce minimum wait
  startTime?: number;
}

interface ExtractorServiceState {
  detailedItem: DetailedItem;
  setDetailedItem: (item: DetailedItem) => void;
  mediaIndex: number;
  setMediaIndex: (index: number) => void;
  extracting: boolean;
  setExtracting: (value: boolean) => void;
  bottomSheetVisible: boolean;
  setBottomSheetVisible: (visible: boolean) => void;
  rawSources: (ExtractorAudio | RawAudio | ExtractorVideo | RawVideo)[];
  setRawSources: (
    sources: (ExtractorAudio | RawAudio | ExtractorVideo | RawVideo)[],
  ) => void;
  sources: (RawAudio | RawVideo)[];
  setSources: (sources: (RawAudio | RawVideo)[]) => void;

  // WebView-based extraction request/response
  currentWebviewRequest: WebviewRequest | null;
  sendWebviewRequest: (
    url: string,
    timeoutMs?: number,
    waitMs?: number,
    nativeUrlRegex?: string,
  ) => Promise<WebviewResponse>;
  receiveWebviewResponse: (id: string, payload: WebviewResponse) => void;
}

// Local resolver map (kept outside state)
const webviewResolvers: Record<string, any> = {};

export const useExtractorServiceStore = create<ExtractorServiceState>()(
  set => ({
    detailedItem: {} as DetailedItem,
    setDetailedItem: (item: DetailedItem) => {
      set({
        detailedItem: item,
      });
    },
    mediaIndex: 0,
    setMediaIndex: (index: number) => {
      set({
        mediaIndex: index,
      });
    },
    extracting: false,
    setExtracting: value =>
      set(() => {
        return {extracting: value};
      }),
    bottomSheetVisible: false,
    setBottomSheetVisible: (visible: boolean) =>
      set({bottomSheetVisible: visible}),
    rawSources: [],
    setRawSources: (
      rawSources: (ExtractorAudio | RawAudio | ExtractorVideo | RawVideo)[],
    ) => set({rawSources}),
    sources: [],
    setSources: (sources: (RawAudio | RawVideo)[]) => set({sources}),

    // WebView request state and helpers
    currentWebviewRequest: null,
    sendWebviewRequest: (
      url: string,
      timeoutMs: number = 20000,
      waitMs: number = 1500,
      nativeUrlRegex?: string,
    ) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      console.log(
        '[ExtractorStore] sendWebviewRequest id, url, waitMs (requested):',
        id,
        url,
        waitMs,
        'nativeUrlRegex:',
        nativeUrlRegex,
      );

      // Ensure the timeout cannot fire before the requested waitMs elapses.
      // Increase the effective timeout if the caller passed a timeoutMs that
      // is shorter than waitMs + a small buffer.
      const effectiveTimeoutMs = Math.max(timeoutMs, (waitMs || 0) + 2000);

      return new Promise<WebviewResponse>(resolve => {
        // Store a richer resolver object so multiple WebView posts can update
        // the latest payload and we only resolve when the configured waitMs
        // after the latest postAt has elapsed (or when the overall timeout fires).
        const resolverObj: any = {
          resolveFn: resolve,
          latestPayload: {videos: [], subtitles: []} as WebviewResponse,
          deferredTimer: null as any,
          fallbackTimeout: null as any,
          request: {
            id,
            url,
            waitMs,
            nativeUrlRegex,
            startTime: Date.now(),
          } as WebviewRequest,
        };
        webviewResolvers[id] = resolverObj;
        set({currentWebviewRequest: resolverObj.request});

        // Fallback timeout: if nothing yields results within effectiveTimeoutMs,
        // resolve with the latest payload (likely empty).
        const fallbackHandle = setTimeout(() => {
          try {
            console.warn(
              '[ExtractorStore] sendWebviewRequest timed out for id (effectiveTimeoutMs):',
              id,
              effectiveTimeoutMs,
            );
            const obj = webviewResolvers[id];
            if (obj && typeof obj.resolveFn === 'function') {
              try {
                obj.resolveFn(obj.latestPayload || {videos: [], subtitles: []});
              } catch (e) {}
            }
          } finally {
            try {
              delete webviewResolvers[id];
              set({currentWebviewRequest: null});
            } catch (e) {}
          }
        }, effectiveTimeoutMs);
        resolverObj.fallbackTimeout = fallbackHandle;
      });
    },
    receiveWebviewResponse: (id: string, payload: WebviewResponse) => {
      try {
        console.log(
          '[ExtractorStore] receiveWebviewResponse id:',
          id,
          'payload:',
          payload,
        );
        const obj = webviewResolvers[id];
        if (!obj) {
          // No active request — nothing to do
          set({currentWebviewRequest: null});
          return;
        }

        // Normalize meta (support payload.__meta and payload.meta)
        const metaAny: any =
          (payload as any).__meta || (payload as any).meta || {};
        const waitMs =
          typeof metaAny.waitMs === 'number'
            ? metaAny.waitMs
            : obj.request?.waitMs || 1500;
        const postedAt =
          typeof metaAny.postedAt === 'number' ? metaAny.postedAt : Date.now();

        // Update latest payload for this request
        obj.latestPayload = payload;

        // If there is an existing deferred timer, clear it; we'll reschedule based on the newest post time
        try {
          if (obj.deferredTimer) {
            clearTimeout(obj.deferredTimer);
            obj.deferredTimer = null;
          }
        } catch (e) {}

        const now = Date.now();
        const elapsedSincePost = Math.max(0, now - postedAt);
        const remaining = Math.max(0, waitMs - elapsedSincePost);
        if (remaining > 0) {
          console.log(
            '[ExtractorStore] receiveWebviewResponse arrived early, deferring resolve by ms:',
            remaining,
            'id:',
            id,
          );
          // If a fallback timeout was scheduled earlier, clear it and reschedule
          // it so it won't fire before our deferred resolve (gives deferredTimer
          // a chance to run).
          try {
            if (obj.fallbackTimeout) {
              clearTimeout(obj.fallbackTimeout);
              // Schedule a new fallback slightly after the deferred timer
              obj.fallbackTimeout = setTimeout(() => {
                try {
                  console.warn(
                    '[ExtractorStore] rescheduled fallback fired for id:',
                    id,
                  );
                  if (obj && typeof obj.resolveFn === 'function') {
                    obj.resolveFn(
                      obj.latestPayload || {videos: [], subtitles: []},
                    );
                  }
                } catch (e) {}
                try {
                  delete webviewResolvers[id];
                } catch (e) {}
                try {
                  set({currentWebviewRequest: null});
                } catch (e) {}
              }, remaining + 2000);
            }
          } catch (e) {}
          // Schedule final resolution to happen waitMs after the postedAt of this payload.
          obj.deferredTimer = setTimeout(() => {
            try {
              if (obj && typeof obj.resolveFn === 'function') {
                obj.resolveFn(obj.latestPayload || {videos: [], subtitles: []});
              }
            } catch (e) {}
            try {
              delete webviewResolvers[id];
            } catch (e) {}
            try {
              set({currentWebviewRequest: null});
            } catch (e) {}
          }, remaining);
        } else {
          // Enough time has elapsed — resolve immediately with the latest payload.
          try {
            if (obj && typeof obj.resolveFn === 'function') {
              obj.resolveFn(obj.latestPayload || {videos: [], subtitles: []});
            }
          } catch (e) {}
          try {
            if (obj.fallbackTimeout) clearTimeout(obj.fallbackTimeout);
          } catch (e) {}
          try {
            delete webviewResolvers[id];
          } catch (e) {}
          try {
            set({currentWebviewRequest: null});
          } catch (e) {}
        }
      } catch (e) {
        try {
          console.warn('[ExtractorStore] receiveWebviewResponse failed', e);
        } catch (e2) {}
        set({currentWebviewRequest: null});
      }
    },
  }),
);
