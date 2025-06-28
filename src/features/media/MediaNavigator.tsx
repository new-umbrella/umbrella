import React from 'react';
import {View, Text} from 'react-native';
import {MediaToView} from './domain/entities/MediaToView';
import VideoPlayer from './presentation/views/VideoPlayer';
import {RouteProp, useRoute} from '@react-navigation/native';
import MediaType from '../plugins/data/model/media/MediaType';

const MediaNavigator = () => {
  const {media} = useRoute<RouteProp<{params: {media: MediaToView}}>>().params;

  const renderMediaPlayer = () => {
    // Check if all media items are RawVideo
    const isAllRawVideo = media.media.every(
      item => item.type === MediaType.RawVideo,
    );

    if (isAllRawVideo) {
      return <VideoPlayer media={media} />;
    } else {
      return (
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <Text>Unsupported media</Text>
        </View>
      );
    }
  };

  return <View style={{flex: 1}}>{renderMediaPlayer()}</View>;
};

export default MediaNavigator;
