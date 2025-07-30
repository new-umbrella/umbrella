import React from 'react';
import {View, StyleSheet, TouchableOpacity, Text} from 'react-native';
import Slider from '@react-native-community/slider';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Subtitle} from '../../../plugins/data/model/media/Subtitle';

interface VideoPlayerControlsProps {
  isPlaying: boolean;
  progress: number;
  currentTime: number;
  duration: number;
  title?: string;
  onTogglePlay: () => void;
  onSeek: (value: number) => void;
  onSkipAndRewind: (seconds: number) => void;
  onClose?: () => void;
  onMirror?: () => void;
  subtitles?: Subtitle[];
  selectedSubtitle?: Subtitle | null;
  onSelectSubtitle?: (subtitle: Subtitle | null) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onEnterFullscreen?: () => void;
  onExitFullscreen?: () => void;
}

const VideoPlayerControls: React.FC<VideoPlayerControlsProps> = ({
  isPlaying,
  progress,
  currentTime,
  duration,
  title,
  onTogglePlay,
  onSeek,
  onSkipAndRewind,
  onClose,
  onMirror,
  subtitles = [],
  selectedSubtitle = null,
  onSelectSubtitle = () => {},
  isFullscreen = false,
  onToggleFullscreen = () => {},
  onEnterFullscreen = () => {},
  onExitFullscreen = () => {},
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <View
      style={[
        styles.container,
        isFullscreen && {width: '100%', height: '100%'},
      ]}>
      {/* Top Controls */}
      <View style={styles.topControls}>
        <TouchableOpacity onPress={onMirror} style={styles.topButton}>
          <Icon name="cast" size={24} color="white" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} style={styles.topButton}>
          <Icon name="close" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Title */}
      {title && (
        <View style={styles.titleContainer}>
          <Text style={styles.titleText}>{title}</Text>
        </View>
      )}

      {/* Center Play Controls */}
      <View style={styles.centerControls}>
        <TouchableOpacity onPress={() => onSkipAndRewind(currentTime - 10)}>
          <Icon name="replay-10" size={36} color="white" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onTogglePlay} style={styles.playButton}>
          <Icon
            name={isPlaying ? 'pause' : 'play-arrow'}
            size={48}
            color="white"
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onSkipAndRewind(currentTime + 10)}>
          <Icon name="forward-10" size={36} color="white" />
        </TouchableOpacity>
      </View>

      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        <View style={styles.progressContainer}>
          <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
          <Slider
            style={styles.progressBar}
            value={progress}
            onValueChange={onSeek}
            minimumTrackTintColor="#E50914"
            maximumTrackTintColor="rgba(255,255,255,0.5)"
            thumbTintColor="#E50914"
            minimumValue={0}
            maximumValue={1}
          />
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: isFullscreen ? 20 : 0,
          }}>
          <TouchableOpacity style={styles.bottomButton}>
            {/* <Icon name="volume-up" size={24} color="white" /> */}
            <View style={{width: 24, height: 24}}></View>
          </TouchableOpacity>

          <View style={styles.bottomButtons}>
            <TouchableOpacity style={styles.bottomButton}>
              <Icon name="speed" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.bottomButton}>
              <Icon name="lock" size={24} color="white" />
            </TouchableOpacity>
            {subtitles.length > 0 && (
              <TouchableOpacity
                style={styles.bottomButton}
                onPress={() =>
                  onSelectSubtitle(selectedSubtitle ? null : subtitles[0])
                }>
                <Icon
                  name="subtitles"
                  size={24}
                  color={selectedSubtitle ? '#E50914' : 'white'}
                />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.bottomButton}
            onPress={() => {
              onToggleFullscreen();
              if (isFullscreen) {
                onExitFullscreen();
              } else {
                onEnterFullscreen();
              }
            }}>
            <Icon
              name={isFullscreen ? 'fullscreen-exit' : 'fullscreen'}
              size={24}
              color="white"
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 1001,
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  topButton: {
    padding: 8,
  },
  titleContainer: {
    position: 'absolute',
    top: '30%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  titleText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  centerControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    marginHorizontal: 40,
  },
  bottomControls: {
    padding: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressBar: {
    flex: 1,
    marginHorizontal: 8,
  },
  timeText: {
    color: 'white',
    fontSize: 12,
  },
  bottomButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  bottomButton: {
    padding: 8,
    marginHorizontal: 16,
  },
});

export default VideoPlayerControls;
