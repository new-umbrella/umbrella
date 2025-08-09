// Converted/adapted from: https://github.com/yogesh-hacker/MediaVanced/blob/main/sites/vidsrc.py
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
import {parseURL, resolveURL} from '../../../../../../../core/utils/urlUtils';

class VidSrc implements Extractor {
  name = 'vidsrc';

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
            'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
        },
      });

      const $ = load(pageHtml as string);
      let iframe = $('#player_iframe').attr('src');
      if (!iframe) {
        // try .xyz fallback
        const altUrl = data.url.replace('.to', '.xyz');
        const {data: altHtml} = await axiosClient.get(altUrl, {
          headers: {Referer: defaultDomain},
        });
        const $$ = load(altHtml as string);
        const altIframe = $$(`#player_iframe`).attr('src');
        iframe = altIframe ? `https:${altIframe}` : undefined;
      } else {
        iframe = `https:${iframe}`;
      }

      if (!iframe) throw new Error('Player iframe not found');

      const {data: iframeHtml} = await axiosClient.get(iframe, {
        headers: {
          Referer: defaultDomain,
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
        },
      });

      // find prorcp iframe src in iframe HTML
      const prorcpMatch = (iframeHtml as string).match(/src:\s*'(.*?)'/);
      const prorcpPath = prorcpMatch ? prorcpMatch[1] : null;
      if (!prorcpPath) throw new Error('Prorcp iframe not found');

      const iframeBase = new URL(iframe).origin + '/';
      const finalIframe = resolveURL(prorcpPath, iframeBase);

      const {data: finalHtml} = await axiosClient.get(finalIframe, {
        headers: {
          Referer: iframe,
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
        },
      });

      // extract file: '...' pattern
      const fileMatch = (finalHtml as string).match(/file:\s*['"](.*?)['"]/);
      const videoUrl = fileMatch ? fileMatch[1] : '';
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

class VidSrcInfo implements ExtractorInfo {
  id: string = 'vidsrc';
  patterns: RegExp[] = [/vidsrc\./, /vidsrc\.to/, /vidsrc\.xyz/];
  extractorMediaType: MediaType = MediaType.ExtractorVideo;
  extractors: Extractor[] = [new VidSrc()];
}

export default VidSrcInfo;
