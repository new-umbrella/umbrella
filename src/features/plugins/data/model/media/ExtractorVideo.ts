import MediaType from './MediaType';
import {Subtitle} from './Subtitle';

interface ExtractorVideo {
  type: MediaType.ExtractorVideo;
  url: string;
  name?: string;
  language?: string;
  iconUrl?: string;
  headers?: Record<string, string>;
  subtitles?: Subtitle[];
}

export default ExtractorVideo;
