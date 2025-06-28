import {AxiosResponse} from 'axios';
import axiosClient from '../../../../../../../core/utils/network/axios';
import ExtractorAudio from '../../../../../../../features/plugins/data/model/media/ExtractorAudio';
import ExtractorVideo from '../../../../../../../features/plugins/data/model/media/ExtractorVideo';
import MediaType from '../../../../../../../features/plugins/data/model/media/MediaType';
import RawAudio from '../../../../../../../features/plugins/data/model/media/RawAudio';
import RawVideo from '../../../../../../../features/plugins/data/model/media/RawVideo';
import {Subtitle} from '../../../../../../../features/plugins/data/model/media/Subtitle';
import {Extractor} from '../../../../domain/entities/Extractor';
import {ExtractorInfo} from '../../../../domain/entities/ExtractorInfo';
import detectSubtitleMimeType from '../../../../../../../core/utils/detectSubtitleMimeType';

class JWPlayer implements Extractor {
  name: string = 'JWPlayer';
  async execute(
    data: ExtractorVideo | ExtractorAudio,
  ): Promise<RawVideo[] | RawAudio[]> {
    try {
      let success = false;
      let response: AxiosResponse | null = null;
      let maxRetries = 10;
      while (!success && maxRetries > 0) {
        const playerResponse = await axiosClient.get(data.url, {
          headers: {
            Referer: data.url,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });

        const videoIdRegex = /\|ajaxUrl\|(.*?)\|video_id/;
        const videoId =
          playerResponse.data
            .match(videoIdRegex)[1]
            .split('|')
            .reverse()
            .join('+') + '=';
        const playerNonceRegex = /\|autoPlay\|(.*?)\|playerNonce/;
        const playerNonce = playerResponse.data.match(playerNonceRegex)[1];
        const ajaxUrl = new URL(data.url).origin + '/wp-admin/admin-ajax.php';
        const postData = new URLSearchParams();
        postData.append('action', 'get_player_data');
        postData.append('video_id', videoId);
        postData.append('player_nonce', playerNonce);

        response = await axiosClient.post(ajaxUrl, postData, {
          headers: {
            Referer: data.url,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });
        success = response!.data.success;
        maxRetries--;
      }
      if (!response) {
        console.error('Failed to get player data');
        return [];
      }
      if (!response.data || !response.data.success) {
        console.error('Failed to get player data:', response.data);
        return [];
      }

      const subtitles: Subtitle[] = response.data.subtitles.map(
        (subtitle: any) => ({
          url: subtitle.url,
          language: subtitle.lang,
          name: subtitle.lang,
          mimeType: detectSubtitleMimeType(subtitle.url),
        }),
      );
      const sources: RawVideo[] = response.data.sources.map((source: any) => ({
        url: source.file,
        isM3U8: source.type === 'hls',
        name: this.name,
        type: MediaType.RawVideo,
        subtitles: subtitles,
        headers: {
          Referer: data.url.split('watch?')[0],
          'User-Agent': 'Umbrella/1.0',
        },
      }));
      return sources;
    } catch (error) {
      return [];
    }
  }
}

class JWPlayerInfo implements ExtractorInfo {
  id: string = 'jw-player';
  patterns: RegExp[] = [/s3taku\./];
  extractorMediaType: MediaType = MediaType.ExtractorVideo;
  extractors: Extractor[] = [new JWPlayer()];
}

export default JWPlayerInfo;
