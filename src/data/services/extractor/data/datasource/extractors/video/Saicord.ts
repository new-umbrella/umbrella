// Converted/adapted from: https://github.com/yogesh-hacker/MediaVanced/blob/main/sites/saicord.py
// Credit: https://github.com/yogesh-hacker

import {load} from 'cheerio';

import ExtractorAudio from '../../../../../../../features/plugins/data/model/media/ExtractorAudio';
import ExtractorVideo from '../../../../../../../features/plugins/data/model/media/ExtractorVideo';
import MediaType from '../../../../../../../features/plugins/data/model/media/MediaType';
import RawAudio from '../../../../../../../features/plugins/data/model/media/RawAudio';
import RawVideo from '../../../../../../../features/plugins/data/model/media/RawVideo';
import {Extractor} from '../../../../domain/entities/Extractor';
import {ExtractorInfo} from '../../../../domain/entities/ExtractorInfo';
import axiosClient from '../../../../../../../core/utils/network/axios';

class Saicord implements Extractor {
  name = 'saicord';

  execute = async (
    data: ExtractorVideo | ExtractorAudio,
  ): Promise<RawVideo[] | RawAudio[]> => {
    const sources: RawVideo[] = [];
    try {
      const options = {
        headers: {
          Referer: 'https://saicord.com/',
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
        },
      };

      const {data: responseData} = await axiosClient.get(data.url, options);
      const $ = load(responseData as string);

      // Find the player-iframe div and its scripts
      const iframeDiv = $('div.player-iframe').first();
      const scripts = iframeDiv.find('script');
      const scriptContent =
        scripts && scripts.length > 1 ? $(scripts[1]).html() || '' : '';

      const atobMatch = scriptContent.match(/atob\("([^"]+)"\)/);
      if (!atobMatch || !atobMatch[1])
        throw new Error('No encrypted data found');

      const encoded = atobMatch[1];
      const decoded = Buffer.from(encoded, 'base64').toString('utf8');

      const fileMatch =
        decoded.match(/file:"([^"]+)"/) || decoded.match(/file:'([^']+)'/);
      const videoUrl = fileMatch ? fileMatch[1] : '';
      if (!videoUrl) throw new Error('No video URL found in decoded data');

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

class SaicordInfo implements ExtractorInfo {
  id: string = 'saicord';
  patterns: RegExp[] = [/saicord\./];
  extractorMediaType: MediaType = MediaType.ExtractorVideo;
  extractors: Extractor[] = [new Saicord()];
}

export default SaicordInfo;
