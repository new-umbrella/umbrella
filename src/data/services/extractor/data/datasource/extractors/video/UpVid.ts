// Converted/adapted from: https://github.com/yogesh-hacker/MediaVanced/blob/main/sites/upvid.py
// Credit: https://github.com/yogesh-hacker
// Note: best-effort conversion using crypto-js for ARC4 (RC4)

import {type CheerioAPI, load} from 'cheerio';
import CryptoJS from 'crypto-js';

import ExtractorAudio from '../../../../../../../features/plugins/data/model/media/ExtractorAudio';
import ExtractorVideo from '../../../../../../../features/plugins/data/model/media/ExtractorVideo';
import MediaType from '../../../../../../../features/plugins/data/model/media/MediaType';
import RawAudio from '../../../../../../../features/plugins/data/model/media/RawAudio';
import RawVideo from '../../../../../../../features/plugins/data/model/media/RawVideo';
import {Extractor} from '../../../../domain/entities/Extractor';
import {ExtractorInfo} from '../../../../domain/entities/ExtractorInfo';
import axiosClient from '../../../../../../../core/utils/network/axios';

class UpVid implements Extractor {
  name = 'upvid';

  execute = async (
    data: ExtractorVideo | ExtractorAudio,
  ): Promise<RawVideo[] | RawAudio[]> => {
    const sources: RawVideo[] = [];
    try {
      const {data: pageHtml} = await axiosClient.get(data.url, {
        headers: {
          Referer: data.url,
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
        },
      });

      const $ = load(pageHtml as string);

      // Encrypted data is in input#func
      const encryptedVal =
        $('input#func').attr('value') ?? $('input#func').val() ?? '';
      if (!encryptedVal) throw new Error('Encrypted payload not found');

      // Try to locate the obfuscated JS that contains the RC4 key
      const scripts = $('script')
        .toArray()
        .map(s => $(s).html())
        .filter(Boolean) as string[];

      // Heuristic: find script containing unusual characters used in original (e.g., ﾟωﾟﾉ)
      const specialScript =
        scripts.find(s => s.includes('ﾟωﾟﾉ')) ??
        scripts.find(s => s.includes('ﾟ') || s.includes('＿'));

      let key = '';
      if (specialScript) {
        // try to find a quoted key inside the script using same regex as original
        const m =
          specialScript.match(/=\s*\w+\('([^']+)'\)/i) ||
          specialScript.match(/=\s*\w+\("([^"]+)"\)/i);
        if (m && m[1]) key = m[1];
      }

      // fallback: try to find any key pattern in all scripts
      if (!key) {
        for (const s of scripts) {
          const m =
            s.match(/=\s*\w+\('([^']+)'\)/) ||
            s.match(/key\s*[:=]\s*'([^']+)'/) ||
            s.match(/key\s*[:=]\s*"([^"]+)"/);
          if (m && m[1]) {
            key = m[1];
            break;
          }
        }
      }

      if (!key) {
        // best-effort: sometimes key is present as ascii string in page
        const anyKey = pageHtml.toString().match(/'([A-Za-z0-9]{6,36})'/);
        key = anyKey?.[1] ?? '';
      }

      if (!key) throw new Error('RC4 key not found (best-effort failed)');

      // Decode base64 encrypted payload to word array
      const cipherParams = CryptoJS.lib.CipherParams.create({
        ciphertext: CryptoJS.enc.Base64.parse(encryptedVal as string),
      });

      // Attempt RC4 decrypt using crypto-js
      // Note: CryptoJS.RC4 may not be available in all builds; this is best-effort.
      let decrypted = '';
      try {
        // @ts-ignore - some builds expose RC4
        decrypted = CryptoJS.RC4.decrypt(
          cipherParams,
          CryptoJS.enc.Utf8.parse(key),
        ).toString(CryptoJS.enc.Utf8);
      } catch (e) {
        // fallback: try treating ciphertext as hex and run RC4 algorithm manually (best-effort)
        try {
          const ctHex = CryptoJS.enc.Base64.parse(
            encryptedVal as string,
          ).toString(CryptoJS.enc.Hex);
          // simple RC4 implementation using CryptoJS.algo.RC4 (if available)
          // @ts-ignore
          if (CryptoJS.algo.RC4) {
            // @ts-ignore
            const rc4 = CryptoJS.algo.RC4.createEncryptor(
              CryptoJS.enc.Utf8.parse(key),
            );
            // decrypt by encrypting ciphertext then converting
            const ctWords = CryptoJS.enc.Hex.parse(ctHex);
            const res = rc4.process(ctWords) as any;
            decrypted = res.toString(CryptoJS.enc.Utf8);
          }
        } catch (e2) {
          // give up; will throw below
        }
      }

      if (!decrypted) throw new Error('RC4 decryption failed (best-effort)');

      // Extract src from decrypted JS
      const srcMatch =
        decrypted.match(/'src'\s*,\s*'([^']+)'/) ||
        decrypted.match(/src:\s*'([^']+)'/) ||
        decrypted.match(/src:\s*"([^"]+)"/);
      const videoUrl = srcMatch?.[1] ?? '';
      if (!videoUrl)
        throw new Error('Video src not found in decrypted payload');

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

class UpVidInfo implements ExtractorInfo {
  id: string = 'upvid';
  patterns: RegExp[] = [/tatavid\./, /tatavid\.com/];
  extractorMediaType: MediaType = MediaType.ExtractorVideo;
  extractors: Extractor[] = [new UpVid()];
}

export default UpVidInfo;
