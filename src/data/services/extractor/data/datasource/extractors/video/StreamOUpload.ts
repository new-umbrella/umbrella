// Converted/adapted from: https://github.com/yogesh-hacker/MediaVanced/blob/main/sites/streamoupload.py
// Credit: https://github.com/yogesh-hacker

import {type CheerioAPI, load} from 'cheerio';

import ExtractorAudio from '../../../../../../../features/plugins/data/model/media/ExtractorAudio';
import ExtractorVideo from '../../../../../../../features/plugins/data/model/media/ExtractorVideo';
import MediaType from '../../../../../../../features/plugins/data/model/media/MediaType';
import RawAudio from '../../../../../../../features/plugins/data/model/media/RawAudio';
import RawVideo from '../../../../../../../features/plugins/data/model/media/RawVideo';
import {Extractor} from '../../../../domain/entities/Extractor';
import {ExtractorInfo} from '../../../../domain/entities/ExtractorInfo';
import axiosClient from '../../../../../../../core/utils/network/axios';
import {safeUnpack} from '../../../../../../../core/utils/jsUnpacker';

class StreamOUpload implements Extractor {
  name = 'streamoupload';

  private toBase36(n: number): string {
    const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
    if (n === 0) return '0';
    let out = '';
    while (n > 0) {
      out = chars[n % 36] + out;
      n = Math.floor(n / 36);
    }
    return out;
  }

  execute = async (
    data: ExtractorVideo | ExtractorAudio,
  ): Promise<RawVideo[] | RawAudio[]> => {
    const sources: RawVideo[] = [];
    try {
      const {data: responseData} = await axiosClient.get(data.url, {
        headers: {
          Referer: data.url,
          'User-Agent':
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
      });

      const $ = load(responseData as string);
      const jsCode = $('script')
        .toArray()
        .map(el => $(el).html())
        .find(s => s && s.includes('eval(function(p,a,c,k,e,d)'));

      if (!jsCode) throw new Error('Packed JavaScript not found');

      // Extract packed argument string similar to python approach
      const encodedMatch = jsCode.match(
        /eval\(function\([^\)]*\)\{[^\}]*\}\(([\s\S]*?)\)\)/,
      );
      if (!encodedMatch) throw new Error('Packed payload not found');

      let payload = encodedMatch[1];
      // Clean obvious wrappers
      payload = payload.replace(/\.split\('\|'\)/g, '');
      // Try safeUnpack (project helper) which mirrors the original JS unpacker behavior
      const unpacked = safeUnpack(payload);
      const decoded = unpacked.replace(/\\/g, '');

      const fileMatch =
        decoded.match(/file:"([^"]+)"/) || decoded.match(/file:'([^']+)'/);
      const videoUrl = fileMatch ? fileMatch[1] : '';
      if (!videoUrl) throw new Error('Video url not found after unpacking');

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

class StreamOUploadInfo implements ExtractorInfo {
  id: string = 'streamoupload';
  patterns: RegExp[] = [/streamoupload\./];
  extractorMediaType: MediaType = MediaType.ExtractorVideo;
  extractors: Extractor[] = [new StreamOUpload()];
}

export default StreamOUploadInfo;
