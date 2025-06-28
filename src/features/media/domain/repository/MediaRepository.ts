import {MediaToView} from '../entities/MediaToView';

export interface MediaRepository {
  playMedia: (media: MediaToView) => Promise<void>;
}
