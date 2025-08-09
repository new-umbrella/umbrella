// Converted/adapted from: https://github.com/yogesh-hacker/MediaVanced/blob/main/sites/speedostream.py
// Credit: https://github.com/yogesh-hacker

import ExtractorAudio from '../../../../../../../features/plugins/data/model/media/ExtractorAudio';
import ExtractorVideo from '../../../../../../../features/plugins/data/model/media/ExtractorVideo';
import MediaType from '../../../../../../../features/plugins/data/model/media/MediaType';
import RawAudio from '../../../../../../../features/plugins/data/model/media/RawAudio';
import RawVideo from '../../../../../../../features/plugins/data/model/media/RawVideo';
import {Extractor} from '../../../../domain/entities/Extractor';
import {ExtractorInfo} from '../../../../domain/entities/ExtractorInfo';
import axiosClient from '../../../../../../../core/utils/network/axios';

class SpeedoStream implements Extractor {
  name = 'speedostream';

  execute = async (
    data: ExtractorVideo | ExtractorAudio,
  ): Promise<RawVideo[] | RawAudio[]> => {
    const sources: RawVideo[] = [];
    try {
      const parsedUrl = new URL(data.url);
      const defaultDomain = `${parsedUrl.protocol}//${parsedUrl.hostname}/`;

      const {data: responseData} = await axiosClient.get(data.url, {
        headers: {
          Referer: defaultDomain,
        },
      });

      const body = responseData as string;
      const match = body.match(/file:"([^"]+)"/);
      const videoUrl = match?.[1] ?? '';
      if (!videoUrl) throw new Error('Video URL not found');

      sources.push({
        url: videoUrl,
        isM3U8: videoUrl.includes('.m3u8'),
        name: this.name,
        type: MediaType.RawVideo,
      });

      return sources;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };
}

class SpeedoStreamInfo implements ExtractorInfo {
  id: string = 'speedostream';
  patterns: RegExp[] = [/speedostream\./, /spedostream\./, /speedostream\.pm/];
  extractorMediaType: MediaType = MediaType.ExtractorVideo;
  extractors: Extractor[] = [new SpeedoStream()];
}

export default SpeedoStreamInfo;
