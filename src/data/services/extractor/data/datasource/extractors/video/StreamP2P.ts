// Converted/adapted from: https://github.com/yogesh-hacker/MediaVanced/blob/main/sites/streamp2p.py
// Credit: https://github.com/yogesh-hacker

import CryptoJS from 'crypto-js';

import ExtractorAudio from '../../../../../../../features/plugins/data/model/media/ExtractorAudio';
import ExtractorVideo from '../../../../../../../features/plugins/data/model/media/ExtractorVideo';
import MediaType from '../../../../../../../features/plugins/data/model/media/MediaType';
import RawAudio from '../../../../../../../features/plugins/data/model/media/RawAudio';
import RawVideo from '../../../../../../../features/plugins/data/model/media/RawVideo';
import {Extractor} from '../../../../domain/entities/Extractor';
import {ExtractorInfo} from '../../../../domain/entities/ExtractorInfo';
import axiosClient from '../../../../../../../core/utils/network/axios';
import {parseURL} from '../../../../../../../core/utils/urlUtils';

class StreamP2P implements Extractor {
  name = 'streamp2p';

  execute = async (
    data: ExtractorVideo | ExtractorAudio,
  ): Promise<RawVideo[] | RawAudio[]> => {
    const sources: RawVideo[] = [];
    try {
      const parsed = parseURL(data.url);
      const domain = `${parsed.protocol}//${parsed.hostname}`;
      const videoId = data.url.split('#').pop() ?? '';
      if (!videoId) throw new Error('No video id found in URL');

      const apiUrl = `${domain}/api/v1/video?id=${encodeURIComponent(videoId)}`;
      const {data: encryptedHex} = await axiosClient.get(apiUrl, {
        headers: {
          Referer: domain + '/',
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36',
        },
        responseType: 'text',
      });

      if (!encryptedHex || typeof encryptedHex !== 'string') {
        throw new Error('No encrypted data returned');
      }

      // The original uses AES-CBC with a fixed password and iv:
      const password = 'kiemtienmua911ca';
      const ivStr = '1234567890oiuytr';

      // Convert hex ciphertext to CryptoJS format
      const cipherParams = CryptoJS.lib.CipherParams.create({
        ciphertext: CryptoJS.enc.Hex.parse(encryptedHex.trim()),
      });

      const key = CryptoJS.enc.Utf8.parse(password);
      const iv = CryptoJS.enc.Utf8.parse(ivStr);

      const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
        iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      }).toString(CryptoJS.enc.Utf8);

      if (!decrypted) throw new Error('Failed to decrypt response');

      const json = JSON.parse(decrypted);
      const videoUrl = json?.source ?? json?.file ?? '';
      if (!videoUrl) throw new Error('No video URL found in decrypted data');

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

class StreamP2PInfo implements ExtractorInfo {
  id: string = 'streamp2p';
  patterns: RegExp[] = [/p2pplay\.pro/, /multimovies\.p2pplay\.pro/];
  extractorMediaType: MediaType = MediaType.ExtractorVideo;
  extractors: Extractor[] = [new StreamP2P()];
}

export default StreamP2PInfo;
