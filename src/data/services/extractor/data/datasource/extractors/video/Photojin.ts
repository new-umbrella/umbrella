// Converted/adapted from: https://github.com/yogesh-hacker/MediaVanced/blob/main/sites/photojin.py
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
import {parseURL} from '../../../../../../../core/utils/urlUtils';

class Photojin implements Extractor {
  name = 'Photojin';

  execute = async (
    data: ExtractorVideo | ExtractorAudio,
  ): Promise<RawVideo[] | RawAudio[]> => {
    const sources: RawVideo[] = [];
    try {
      const sessionResponse = await axiosClient.get(data.url, {
        maxRedirects: 5,
      });

      const parsed = parseURL(sessionResponse.request?.responseURL ?? data.url);
      const defaultDomain = `${parsed.protocol}//${parsed.hostname}`;

      const $ = load(sessionResponse.data as string);
      const dataField = $('#generate_url');
      const uid = dataField.attr('data-uid');
      const token = dataField.attr('data-token');
      if (!uid || !token) throw new Error('Required fields not found');

      const payload = {
        type: 'DOWNLOAD_GENERATE',
        payload: {
          uid: uid,
          access_token: token,
        },
      };

      const postRes = await axiosClient.post(
        `${defaultDomain}/action`,
        JSON.stringify(payload),
        {
          headers: {
            Referer: defaultDomain,
            'X-Requested-With': 'xmlhttprequest',
            'Content-Type': 'application/json',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
          },
        },
      );

      const videoUrl = postRes.data?.download_url;
      if (!videoUrl) throw new Error('download_url not found');

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

class PhotojinInfo implements ExtractorInfo {
  id: string = 'photojin';
  patterns: RegExp[] = [/photojin\./, /photojin\.cyou/];
  extractorMediaType: MediaType = MediaType.ExtractorVideo;
  extractors: Extractor[] = [new Photojin()];
}

export default PhotojinInfo;
