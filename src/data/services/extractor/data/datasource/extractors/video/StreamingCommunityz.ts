// Converted/adapted from: https://github.com/yogesh-hacker/MediaVanced/blob/main/sites/streamingcommunityz.py
// Credit: https://github.com/yogesh-hacker

import ExtractorAudio from '../../../../../../../features/plugins/data/model/media/ExtractorAudio';
import ExtractorVideo from '../../../../../../../features/plugins/data/model/media/ExtractorVideo';
import MediaType from '../../../../../../../features/plugins/data/model/media/MediaType';
import RawAudio from '../../../../../../../features/plugins/data/model/media/RawAudio';
import RawVideo from '../../../../../../../features/plugins/data/model/media/RawVideo';
import {Extractor} from '../../../../domain/entities/Extractor';
import {ExtractorInfo} from '../../../../domain/entities/ExtractorInfo';
import axiosClient from '../../../../../../../core/utils/network/axios';
import {parseURL} from '../../../../../../../core/utils/urlUtils';

class StreamingCommunityz implements Extractor {
  name = 'streamingcommunityz';

  execute = async (
    data: ExtractorVideo | ExtractorAudio,
  ): Promise<RawVideo[] | RawAudio[]> => {
    const sources: RawVideo[] = [];
    try {
      const parsed = parseURL(data.url);
      const defaultDomain = `${parsed.protocol}//${parsed.hostname}/`;

      // If the original page uses "watch" replace with "iframe" as python script did
      const iframeUrl = data.url.includes('/watch/')
        ? data.url.replace('/watch/', '/iframe/')
        : data.url;

      const {data: iframePage} = await axiosClient.get(iframeUrl, {
        headers: {
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          Referer: defaultDomain,
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
        },
      });

      const body = iframePage as string;

      // Extract masterPlaylist JSON object from page e.g. window.masterPlaylist = {...}
      const match = body.match(
        /window\.masterPlaylist\s*=\s*({[\s\S]*?})\s*\n/,
      );
      if (!match) throw new Error('masterPlaylist not found');

      // Attempt to parse the JSON. pyjson5 allowed comments — attempt standard JSON first
      let playlistObj: any = null;
      try {
        playlistObj = JSON.parse(match[1]);
      } catch (e) {
        // Fallback: try to strip trailing commas and simple fixes
        const safe = match[1]
          .replace(/,(\s*[}\]])/g, '$1') // remove trailing commas
          .replace(/\bundefined\b/g, 'null');
        playlistObj = JSON.parse(safe);
      }

      const masterUrl: string = playlistObj.url;
      const params: Record<string, any> = playlistObj.params || {};

      // Merge existing query params from masterUrl with params from playlistObj
      const parsedMaster = new URL(masterUrl);
      const existing = Object.fromEntries(parsedMaster.searchParams.entries());

      const merged: Record<string, string> = {};
      for (const k of Object.keys(existing)) merged[k] = existing[k];
      for (const k of Object.keys(params)) {
        const v = params[k];
        merged[k] = Array.isArray(v) ? v[0] : String(v);
      }

      // enforce h=1 as in original script
      merged['h'] = '1';

      // Build new query string
      const searchParams = new URLSearchParams();
      for (const [k, v] of Object.entries(merged)) {
        if (v !== '' && v !== null && v !== undefined)
          searchParams.set(k, String(v));
      }

      const finalUrl =
        parsedMaster.origin +
        parsedMaster.pathname +
        '?' +
        searchParams.toString();

      sources.push({
        url: finalUrl,
        isM3U8: finalUrl.includes('.m3u8'),
        name: this.name,
        type: MediaType.RawVideo,
      });

      return sources;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };
}

class StreamingCommunityzInfo implements ExtractorInfo {
  id: string = 'streamingcommunityz';
  patterns: RegExp[] = [/streamingcommunityz\./, /vixcloud\./];
  extractorMediaType: MediaType = MediaType.ExtractorVideo;
  extractors: Extractor[] = [new StreamingCommunityz()];
}

export default StreamingCommunityzInfo;
