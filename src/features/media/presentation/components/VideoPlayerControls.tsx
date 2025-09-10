import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import Slider from '@react-native-community/slider';
import { Icon } from 'react-native-paper';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Subtitle } from '../../../plugins/data/model/media/Subtitle';

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
  onSelectSubtitle = () => { },
  isFullscreen = false,
  onToggleFullscreen = () => { },
  onEnterFullscreen = () => { },
  onExitFullscreen = () => { },
  playbackRate = 1.0,
  onPlaybackSpeedChange = () => { },
  isScreenLocked = false,
  onScreenLockToggle = () => { },
  controlsVisible = true,
  onControlsInteraction = () => { },
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // When screen is locked, only show unlock button
  if (isScreenLocked) {
    return (
      <View
        style={[
          styles.container,
          styles.lockedContainer,
          styles.transparentContainer,
        ]}>
        <TouchableOpacity
          style={styles.unlockButton}
          onPress={onScreenLockToggle}>
          <Icon
            size={32}
            color="#FFFFFF"
            source={(props: { size?: number; color?: string }) => (
              <MaterialIcons name="lock" size={props.size ?? 32} color={props.color ?? '#FFFFFF'} />
            )}
          />
          {/* <Text style={styles.unlockText}>Tap to unlock</Text> */}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        isFullscreen && { width: '100%', height: '100%' },
      ]}
      onTouchStart={onControlsInteraction}>
      {/* Top Controls */}
      <View style={styles.topControls}>
        {/* <View style={styles.titleContainer}> */}
        <Text style={styles.titleText}>{title || ''}</Text>
        {/* </View> */}
        <TouchableOpacity onPress={onMirror} style={styles.topIconButton}>
          <Icon
            size={18}
            color="#FFFFFF"
            source={(props: { size?: number; color?: string }) => (
              <MaterialIcons name="cast" size={props.size ?? 18} color={props.color ?? '#FFFFFF'} />
            )}
          />
        </TouchableOpacity>
        {/* <TouchableOpacity onPress={onClose} style={styles.topIconButton}>
          <Icon
            size={18}
            color="#FFFFFF"
            source={(props: { size?: number; color?: string }) => (
              <MaterialIcons name="close" size={props.size ?? 18} color={props.color ?? '#FFFFFF'} />
            )}
          />
        </TouchableOpacity> */}
      </View>

      {/* Title */}

      {/* Center Play Controls */}
      <View style={styles.centerControls}>
        <TouchableOpacity
          onPress={() => onSkipAndRewind(currentTime - 10)}
          style={styles.circleButton40}
        >
          <Icon
            size={36}
            color="#FFFFFF"
            source={(props: { size?: number; color?: string }) => (
              <MaterialIcons name="replay-10" size={props.size ?? 24} color={props.color ?? '#FFFFFF'} />
            )}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={onTogglePlay} style={styles.circleButton42Shadow}>
          <Icon
            size={48}
            color="#FFFFFF"
            source={(props: { size?: number; color?: string }) => (
              <MaterialIcons
                name={isPlaying ? 'pause' : 'play-arrow'}
                size={props.size ?? 24}
                color={props.color ?? '#FFFFFF'}
              />
            )}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onSkipAndRewind(currentTime + 10)}
          style={styles.circleButton40}
        >
          <Icon
            size={36}
            color="#FFFFFF"
            source={(props: { size?: number; color?: string }) => (
              <MaterialIcons name="forward-10" size={props.size ?? 24} color={props.color ?? '#FFFFFF'} />
            )}
          />
        </TouchableOpacity>
      </View>

      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        <View style={styles.progressContainer}>
          <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarInner}>
              {/* Background track */}
              <View style={styles.progressTrack} />
              {/* Buffered progress */}
              <View
                style={[
                  styles.bufferedProgress,
                  { width: `${bufferedProgress * 100}%` },
                ]}
              />
              {/* Current progress */}
              <View
                style={[styles.currentProgress, { width: `${progress * 100}%` }]}
              />
              {/* Interactive overlay for seeking */}
              <Slider
                style={styles.progressSlider}
                value={progress}
                onValueChange={onSeek}
                minimumTrackTintColor="transparent"
                maximumTrackTintColor="transparent"
                thumbTintColor="#D22F26"
                minimumValue={0}
                maximumValue={1}
              />
            </View>
          </View>
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>
        <View style={styles.bottomRow}>
          <View style={styles.actionsRowGrid}>
            <TouchableOpacity style={styles.actionSlot} onPress={onPlaybackSpeedChange}>
              <Icon
                size={21}
                color={playbackRate !== 1.0 ? '#D22F26' : '#FFFFFF'}
                source={(props: { size?: number; color?: string }) => (
                  <MaterialIcons name="speed" size={props.size ?? 21} color={props.color ?? '#FFFFFF'} />
                )}
              />
              <Text style={styles.captionText}>{`Speed (${playbackRate}x)`}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionSlot} onPress={onScreenLockToggle}>
              <Icon
                size={21}
                color={isScreenLocked ? '#D22F26' : '#FFFFFF'}
                source={(props: { size?: number; color?: string }) => (
                  <MaterialIcons name={isScreenLocked ? 'lock' : 'lock-open'} size={props.size ?? 21} color={props.color ?? '#FFFFFF'} />
                )}
              />
              <Text style={styles.captionText}>Lock</Text>
            </TouchableOpacity>

            {subtitles.length > 0 ? (
              <TouchableOpacity
                style={styles.actionSlot}
                onPress={() => onSelectSubtitle(selectedSubtitle ? null : subtitles[0])}
              >
                <Icon
                  size={21}
                  color={selectedSubtitle ? '#D22F26' : '#FFFFFF'}
                  source={(props: { size?: number; color?: string }) => (
                    <MaterialIcons name="subtitles" size={props.size ?? 21} color={props.color ?? '#FFFFFF'} />
                  )}
                />
                <Text style={styles.captionText}>Audio & Subtitles</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.actionSlot} />
            )}
          </View>

          {/* <TouchableOpacity
            style={styles.bottomButton}
            onPress={() => {
              onToggleFullscreen();
              if (isFullscreen) {
                onExitFullscreen();
              } else {
                onEnterFullscreen();
              }
            }}
          >
            <Icon
              size={24}
              color="#FFFFFF"
              source={(props: { size?: number; color?: string }) => (
                <MaterialIcons
                  name={isFullscreen ? 'fullscreen-exit' : 'fullscreen'}
                  size={props.size ?? 24}
                  color={props.color ?? '#FFFFFF'}
                />
              )}
            />
          </TouchableOpacity> */}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  topIconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: -0.25,
  },
  centerControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleButton40: {
    width: 50,
    height: 50,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 78,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  circleButton42Shadow: {
    width: 56,
    height: 56,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    shadowColor: '#000',
    shadowOpacity: 0.87,
    shadowRadius: 16,
    shadowOffset: { width: 4, height: 4 },
    elevation: 8,
  },
  bottomControls: {
    padding: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressBarContainer: {
    flex: 1,
    height: 40,
    marginHorizontal: 8,
    position: 'relative',
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  progressBarInner: {
    position: 'relative',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  progressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
  },
  bufferedProgress: {
    position: 'absolute',
    height: 4,
    backgroundColor: '#BFBFBF',
    borderRadius: 2,
    zIndex: 1,
    left: 0,
  },
  currentProgress: {
    position: 'absolute',
    height: 4,
    backgroundColor: '#D22F26',
    borderRadius: 2,
    zIndex: 2,
    left: 0,
  },
  progressSlider: {
    position: 'absolute',
    width: '100%',
    height: 40,
    zIndex: 3,
    left: 0,
    right: 0,
    top: 0,
    marginHorizontal: 0,
  },
  timeText: {
    color: 'white',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '300',
    letterSpacing: -0.25,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  actionsRowGrid: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingRight: 16,
  },
  actionSlot: {
    // flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  labeledAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  captionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: -0.25,
    marginLeft: 7,
  },
  bottomButton: {
    padding: 8,
    marginHorizontal: 16,
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
