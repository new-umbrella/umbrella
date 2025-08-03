import React from 'react';
import {View, StyleSheet, TouchableOpacity, Text} from 'react-native';
import Slider from '@react-native-community/slider';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Subtitle} from '../../../plugins/data/model/media/Subtitle';

interface VideoPlayerControlsProps {
  isPlaying: boolean;
  progress: number;
  bufferedProgress?: number;
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
  playbackRate?: number;
  onPlaybackSpeedChange?: () => void;
  isScreenLocked?: boolean;
  onScreenLockToggle?: () => void;
  controlsVisible?: boolean;
  onControlsInteraction?: () => void;
}

const VideoPlayerControls: React.FC<VideoPlayerControlsProps> = ({
  isPlaying,
  progress,
  bufferedProgress = 0,
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
  playbackRate = 1.0,
  onPlaybackSpeedChange = () => {},
  isScreenLocked = false,
  onScreenLockToggle = () => {},
  controlsVisible = true,
  onControlsInteraction = () => {},
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // When screen is locked, only show unlock button
  if (isScreenLocked) {
    return (
      <View style={[styles.container, styles.lockedContainer, styles.transparentContainer]}>
        <TouchableOpacity
          style={styles.unlockButton}
          onPress={onScreenLockToggle}>
          <Icon name="lock-open" size={32} color="white" />
          {/* <Text style={styles.unlockText}>Tap to unlock</Text> */}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        isFullscreen && {width: '100%', height: '100%'},
      ]}
      onTouchStart={onControlsInteraction}>
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
          <View style={styles.progressBarContainer}>
            {/* Background track */}
            <View style={styles.progressTrack} />
            {/* Buffered progress */}
            <View 
              style={[
                styles.bufferedProgress, 
                { width: `${bufferedProgress * 100}%` }
              ]} 
            />
            {/* Current progress */}
            <View 
              style={[
                styles.currentProgress, 
                { width: `${progress * 100}%` }
              ]} 
            />
            {/* Interactive overlay for seeking */}
            <Slider
              style={styles.progressSlider}
              value={progress}
              onValueChange={onSeek}
              minimumTrackTintColor="transparent"
              maximumTrackTintColor="transparent"
              thumbTintColor="#E50914"
              minimumValue={0}
              maximumValue={1}
            />
          </View>
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
            <TouchableOpacity 
              style={styles.bottomButton}
              onPress={onPlaybackSpeedChange}>
              <Icon name="speed" size={24} color={playbackRate !== 1.0 ? '#E50914' : 'white'} />
              {playbackRate !== 1.0 && (
                <Text style={styles.speedText}>{playbackRate}x</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.bottomButton}
              onPress={onScreenLockToggle}>
              <Icon 
                name={isScreenLocked ? "lock" : "lock-open"} 
                size={24} 
                color={isScreenLocked ? '#E50914' : 'white'} 
              />
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
  progressBarContainer: {
    flex: 1,
    height: 40,
    marginHorizontal: 8,
    position: 'relative',
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  progressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    marginHorizontal: 16,
  },
  bufferedProgress: {
    position: 'absolute',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 2,
    zIndex: 1,
    left: 0,
    marginLeft: 16,
  },
  currentProgress: {
    position: 'absolute',
    height: 4,
    backgroundColor: '#E50914',
    borderRadius: 2,
    zIndex: 2,
    left: 0,
    marginLeft: 16,
  },
  progressSlider: {
    position: 'absolute',
    width: '100%',
    height: 40,
    zIndex: 3,
    left: 0,
    right: 0,
    marginHorizontal: 0,
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
  speedText: {
    color: '#E50914',
    fontSize: 10,
    fontWeight: 'bold',
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 2,
    borderRadius: 2,
  },
  lockedContainer: {
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    paddingBottom: 40,
    paddingLeft: 20,
  },
  unlockButton: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
  },
  unlockText: {
    color: 'white',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  transparentContainer: {
    backgroundColor: 'transparent',
  },
});

export default VideoPlayerControls;
