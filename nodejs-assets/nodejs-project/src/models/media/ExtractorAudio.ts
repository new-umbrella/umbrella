import {MediaType} from './MediaType';
import {Subtitle} from './Subtitle';

export interface ExtractorAudio {
  type: MediaType.ExtractorAudio;
  url: string;
  name: string;
  iconUrl?: string;
  language?: string;
  headers?: Record<string, string>;
  subtitles?: Subtitle[];
}
