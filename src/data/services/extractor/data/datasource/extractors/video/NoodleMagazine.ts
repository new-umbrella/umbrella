// Converted/adapted from: https://github.com/yogesh-hacker/MediaVanced/blob/main/sites/noodlemagazine.py
// Credit: https://github.com/yogesh-hacker

import ExtractorAudio from '../../../../../../../features/plugins/data/model/media/ExtractorAudio';
import ExtractorVideo from '../../../../../../../features/plugins/data/model/media/ExtractorVideo';
import MediaType from '../../../../../../../features/plugins/data/model/media/MediaType';
import RawAudio from '../../../../../../../features/plugins/data/model/media/RawAudio';
import RawVideo from '../../../../../../../features/plugins/data/model/media/RawVideo';
import {Extractor} from '../../../../domain/entities/Extractor';
import {ExtractorInfo} from '../../../../domain/entities/ExtractorInfo';
import axiosClient from '../../../../../../../core/utils/network/axios';

class NoodleMagazine implements Extractor {
  name = 'NoodleMagazine';

  execute = async (
    data: ExtractorVideo | ExtractorAudio,
  ): Promise<RawVideo[] | RawAudio[]> => {
    const sources: RawVideo[] = [];
    try {
      const {data: responseData} = await axiosClient.get(data.url, {
        headers: {
          Referer: data.url,
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 11; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
        },
      });

      // Try to extract window.playlist = {...};
      const body = responseData as string;
      const match = body.match(/window\.playlist\s*=\s*({[\s\S]*?});/);
      if (!match) throw new Error('playlist not found');

      const jsonText = match[1];
      const parsed = JSON.parse(jsonText);

      const qualities = parsed.sources || [];

      for (const q of qualities) {
        if (!q || !q.file) continue;
        sources.push({
          url: q.file,
          isM3U8: q.file.includes('.m3u8'),
          name: `${this.name} ${q.label ?? ''}`.trim(),
          type: MediaType.RawVideo,
        });
      }

      return sources;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };
}

class NoodleMagazineInfo implements ExtractorInfo {
  id: string = 'noodlemagazine';
  patterns: RegExp[] = [/noodlemagazine\./, /noodlemagazine\.com/];
  extractorMediaType: MediaType = MediaType.ExtractorVideo;
  extractors: Extractor[] = [new NoodleMagazine()];
}

export default NoodleMagazineInfo;
