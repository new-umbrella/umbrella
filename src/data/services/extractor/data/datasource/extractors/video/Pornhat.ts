// Converted/adapted from: https://github.com/yogesh-hacker/MediaVanced/blob/main/sites/pornhat.py
// Credit: https://github.com/yogesh-hacker
// Note: 18+ content extractor

import {load} from 'cheerio';

import ExtractorAudio from '../../../../../../../features/plugins/data/model/media/ExtractorAudio';
import ExtractorVideo from '../../../../../../../features/plugins/data/model/media/ExtractorVideo';
import MediaType from '../../../../../../../features/plugins/data/model/media/MediaType';
import RawAudio from '../../../../../../../features/plugins/data/model/media/RawAudio';
import RawVideo from '../../../../../../../features/plugins/data/model/media/RawVideo';
import {Extractor} from '../../../../domain/entities/Extractor';
import {ExtractorInfo} from '../../../../domain/entities/ExtractorInfo';
import axiosClient from '../../../../../../../core/utils/network/axios';

class Pornhat implements Extractor {
  name = 'pornhat';

  execute = async (
    data: ExtractorVideo | ExtractorAudio,
  ): Promise<RawVideo[] | RawAudio[]> => {
    const sources: RawVideo[] = [];
    try {
      const {data: responseData} = await axiosClient.get(data.url, {
        headers: {
          Referer: data.url,
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
        },
      });

      const $ = load(responseData as string);

      // Try to find element with class 'video_720p' and label attribute '720p'
      const el = $('.video_720p[label="720p"]').first();
      const src =
        el.attr('src') ||
        $('.video_720p').attr('src') ||
        $('video source[label="720p"]').attr('src') ||
        '';

      if (!src) throw new Error('Video source not found');

      sources.push({
        url: src,
        isM3U8: src.includes('.m3u8'),
        name: this.name,
        type: MediaType.RawVideo,
      });

      return sources;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };
}

class PornhatInfo implements ExtractorInfo {
  id: string = 'pornhat';
  patterns: RegExp[] = [/pornhat\./, /pornhat\.com/];
  extractorMediaType: MediaType = MediaType.ExtractorVideo;
  extractors: Extractor[] = [new Pornhat()];
}

export default PornhatInfo;
