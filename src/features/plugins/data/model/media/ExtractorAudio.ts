import MediaType from './MediaType';
import {Subtitle} from './Subtitle';

interface ExtractorAudio {
  type: MediaType.ExtractorAudio;
  url: string;
  name: string;
  iconUrl?: string;
  language?: string;
  headers?: Record<string, string>;
  subtitles?: Subtitle[];
}

export default ExtractorAudio;
