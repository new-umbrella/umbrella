// Converted/adapted from: https://github.com/yogesh-hacker/MediaVanced/blob/main/sites/megacloud.py
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

class Megacloud implements Extractor {
  name = 'Megacloud';

  private readonly decodeEndpoint =
    'https://script.google.com/macros/s/AKfycbxHbYHbrGMXYD2-bC-C43D3njIbU-wGiYQuJL61H4vyy6YVXkybMNNEPJNPPuZrD1gRVA/exec';
  private readonly keyUrl =
    'https://raw.githubusercontent.com/yogesh-hacker/MegacloudKeys/refs/heads/main/keys.json';

  execute = async (
    data: ExtractorVideo | ExtractorAudio,
  ): Promise<RawVideo[] | RawAudio[]> => {
    const sources: RawVideo[] = [];

    try {
      const options = {
        headers: {
          Accept: '*/*',
          'X-Requested-With': 'XMLHttpRequest',
          Referer: data.url,
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
        },
      };

      // Fetch page and parse file id
      const pageResponse = await axiosClient.get(data.url, options);
      const $ = load(pageResponse.data as string);
      const player =
        $('#megacloud-player').attr('data-id') ||
        $('#megacloud-player').attr('data-file') ||
        '';
      if (!player)
        throw new Error('Looks like URL expired or player not found');
      const fileId = player;

      // Try to extract nonce from raw HTML as in original implementation
      const rawHtml = pageResponse.data as string;
      let nonce: string | null = null;
      const match48 = rawHtml.match(/\b[a-zA-Z0-9]{48}\b/);
      if (match48) {
        nonce = match48[0];
      } else {
        const grp = rawHtml.match(
          /([a-zA-Z0-9]{16}).*?([a-zA-Z0-9]{16}).*?([a-zA-Z0-9]{16})/s,
        );
        if (grp && grp.length === 4) {
          nonce = grp[1] + grp[2] + grp[3];
        }
      }

      // Build request to get sources
      const parsed = parseURL(data.url);
      const domain = `${parsed.protocol}//${parsed.hostname}`;
      const getSourcesUrl = `${domain}/embed-2/v3/e-1/getSources?id=${encodeURIComponent(
        fileId,
      )}${nonce ? `&_k=${encodeURIComponent(nonce)}` : ''}`;

      const sourcesRes = await axiosClient.get(getSourcesUrl, options);
      const payload = sourcesRes.data;

      // payload.sources can be encrypted (string) or array/object
      let videoUrl = '';
      if (payload && typeof payload.sources === 'string') {
        // Use remote decode endpoint (server-side decode used in original) to avoid client-side crypto differences
        const encrypted = encodeURIComponent(payload.sources);
        const nonceParam = nonce ? encodeURIComponent(nonce) : '';
        // Attempt to fetch the secret key from the known keys.json (best-effort)
        let secret = '';
        try {
          const keyRes = await axiosClient.get(this.keyUrl);
          secret = keyRes.data?.mega ?? '';
        } catch (e) {
          // ignore - falling back to decode endpoint without secret may still work depending on implementation
        }

        const decodeUrl = `${
          this.decodeEndpoint
        }?encrypted_data=${encrypted}&nonce=${nonceParam}&secret=${encodeURIComponent(
          secret,
        )}`;

        const decoded = await axiosClient
          .get(decodeUrl, options)
          .catch(() => null);
        const decodedText = decoded?.data ?? '';
        const fileMatch = (decodedText as string).match(/"file":"(.*?)"/);
        if (fileMatch && fileMatch[1]) {
          videoUrl = fileMatch[1];
        }
      } else if (payload && Array.isArray(payload.sources)) {
        videoUrl = payload.sources[0]?.file ?? '';
      } else if (payload && payload.sources && payload.sources.file) {
        // Sometimes structure is object with file field
        videoUrl = payload.sources.file;
      } else {
        // fallback: attempt to parse any file: "..." occurrences in the raw JSON/string
        const raw = JSON.stringify(payload || '');
        const fallbackMatch = raw.match(/"file":"(.*?)"/);
        if (fallbackMatch) videoUrl = fallbackMatch[1];
      }

      if (!videoUrl) throw new Error('Could not extract video URL');

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

class MegacloudInfo implements ExtractorInfo {
  id: string = 'megacloud';
  patterns: RegExp[] = [/megacloud\./, /megacloud\.blog/];
  extractorMediaType: MediaType = MediaType.ExtractorVideo;
  extractors: Extractor[] = [new Megacloud()];
}

export default MegacloudInfo;
