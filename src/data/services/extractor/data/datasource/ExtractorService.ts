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
    console.log(matchedExtractors);
    if (matchedExtractors.length === 0) {
      throw new Error('Extractor not found');
    }
    var sources: (RawAudio | RawVideo)[] = [];

    for (const extractor of matchedExtractors) {
      for (const extract of extractor.extractors) {
        sources.push(...(await extract.execute(data)));
      }
    }

    sources = sources.flat();

    if (data.type === MediaType.ExtractorAudio) {
      return sources as RawAudio[];
    }
    return sources as RawVideo[];
  },
};
