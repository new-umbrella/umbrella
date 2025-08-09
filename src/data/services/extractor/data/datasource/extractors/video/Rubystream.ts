// Converted/adapted from: https://github.com/yogesh-hacker/MediaVanced/blob/main/sites/rubystream.py
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
import {safeUnpack} from '../../../../../../../core/utils/jsUnpacker';
import {parseURL} from '../../../../../../../core/utils/urlUtils';

class Rubystream implements Extractor {
  name = 'rubystream';

  execute = async (
    data: ExtractorVideo | ExtractorAudio,
  ): Promise<RawVideo[] | RawAudio[]> => {
    const sources: RawVideo[] = [];
    try {
      const videoUrl = parseURL(data.url);
      const defaultDomain = `${videoUrl.protocol}//${videoUrl.hostname}`;
      const headers = {
        Referer: defaultDomain,
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
      };

      // initial GET to obtain form values
      const {data: pageHtml} = await axiosClient.get(data.url, {headers});
      const $ = load(pageHtml as string);

      // collect form inputs from form#F1
      const form = $('form#F1').first();
      const formData: Record<string, string> = {};
      form.find('input').each((i, el) => {
        const name = $(el).attr('name');
        const value = $(el).attr('value') ?? '';
        if (name) formData[name] = value;
      });

      formData['file_code'] = data.url.split('/').pop() ?? '';
      formData['referer'] = defaultDomain;

      // submit form (application/x-www-form-urlencoded)
      const params = new URLSearchParams(formData).toString();
      const {data: dlResponse} = await axiosClient.post(
        `${defaultDomain}/dl`,
        params,
        {
          headers: {
            ...headers,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const body = dlResponse as string;
      // Packed data pattern
      const pattern = /eval\(function\((.*?)\)\{.*\}\((.*?\))\)\)/s;
      const match = body.match(pattern);
      if (!match) throw new Error('Packed data not found');

      let dataString = match[2].replace(".split('|')", '');
      // Try to safely unpack using existing helper
      const unpacked = safeUnpack(dataString);
      const decoded = unpacked.replace(/\\/g, '');
      const fileMatch =
        decoded.match(/file:\"(.*?)\"/) || decoded.match(/file:"(.*?)"/);
      const videoSrc = fileMatch ? fileMatch[1] : '';
      if (!videoSrc) throw new Error('Video URL not found');

      sources.push({
        url: videoSrc,
        isM3U8: videoSrc.includes('.m3u8'),
        name: this.name,
        type: MediaType.RawVideo,
      });

      return sources;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };
}

class RubystreamInfo implements ExtractorInfo {
  id: string = 'rubystream';
  patterns: RegExp[] = [/rubystm\./, /rubystream\./];
  extractorMediaType: MediaType = MediaType.ExtractorVideo;
  extractors: Extractor[] = [new Rubystream()];
}

export default RubystreamInfo;
