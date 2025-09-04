import ExtractorAudio from '../../../../../../../features/plugins/data/model/media/ExtractorAudio';
import ExtractorVideo from '../../../../../../../features/plugins/data/model/media/ExtractorVideo';
import MediaType from '../../../../../../../features/plugins/data/model/media/MediaType';
import RawAudio from '../../../../../../../features/plugins/data/model/media/RawAudio';
import RawVideo from '../../../../../../../features/plugins/data/model/media/RawVideo';
import {Subtitle} from '../../../../../../../features/plugins/data/model/media/Subtitle';
import {Extractor} from '../../../../domain/entities/Extractor';
import {ExtractorInfo} from '../../../../domain/entities/ExtractorInfo';
import detectSubtitleMimeType from '../../../../../../../core/utils/detectSubtitleMimeType';

class UniversalExtractor implements Extractor {
  name: string = 'Universal Extractor';

  allVideoFileExtensions: string[] = [
    'mp4',
    'mkv',
    'webm',
    'flv',
    'mov',
    'avi',
    'wmv',
    'm4p',
    'm4b',
    'm4v',
    'm3u8', // m3u8 is a container format, not a video format, but commonly associated with video files
  ];

  allSubtitleFileExtensions: string[] = ['srt', 'vtt', 'ass', 'ssa', 'smi'];

  async execute(
    data: ExtractorVideo | ExtractorAudio,
  ): Promise<RawVideo[] | RawAudio[]> {
    console.log('UniversalExtractor.execute url:', data.url);
    // This extractor delegates extraction to the in-app hidden WebView
    // which runs inside the `ExtractSourcesBottomSheet` component and uses
    // `react-native-intercepting-webview` under the hood for network interception.
    // The store helper (`sendWebviewRequest`) coordinates the request/response.
    try {
      // Dynamically import the extractor store module so this file doesn't
      // create circular import problems at module-eval time.
      const storeModule: any = await import(
        '../../../../presentation/state/ExtractorServiceStore'
      ).catch(() => null);

      // Pull the zustand hook (or the module) depending on import shape.
      const useExtractorServiceStore = storeModule?.useExtractorServiceStore;
      const store =
        useExtractorServiceStore &&
        typeof useExtractorServiceStore.getState === 'function'
          ? useExtractorServiceStore.getState()
          : useExtractorServiceStore;

      // The hidden WebView is implemented with `react-native-intercepting-webview`.
      // No need to probe for a legacy local component anymore.

      // If the store exposes sendWebviewRequest, use it. It will set a
      // currentWebviewRequest in the store and return a Promise that resolves
      // when the hidden WebView posts back the discovered URLs. The hidden
      // WebView (ExtractSourcesBottomSheet) uses InterceptingWebView which provides
      // adblock/autoplay/native interception.
      if (store && typeof store.sendWebviewRequest === 'function') {
        // Ensure the bottom sheet is visible (it hosts the hidden WebView) so interception works.
        try {
          if (typeof store.setBottomSheetVisible === 'function') {
            store.setBottomSheetVisible(true);
          }
        } catch (e) {}
        // Request the webview to load the page and return any discovered
        // video/subtitle URLs. Ensure timeout is larger than waitMs so the
        // webview has time to load and post results.
        const timeoutMs = 20000; // give the webview up to 20s by default
        const waitMs = 10000; // let the page run its own detection for ~1.5s
        console.log(
          '[UniversalExtractor] sendWebviewRequest (using InterceptingWebView when available) url, timeoutMs, waitMs:',
          data.url,
          timeoutMs,
          waitMs,
        );
        // Build a nativeUrlRegex string covering video+subtitle extensions so
        // InterceptingWebView's native matcher can report matches immediately.
        const allExts = [
          ...(this.allVideoFileExtensions || []),
          ...(this.allSubtitleFileExtensions || []),
        ]
          .map((s: string) =>
            String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
          )
          .filter(Boolean)
          .join('|');
        const nativeUrlRegex =
          allExts && allExts.length ? `\\.(?:${allExts})(?:[?#]|$)` : undefined;

        // First attempt
        let result: {videos: string[]; subtitles: string[]; headersByUrl?: Record<string, Record<string, string>>} =
          await store.sendWebviewRequest(
            data.url,
            timeoutMs,
            waitMs,
            nativeUrlRegex,
          );
        console.log('[UniversalExtractor] First attempt result:', result);
        // If we didn't find any videos, do one retry with a longer wait (still bounded).
        if (
          !result ||
          !Array.isArray(result.videos) ||
          result.videos.length === 0
        ) {
          try {
            const retryTimeoutMs = 30000;
            const retryWaitMs = 5000;
            console.log(
              '[UniversalExtractor] No videos found — retrying with longer wait:',
              retryTimeoutMs,
              retryWaitMs,
            );
            result = await store.sendWebviewRequest(
              data.url,
              retryTimeoutMs,
              retryWaitMs,
              nativeUrlRegex,
            );
            console.log('[UniversalExtractor] Retry result:', result);
          } catch (retryErr) {
            console.warn(
              '[UniversalExtractor] Retry sendWebviewRequest failed',
              retryErr,
            );
          }
        }

        // Map discovered video URLs to RawVideo objects.
        const sources: RawVideo[] = (result.videos || []).map((u: string) => {
          const urlLower = String(u).toLowerCase();
          const p = String(u).split('?')[0].split('#')[0];
          const ext = p.split('.').pop() || '';
          const headers = (result.headersByUrl && result.headersByUrl[u]) || undefined;
          return {
            name: this.name,
            type: MediaType.RawVideo,
            url: u,
            fileType: ext || undefined,
            isM3U8: urlLower.endsWith('.m3u8'),
            ...(headers ? { headers } : {}),
          } as RawVideo;
        });
        console.log('Sources:', sources);

        // Map discovered subtitle URLs to Subtitle objects (using mime detector)
        const subtitles: Subtitle[] = (result.subtitles || []).map(
          (u: string) => {
            const mime = detectSubtitleMimeType(u);
            return {
              url: u,
              name: 'Subtitle',
              ...(mime ? {mimeType: mime} : {}),
            } as Subtitle;
          },
        );
        console.log('Subtitles:', subtitles);

        // Attach subtitles to the first discovered source if present.
        if (sources.length && subtitles.length) {
          sources[0].subtitles = subtitles;
        }

        // Convert to the expected return type based on input media type.
        if (data.type === MediaType.ExtractorAudio) {
          return [] as RawAudio[];
        }
        console.log('Sources:', sources);
        return sources as RawVideo[];
      }

      // If store or helper not available, return empty result to avoid blocking.
      return [] as RawVideo[];
    } catch (e) {
      console.warn('UniversalExtractor failed:', e);
      return [] as RawVideo[];
    }
  }
}

class UniversalExtractorInfo implements ExtractorInfo {
  id: string = 'universal-extractor';
  patterns: RegExp[] = [/.*\./];
  extractorMediaType: MediaType = MediaType.ExtractorVideo;
  extractors: Extractor[] = [new UniversalExtractor()];
}

export default UniversalExtractorInfo;
