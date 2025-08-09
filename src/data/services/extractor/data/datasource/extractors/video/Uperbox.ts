// Converted/adapted from: https://github.com/yogesh-hacker/MediaVanced/blob/main/sites/uperbox.py
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

class Uperbox implements Extractor {
  name = 'uperbox';

  execute = async (
    data: ExtractorVideo | ExtractorAudio,
  ): Promise<RawVideo[] | RawAudio[]> => {
    const sources: RawVideo[] = [];
    try {
      const parsed = parseURL(data.url);
      const defaultDomain = `${parsed.protocol}//${parsed.hostname}`;

      const {data: pageHtml} = await axiosClient.get(data.url, {
        headers: {
          Referer: defaultDomain,
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
        },
      });

      const $ = load(pageHtml as string);
      const mainContainer = $('.main-container').first();
      if (!mainContainer || mainContainer.length === 0)
        throw new Error('Main container not found');

      const nextAnchor = mainContainer.find('a.btn').first();
      const nextHref = nextAnchor.attr('href');
      if (!nextHref) throw new Error('Next page link not found');

      const nextUrl = resolveURL(nextHref, data.url);
      const {data: nextHtml} = await axiosClient.get(nextUrl, {
        headers: {
          Referer: data.url,
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
        },
      });

      const $$ = load(nextHtml as string);
      const downloadLink = $$('a')
        .filter((i, el) => {
          const text = $$(el).text() || '';
          return /Start Download/i.test(text);
        })
        .first();

      const downloadHref = downloadLink.attr('href');
      if (!downloadHref) throw new Error('Download link not found');

      const videoUrl = resolveURL(downloadHref, defaultDomain);

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

class UperboxInfo implements ExtractorInfo {
  id: string = 'uperbox';
  patterns: RegExp[] = [/uperbox\./, /uperbox\.net/];
  extractorMediaType: MediaType = MediaType.ExtractorVideo;
  extractors: Extractor[] = [new Uperbox()];
}

export default UperboxInfo;
