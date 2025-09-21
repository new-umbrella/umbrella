import {MediaType} from './MediaType';
import {Subtitle} from './Subtitle';

export interface RawAudio {
  type: MediaType.RawAudio;
  url: string;
  name: string;
  language?: string;
  iconUrl?: string;
  fileType?: string;
  headers?: Record<string, string>;
  subtitles?: Subtitle[];
}
