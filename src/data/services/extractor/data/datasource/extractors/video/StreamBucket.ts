// Converted/adapted from: https://github.com/yogesh-hacker/MediaVanced/blob/main/sites/streambucket.py
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

class StreamBucket implements Extractor {
  name = 'streambucket';

  execute = async (
    data: ExtractorVideo | ExtractorAudio,
  ): Promise<RawVideo[] | RawAudio[]> => {
    const sources: RawVideo[] = [];
    try {
      const {data: responseData} = await axiosClient.get(data.url, {
        headers: {
          Referer: data.url,
        },
      });
      const body = responseData as string;

      // Find packed hunter-like data and attempt to decode using safeUnpack or fallback
      const pattern =
        /\(\s*function\s*\([^\)]*\)\s*\{.*?\}\s*\(\s*(.*?)\s*\)\s*\)/s;
      const m = body.match(pattern);
      if (!m) throw new Error('Encoded pack not found');

      let pack = m[1];
      // naive attempt to parse JS array literal content
      pack = pack.replace(/\.split\('\|'\)/g, '');
      const unpacked = safeUnpack(pack);
      const decoded = unpacked.replace(/\\/g, '');
      const fileMatch =
        decoded.match(/file:"(https?:\/\/[^"]+)"/) ||
        decoded.match(/file:'(https?:\/\/[^']+)'/);
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

class StreamBucketInfo implements ExtractorInfo {
  id: string = 'streambucket';
  patterns: RegExp[] = [/streambucket\./, /multiembed\.mov/];
  extractorMediaType: MediaType = MediaType.ExtractorVideo;
  extractors: Extractor[] = [new StreamBucket()];
}

export default StreamBucketInfo;
