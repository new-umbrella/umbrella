// Converted/adapted from: https://github.com/yogesh-hacker/MediaVanced/blob/main/sites/send.py
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

class SendCm implements Extractor {
  name = 'send';

  execute = async (
    data: ExtractorVideo | ExtractorAudio,
  ): Promise<RawVideo[] | RawAudio[]> => {
    const sources: RawVideo[] = [];
    try {
      const parsed = parseURL(data.url);
      const defaultDomain = `${parsed.protocol}//${parsed.hostname}/`;

      const {data: pageHtml} = await axiosClient.get(data.url, {
        headers: {
          Referer: defaultDomain,
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
        },
      });

      const $ = load(pageHtml as string);
      const form = $('form[name="F1"]').first();
      if (!form || form.length === 0) throw new Error('Form F1 not found');

      const payload: Record<string, string> = {};
      form.find('input[name]').each((_, el) => {
        const name = $(el).attr('name');
        const value = $(el).attr('value') ?? '';
        if (name) payload[name] = value;
      });

      const params = new URLSearchParams(payload).toString();

      const postRes = await axiosClient.post(defaultDomain, params, {
        headers: {
          Referer: defaultDomain,
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        // Don't follow redirects — we need the Location header
        maxRedirects: 0,
        validateStatus: () => true,
      });

      const location =
        (postRes as any).headers?.location ||
        (postRes as any).headers?.Location;
      if (!location) throw new Error('Redirect location not found');

      sources.push({
        url: location,
        isM3U8: location.includes('.m3u8'),
        name: this.name,
        type: MediaType.RawVideo,
      });

      return sources;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };
}

class SendInfo implements ExtractorInfo {
  id: string = 'send';
  patterns: RegExp[] = [/send\.cm/, /send\.now/];
  extractorMediaType: MediaType = MediaType.ExtractorVideo;
  extractors: Extractor[] = [new SendCm()];
}

export default SendInfo;
