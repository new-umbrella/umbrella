// Converted/adapted from: https://github.com/yogesh-hacker/MediaVanced/blob/main/sites/multiquality.py
// Credit: https://github.com/yogesh-hacker

import ExtractorAudio from '../../../../../../../features/plugins/data/model/media/ExtractorAudio';
import ExtractorVideo from '../../../../../../../features/plugins/data/model/media/ExtractorVideo';
import MediaType from '../../../../../../../features/plugins/data/model/media/MediaType';
import RawAudio from '../../../../../../../features/plugins/data/model/media/RawAudio';
import RawVideo from '../../../../../../../features/plugins/data/model/media/RawVideo';
import {Extractor} from '../../../../domain/entities/Extractor';
import {ExtractorInfo} from '../../../../domain/entities/ExtractorInfo';
import axiosClient from '../../../../../../../core/utils/network/axios';

class MultiQuality implements Extractor {
  name = 'MultiQuality';

  private rot13 = (s: string) =>
    s.replace(/[a-zA-Z]/g, c =>
      String.fromCharCode(
        c <= 'Z'
          ? ((c.charCodeAt(0) - 65 + 13) % 26) + 65
          : ((c.charCodeAt(0) - 97 + 13) % 26) + 97,
      ),
    );

  execute = async (
    data: ExtractorVideo | ExtractorAudio,
  ): Promise<RawVideo[] | RawAudio[]> => {
    const sources: RawVideo[] = [];
    try {
      const {data: responseData} = await axiosClient.get(data.url, {
        headers: {
          Referer: 'https://swift.multiquality.click',
          Connection: 'keep-alive',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
        },
      });

      const body = responseData as string;

      // Try to extract the juicycodes(...) argument like the original script
      const match = body.match(/_juicycodes\(\s*([^\)]+)/i);
      let codeRaw = '';
      if (match && match[1]) {
        // The original python eval() produced the code string; try to sanitize quotes
        codeRaw = match[1].trim();
        // Remove starting quote if present
        if (
          (codeRaw.startsWith("'") && codeRaw.endsWith("'")) ||
          (codeRaw.startsWith('"') && codeRaw.endsWith('"'))
        ) {
          codeRaw = codeRaw.slice(1, -1);
        }
      } else {
        // fallback: attempt to find an encoded payload (base64-like)
        const alt = body.match(/(['"])([A-Za-z0-9_\-]{40,}={0,3})\1/);
        codeRaw = alt ? alt[2] : '';
      }

      if (!codeRaw) throw new Error('Packed code not found');

      // The original flow: code -> eval -> split salt and encoded_js
      // We attempt to replicate the decode steps from the python script
      // Last 3 chars are used to compute salt in original; emulate that:
      const last3 = codeRaw.slice(-3);
      const encoded_js = codeRaw.slice(0, -3);

      // Build padding for base64
      let padded = encoded_js;
      const paddingLen = (padded.length + 3) % 4;
      if (paddingLen !== 0) {
        padded += '='.repeat(4 - paddingLen);
      }
      // Replace _ -> + and - -> / as in original
      padded = padded.replace(/_/g, '+').replace(/-/g, '/');

      // Base64 decode
      const b64decoded = Buffer.from(padded, 'base64').toString('utf8');
      // ROT13 as original then further processing
      const rotDecoded = this.rot13(b64decoded);

      // Original script maps symbols to indexes and then decodes; attempt to extract "file":"...m3u8"
      let decrypted = rotDecoded;
      // sanitize escaped slashes
      decrypted = decrypted.replace(/\\\//g, '/');

      const fileMatch = decrypted.match(/"file":"(https?:\/\/[^"]+\.m3u8)"/);
      const videoUrl = fileMatch ? fileMatch[1] : '';
      if (!videoUrl) throw new Error('Video URL not found after decoding');

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

class MultiQualityInfo implements ExtractorInfo {
  id: string = 'multiquality';
  patterns: RegExp[] = [/multiquality\./, /swift\.multiquality\.click/];
  extractorMediaType: MediaType = MediaType.ExtractorVideo;
  extractors: Extractor[] = [new MultiQuality()];
}

export default MultiQualityInfo;
