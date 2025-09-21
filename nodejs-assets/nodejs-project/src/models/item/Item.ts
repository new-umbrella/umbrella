import {Source} from '../source/Source';
import {SourceType} from '../source/SourceType';

export interface Item {
  id: string;
  name: string;
  description?: string;
  imageUrl: string;
  url: string;
  type: SourceType;
  source?: Plugin;
}
