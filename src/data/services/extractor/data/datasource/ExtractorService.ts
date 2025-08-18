import ExtractorAudio from '../../../../../features/plugins/data/model/media/ExtractorAudio';
import ExtractorVideo from '../../../../../features/plugins/data/model/media/ExtractorVideo';
import MediaType from '../../../../../features/plugins/data/model/media/MediaType';
import RawAudio from '../../../../../features/plugins/data/model/media/RawAudio';
import RawVideo from '../../../../../features/plugins/data/model/media/RawVideo';
import {ExtractorInfo} from '../../domain/entities/ExtractorInfo';

import Extractors from './extractors/index';

export const ExtractorService = {
  getExtractorsByType(type: MediaType): ExtractorInfo[] {
    switch (type) {
      case MediaType.ExtractorVideo:
        return Extractors.ExtractorVideo;
      default:
        return Extractors.Other;
    }
  },

  async extract(
    data: ExtractorVideo | ExtractorAudio,
  ): Promise<RawAudio[] | RawVideo[]> {
    console.log('Extracting', data);
    const extractors = this.getExtractorsByType(data.type);
    const matchedExtractors: ExtractorInfo[] = extractors.filter(
      (e: ExtractorInfo) =>
        e.patterns.some(p => data.url.match(p)) &&
        e.extractorMediaType === data.type,
    );
    console.log(
      'Matched extractors:',
      matchedExtractors.map(m => m.id || m),
    );
    if (matchedExtractors.length === 0) {
      throw new Error('Extractor not found');
    }
    var sources: (RawAudio | RawVideo)[] = [];

    // Iterate matched extractors and call each extractor implementation.
    for (const extractorInfo of matchedExtractors) {
      console.log('Running extractor info:', extractorInfo.id ?? extractorInfo);
      for (const extractorInstance of extractorInfo.extractors) {
        try {
          console.log(
            `Calling execute on extractor instance: ${extractorInstance.name}`,
          );
          const result = await extractorInstance.execute(data);
          console.log(
            `Result from ${extractorInstance.name}:`,
            Array.isArray(result) ? result.length : typeof result,
          );
          if (Array.isArray(result) && result.length > 0) {
            sources.push(...(result as (RawAudio | RawVideo)[]));
          }
        } catch (err) {
          console.warn(
            `Extractor ${extractorInstance.name} threw an error:`,
            err,
          );
        }
      }
    }

    sources = sources.flat();

    // Also push discovered sources directly into the extractor presentation store
    // so the bottom sheet UI sees results immediately even if there are timing
    // races with the hidden WebView request/response handling.
    try {
      const storeModule: any = await import(
        '../../presentation/state/ExtractorServiceStore'
      ).catch(() => null);
      const useExtractorServiceStore = storeModule?.useExtractorServiceStore;
      const store =
        useExtractorServiceStore &&
        typeof useExtractorServiceStore.getState === 'function'
          ? useExtractorServiceStore.getState()
          : useExtractorServiceStore;
      if (store && typeof store.setSources === 'function') {
        try {
          (store.setSources as any)(sources as (RawAudio | RawVideo)[]);
          console.log(
            '[ExtractorService] pushed sources to ExtractorServiceStore:',
            sources.length,
          );
        } catch (e) {
          console.warn('[ExtractorService] failed to setSources on store', e);
        }
      }
    } catch (e) {
      console.warn('[ExtractorService] failed to import extractor store', e);
    }

    if (data.type === MediaType.ExtractorAudio) {
      return sources as RawAudio[];
    }
    return sources as RawVideo[];
  },
};
