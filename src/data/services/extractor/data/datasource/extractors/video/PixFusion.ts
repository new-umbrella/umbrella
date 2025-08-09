// Converted/adapted from: https://github.com/yogesh-hacker/MediaVanced/blob/main/sites/pixfusion.py
// Credit: https://github.com/yogesh-hacker

import ExtractorAudio from '../../../../../../../features/plugins/data/model/media/ExtractorAudio';
import ExtractorVideo from '../../../../../../../features/plugins/data/model/media/ExtractorVideo';
import MediaType from '../../../../../../../features/plugins/data/model/media/MediaType';
import RawAudio from '../../../../../../../features/plugins/data/model/media/RawAudio';
import RawVideo from '../../../../../../../features/plugins/data/model/media/RawVideo';
import {Extractor} from '../../../../domain/entities/Extractor';
import {ExtractorInfo} from '../../../../domain/entities/ExtractorInfo';
import axiosClient from '../../../../../../../core/utils/network/axios';
import {safeUnpack} from '../../../../../../../core/utils/jsUnpacker';

class PixFusion implements Extractor {
  name = 'PixFusion';

  execute = async (
    data: ExtractorVideo | ExtractorAudio,
  ): Promise<RawVideo[] | RawAudio[]> => {
    const sources: RawVideo[] = [];
    try {
      const {data: responseData} = await axiosClient.get(data.url, {
        headers: {
          Referer: data.url,
          'X-Requested-With': 'XMLHttpRequest',
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
        },
      });

      const body = responseData as string;
      const pattern = /eval\(function\((.*?)\)\{.*\}\((.*?)\)\)/s;
      const m = body.match(pattern);
      if (!m) throw new Error('Packed data not found');

      let dataString = m[2].replace(".split('|')", '').replace(/\\n/g, '');
      // Try to evaluate literal list via JS-style parsing
      try {
        // safeUnpack expects the packed code already; reuse it
        const unpacked = safeUnpack(dataString);
        const decoded = unpacked.replace(/\\/g, '');
        const vidMatch = decoded.match(/FirePlayer\(\"(.*?)\"/);
        const videoId = vidMatch ? vidMatch[1] : null;
        if (!videoId) throw new Error('video id not found');

        // Build POST to fetch video source as original did
        const urlObj = new URL(data.url);
        const domain = `${urlObj.protocol}//${urlObj.hostname}`;
        const res = await axiosClient.post(
          `${domain}/player/index.php?data=${encodeURIComponent(
            videoId,
          )}&do=getVideo`,
          undefined,
          {
            headers: {
              Referer: data.url,
              'X-Requested-With': 'XMLHttpRequest',
              'User-Agent':
                'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
            },
          },
        );

        const videoUrl = res.data?.videoSource;
        if (!videoUrl) throw new Error('videoSource not found');

        sources.push({
          url: videoUrl,
          isM3U8: videoUrl.includes('.m3u8'),
          name: this.name,
          type: MediaType.RawVideo,
        });
      } catch (e) {
        throw new Error('Failed to unpack or fetch video source');
      }

      return sources;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };
}

class PixFusionInfo implements ExtractorInfo {
  id: string = 'pixfusion';
  patterns: RegExp[] = [/pixfusion\./, /x\.pixfusion\.in/];
  extractorMediaType: MediaType = MediaType.ExtractorVideo;
  extractors: Extractor[] = [new PixFusion()];
}

export default PixFusionInfo;
