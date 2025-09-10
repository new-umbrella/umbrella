import React, { useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { MediaToView } from './domain/entities/MediaToView';
import VideoPlayer from './presentation/views/VideoPlayer';
import { RouteProp, useRoute } from '@react-navigation/native';
import { Subtitle } from '../plugins/data/model/media/Subtitle';

type MediaNavigatorParamList = {
  MediaViewer: {
    media: MediaToView[];
    selectedMedia: MediaToView;
    subtitles: Subtitle[];
  };
};

type MediaNavigatorRouteParams = RouteProp<
  MediaNavigatorParamList,
  'MediaViewer'
>;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  controls: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
  },
});

const MediaNavigator = () => {
  const {
    params: { media, selectedMedia, subtitles },
  } = useRoute<MediaNavigatorRouteParams>();
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);

  const handleNextSource = () => {
    if (currentSourceIndex < selectedMedia.media.length - 1) {
      setCurrentSourceIndex(currentSourceIndex + 1);
    }
  };

  const handlePrevSource = () => {
    if (currentSourceIndex > 0) {
      setCurrentSourceIndex(currentSourceIndex - 1);
    }
  };

  const renderMediaPlayer = () => {
    if (selectedMedia.media.length === 0) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" />
          <Text>Loading media...</Text>
        </View>
      );
    }

    return (
      <>
        {/* <VideoPlayer media={media} /> */}
        <VideoPlayer media={media} selectedMedia={selectedMedia} subtitles={subtitles} />
      </>
    );
  };

  return <View style={styles.container}>{renderMediaPlayer()}</View>;
};

export default MediaNavigator;
