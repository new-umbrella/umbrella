// Converted/adapted from: https://github.com/yogesh-hacker/MediaVanced/blob/main/sites/vcdnlare.py

import {load} from 'cheerio';

import ExtractorAudio from '../../../../../../../features/plugins/data/model/media/ExtractorAudio';
import ExtractorVideo from '../../../../../../../features/plugins/data/model/media/ExtractorVideo';
import MediaType from '../../../../../../../features/plugins/data/model/media/MediaType';
import RawAudio from '../../../../../../../features/plugins/data/model/media/RawAudio';
import RawVideo from '../../../../../../../features/plugins/data/model/media/RawVideo';
import {Extractor} from '../../../../domain/entities/Extractor';
import {ExtractorInfo} from '../../../../domain/entities/ExtractorInfo';
import axiosClient from '../../../../../../../core/utils/network/axios';

class Vcdnlare implements Extractor {
  name = 'Vcdnlare';

  execute = async (
    data: ExtractorVideo | ExtractorAudio,
  ): Promise<RawVideo[] | RawAudio[]> => {
    const sources: RawVideo[] = [];
    try {
      const options = {
        headers: {
          Referer: data.url,
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
        },
      };

      const {data: responseData} = await axiosClient.get(data.url, options);
      const $ = load(responseData);
      const source = $('source').attr('src') || $('video source').attr('src');
      if (!source) throw new Error('No source found');

      sources.push({
        url: source,
        isM3U8: source.includes('.m3u8'),
        name: this.name,
        type: MediaType.RawVideo,
      });

      return sources;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };
}

class VcdnlareInfo implements ExtractorInfo {
  id: string = 'vcdnlare';
  patterns: RegExp[] = [/vcdnlare\./];
  extractorMediaType: MediaType = MediaType.ExtractorVideo;
  extractors: Extractor[] = [new Vcdnlare()];
}

export default VcdnlareInfo;
