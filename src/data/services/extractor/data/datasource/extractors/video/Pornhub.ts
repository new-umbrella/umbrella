// Converted/adapted from: https://github.com/yogesh-hacker/MediaVanced/blob/main/sites/pornhub.py
// Credit: https://github.com/yogesh-hacker
// Note: 18+ content extractor

import ExtractorAudio from '../../../../../../../features/plugins/data/model/media/ExtractorAudio';
import ExtractorVideo from '../../../../../../../features/plugins/data/model/media/ExtractorVideo';
import MediaType from '../../../../../../../features/plugins/data/model/media/MediaType';
import RawAudio from '../../../../../../../features/plugins/data/model/media/RawAudio';
import RawVideo from '../../../../../../../features/plugins/data/model/media/RawVideo';
import {Extractor} from '../../../../domain/entities/Extractor';
import {ExtractorInfo} from '../../../../domain/entities/ExtractorInfo';
import axiosClient from '../../../../../../../core/utils/network/axios';

class Pornhub implements Extractor {
  name = 'pornhub';

  execute = async (
    data: ExtractorVideo | ExtractorAudio,
  ): Promise<RawVideo[] | RawAudio[]> => {
    const sources: RawVideo[] = [];
    try {
      const {data: responseData} = await axiosClient.get(data.url, {
        headers: {
          Referer: 'https://www.pornhub.org/',
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36',
        },
      });

      const body = responseData as string;
      const match = body.match(/var\s+flashvars_\d+\s*=\s*({[\s\S]*?});/);
      if (!match) throw new Error('flashvars not found');
      const jsonStr = match[1];
      const parsed = JSON.parse(jsonStr);

      for (const def of parsed.mediaDefinitions || []) {
        if (def.format === 'hls' && def.videoUrl) {
          sources.push({
            url: def.videoUrl,
            isM3U8: true,
            name: `${this.name} ${def.height}p`,
            type: MediaType.RawVideo,
          });
        }
      }

      return sources;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };
}

class PornhubInfo implements ExtractorInfo {
  id: string = 'pornhub';
  patterns: RegExp[] = [/pornhub\./, /pornhub\.com/];
  extractorMediaType: MediaType = MediaType.ExtractorVideo;
  extractors: Extractor[] = [new Pornhub()];
}

export default PornhubInfo;
