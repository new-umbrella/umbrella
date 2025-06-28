import DetailedItem from '../../../plugins/data/model/item/DetailedItem';
import RawAudio from '../../../plugins/data/model/media/RawAudio';
import RawVideo from '../../../plugins/data/model/media/RawVideo';

enum MediaToViewType {
  Video = 'video',
  Audio = 'audio',
}

export interface MediaToView {
  type: MediaToViewType;
  media: (RawVideo | RawAudio)[];
  details: DetailedItem;
  index: number;
}
