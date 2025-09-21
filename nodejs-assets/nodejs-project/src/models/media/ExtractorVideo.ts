import {MediaType} from './MediaType';
import {Subtitle} from './Subtitle';

export interface ExtractorVideo {
  type: MediaType.ExtractorVideo;
  url: string;
  name?: string;
  language?: string;
  iconUrl?: string;
  headers?: Record<string, string>;
  subtitles?: Subtitle[];
}
