import {MediaToView} from '../entities/MediaToView';
import {MediaRepository} from '../repository/MediaRepository';

export class PlayMediaUsecase {
  constructor(private mediaRepository: MediaRepository) {}

  async execute(media: MediaToView): Promise<void> {
    return await this.mediaRepository.playMedia(media);
  }
}
