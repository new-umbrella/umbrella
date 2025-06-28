import React, {useState, useEffect, useRef, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  PanResponder,
  Alert,
} from 'react-native';
import {
  Menu,
  Button,
  Portal,
  Modal,
  List,
  useTheme,
  Surface,
  IconButton,
} from 'react-native-paper';
import Slider from '@react-native-community/slider';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import {Subtitle} from '../../../plugins/data/model/media/Subtitle';
import RawVideo from '../../../plugins/data/model/media/RawVideo';
import Video from 'react-native-video';

const {width: screenWidth, height: screenHeight} = Dimensions.get('window');

interface VideoPlayerControlsProps {
  isPlaying: boolean;
  setIsPlaying: (isPlaying: boolean) => void;
  currentTime: number;
  setCurrentTime: (currentTime: number) => void;
  duration: number;
  setDuration: (duration: number) => void;
  onSeek?: (time: number) => void;
  onPlaybackRateChange?: (rate: number) => void;
  onQualityChange?: (quality: string) => void;
  onSubtitleChange?: (subtitle: Subtitle | null) => void;
  onFullscreenToggle?: () => void;
  onVolumeChange?: (volume: number) => void;
  onSourceChange?: (source: RawVideo) => void;
  sources?: RawVideo[];
  subtitles?: Subtitle[];
  volume?: number;
  playbackRate?: number;
  isFullscreen?: boolean;
  quality?: string;
  selectedSubtitle?: Subtitle | null;
  onDoubleTapSeek?: (direction: 'forward' | 'backward') => void;
  onSwipeSeek?: (time: number) => void;
  isBuffering?: boolean;
  bufferedTime?: number;
  onPictureInPicture?: () => void;
  onCast?: () => void;
  isLive?: boolean;
  chapters?: Array<{time: number; title: string}>;
  videoTitle?: string;
  videoReady?: boolean;
  hasPrevEpisode?: boolean;
  hasNextEpisode?: boolean;
  onPrevEpisode?: () => void;
  onNextEpisode?: () => void;
  onBrightnessChange?: (value: number) => void;
  setIsDragging?: (dragging: boolean) => void;
}

const VideoPlayerControls: React.FC<VideoPlayerControlsProps> = ({
  isPlaying,
  setIsPlaying,
  currentTime,
  setCurrentTime,
  duration,
  setDuration,
  onSeek,
  onPlaybackRateChange,
  onQualityChange,
  onSubtitleChange,
  onFullscreenToggle,
  onVolumeChange,
  onSourceChange,
  sources = [],
  subtitles = [],
  volume = 1,
  playbackRate = 1,
  isFullscreen = false,
  quality = 'Auto',
  selectedSubtitle = null,
  onDoubleTapSeek,
  onSwipeSeek,
  isBuffering = false,
  bufferedTime = 0,
  onPictureInPicture,
  onCast,
  isLive = false,
  chapters = [],
  videoTitle = 'Video Player',
  videoReady = false,
  hasPrevEpisode = false,
  hasNextEpisode = false,
  onPrevEpisode,
  onNextEpisode,
  onBrightnessChange,
  setIsDragging,
}) => {
  const theme = useTheme();
  const [isVisible, setIsVisible] = useState(true);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [isQualityMenuVisible, setIsQualityMenuVisible] = useState(false);
  const [isSubtitleMenuVisible, setIsSubtitleMenuVisible] = useState(false);
  const [isSpeedMenuVisible, setIsSpeedMenuVisible] = useState(false);
  const [isSourceMenuVisible, setIsSourceMenuVisible] = useState(false);
  const [isVolumeVisible, setIsVolumeVisible] = useState(false);
  const [isDragging, setIsDraggingLocal] = useState(false);
  const [tempCurrentTime, setTempCurrentTime] = useState(currentTime);
  const [lastTap, setLastTap] = useState(0);
  const [seekPreview, setSeekPreview] = useState<number | null>(null);

  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const hideTimeout = useRef<NodeJS.Timeout>();

  // Auto-hide controls
  useEffect(() => {
    if (isPlaying && isVisible && !isDragging) {
      hideTimeout.current = setTimeout(() => {
        hideControls();
      }, 3000);
    }
    return () => {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
    };
  }, [isPlaying, isVisible, isDragging]);

  const hideControls = () => {
    setIsVisible(false);
    Animated.timing(controlsOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const showControls = () => {
    setIsVisible(true);
    Animated.timing(controlsOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  // Gesture handling for double tap and swipe
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // Don't capture simple taps – let IconButtons & slider receive them.
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 10 || Math.abs(g.dy) > 10,
        onPanResponderGrant: () => {
          showControls();
        },
        onPanResponderMove: (_, g) => {
          const isHorizontal = Math.abs(g.dx) > Math.abs(g.dy);
          const startX = g.x0;

          if (isHorizontal) {
            // Seeking
            const seekDelta = (g.dx / screenWidth) * 120; // up to 2 minutes
            const newTime = Math.max(
              0,
              Math.min(duration, currentTime + seekDelta),
            );
            setSeekPreview(newTime);
            if (onSwipeSeek) onSwipeSeek(newTime);
          } else {
            // Vertical gesture – volume or brightness
            const delta = -g.dy / screenHeight; // up swipe positive
            if (startX > screenWidth / 2) {
              // Right half – volume
              const newVol = Math.max(0, Math.min(1, volume + delta));
              onVolumeChange?.(newVol);
            } else {
              // Left half – brightness
              onBrightnessChange?.(delta);
            }
          }
        },
        onPanResponderRelease: (_, g) => {
          setSeekPreview(null);

          // Double-tap detection (only when no dragging occurred)
          const now = Date.now();
          const tapDuration = now - lastTap;

          if (Math.abs(g.dx) < 10 && Math.abs(g.dy) < 10) {
            if (tapDuration < 300) {
              // Second tap inside 300 ms → double-tap only when controls are hidden
              if (!isVisible && currentTime > 1) {
                handleDoubleTap(g.x0);
              }
              setLastTap(0); // reset chain
            } else {
              setLastTap(now);
            }
          } else {
            // It was a drag/seek – reset double-tap timer
            setLastTap(0);
          }
        },
      }),
    [currentTime, duration, lastTap, onSwipeSeek, volume],
  );

  const handleDoubleTap = (x: number) => {
    const isLeftSide = x < screenWidth / 2;
    if (onDoubleTapSeek) {
      onDoubleTapSeek(isLeftSide ? 'backward' : 'forward');
    } else {
      // Default 10 second skip
      const newTime = isLeftSide
        ? Math.max(0, currentTime - 10)
        : Math.min(duration, currentTime + 10);
      setCurrentTime(newTime);
      if (onSeek) onSeek(newTime);
    }
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Quality options
  const qualityOptions = useMemo(() => {
    const options = [
      'Auto',
      '144p',
      '240p',
      '360p',
      '480p',
      '720p',
      '1080p',
      '1440p',
      '2160p',
    ];
    return sources.length > 1
      ? ['Auto', ...sources.map((_, idx) => `Source ${idx + 1}`)]
      : options;
  }, [sources]);

  // Speed options
  const speedOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  // Progress calculation
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercentage = duration > 0 ? (bufferedTime / duration) * 100 : 0;

  // Smart buffering logic: Show buffering only when:
  // 1. Video is not playing
  // 2. The amount of video ahead that is buffering is 0 (no buffered content ahead)
  // 3. Video is not at the end (not within 5 seconds of end)
  const bufferAhead = bufferedTime - currentTime; // Amount of video buffered ahead of current position
  const isNearEnd = duration > 0 && duration - currentTime < 5; // Within 5 seconds of end
  const shouldShowBuffering =
    !isPlaying && isBuffering && bufferAhead <= 0 && !isNearEnd && videoReady;

  const pause = () => {
    setIsPlaying(false);
  };

  const play = () => {
    setIsPlaying(true);
  };

  return (
    <View
      style={styles.container}
      {...panResponder.panHandlers}
      pointerEvents="box-none">
      {/* Transparent overlay to catch taps and show controls */}
      <TouchableWithoutFeedback onPress={showControls}>
        <View style={StyleSheet.absoluteFillObject} pointerEvents="auto" />
      </TouchableWithoutFeedback>

      {/* Seek Preview Overlay */}
      {seekPreview !== null && (
        <View style={styles.seekPreview}>
          <Text
            style={[styles.seekPreviewText, {color: theme.colors.onSurface}]}>
            {formatTime(seekPreview)}
          </Text>
        </View>
      )}

      {/* Double Tap Indicators */}
      <View style={styles.doubleTapAreas} pointerEvents="none">
        <View style={styles.leftTapArea} />
        <View style={styles.rightTapArea} />
      </View>

      {/* Controls UI, only visible when isVisible */}
      {isVisible && (
        <Animated.View style={[styles.controls, {opacity: controlsOpacity}]}>
          {/* Top Controls */}
          <View style={styles.topControls}>
            <View style={styles.topLeft}>
              <IconButton
                icon={() => (
                  <MaterialIcons
                    name="arrow-back"
                    size={24}
                    color={theme.colors.onSurface}
                  />
                )}
                size={24}
                onPress={() => {
                  /* Handle back */
                }}
              />
              <Text
                style={[styles.videoTitle, {color: theme.colors.onSurface}]}>
                {videoTitle}
              </Text>
            </View>
            <View style={styles.topRight}>
              <IconButton
                icon={() => (
                  <MaterialIcons
                    name="cast"
                    size={24}
                    color={theme.colors.onSurface}
                  />
                )}
                size={24}
                onPress={onCast}
              />
              <IconButton
                icon={() => (
                  <MaterialIcons
                    name="picture-in-picture-alt"
                    size={24}
                    color={theme.colors.onSurface}
                  />
                )}
                size={24}
                onPress={onPictureInPicture}
              />
              <Menu
                visible={isSettingsVisible}
                onDismiss={() => setIsSettingsVisible(false)}
                anchor={
                  <IconButton
                    icon={() => (
                      <MaterialIcons
                        name="more-vert"
                        size={24}
                        color={theme.colors.onSurface}
                      />
                    )}
                    size={24}
                    onPress={() => setIsSettingsVisible(true)}
                  />
                }>
                <Menu.Item
                  onPress={() => {
                    setIsSettingsVisible(false);
                    setIsQualityMenuVisible(true);
                  }}
                  title="Quality"
                  leadingIcon={() => (
                    <MaterialIcons name="high-quality" size={20} />
                  )}
                />
                <Menu.Item
                  onPress={() => {
                    setIsSettingsVisible(false);
                    setIsSubtitleMenuVisible(true);
                  }}
                  title="Subtitles"
                  leadingIcon={() => (
                    <MaterialIcons name="subtitles" size={20} />
                  )}
                />
                <Menu.Item
                  onPress={() => {
                    setIsSettingsVisible(false);
                    setIsSpeedMenuVisible(true);
                  }}
                  title="Playback Speed"
                  leadingIcon={() => <MaterialIcons name="speed" size={20} />}
                />
                {sources.length > 1 && (
                  <Menu.Item
                    onPress={() => {
                      setIsSettingsVisible(false);
                      setIsSourceMenuVisible(true);
                    }}
                    title="Video Source"
                    leadingIcon={() => (
                      <MaterialIcons name="video-library" size={20} />
                    )}
                  />
                )}
              </Menu>
            </View>
          </View>

          {/* Center Play Button (when paused) */}
          {!isPlaying && !shouldShowBuffering && videoReady && (
            <TouchableOpacity
              style={styles.centerPlayButton}
              onPress={() => {
                play();
                showControls();
              }}
              activeOpacity={0.8}>
              <MaterialIcons
                name="play-arrow"
                size={80}
                color="rgba(255,255,255,0.9)"
              />
            </TouchableOpacity>
          )}

          {/* Smart Buffering Indicator */}
          {shouldShowBuffering && (
            <View style={styles.bufferingIndicator}>
              <MaterialIcons
                name="hourglass-empty"
                size={40}
                color="rgba(255,255,255,0.8)"
              />
            </View>
          )}

          {/* Bottom Controls */}
          <View style={styles.bottomControls}>
            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              {/* Chapter Markers */}
              {chapters.map((chapter, index) => {
                const position =
                  duration > 0 ? (chapter.time / duration) * 100 : 0;
                return (
                  <View
                    key={index}
                    style={[styles.chapterMarker, {left: `${position}%`}]}
                  />
                );
              })}

              {/* Buffer Progress */}
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.bufferProgress,
                    {width: `${bufferedPercentage}%`},
                  ]}
                />
                <View
                  style={[styles.progress, {width: `${progressPercentage}%`}]}
                />
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={duration}
                  value={isDragging ? tempCurrentTime : currentTime}
                  onValueChange={(value: number) => {
                    setTempCurrentTime(value);
                    setIsDraggingLocal(true);
                    setIsDragging?.(true);
                  }}
                  onSlidingComplete={(value: number) => {
                    setIsDraggingLocal(false);
                    setIsDragging?.(false);
                    if (onSeek) onSeek(value);
                  }}
                  minimumTrackTintColor={theme.colors.primary}
                  maximumTrackTintColor="rgba(255,255,255,0.3)"
                  thumbTintColor="#FF0000"
                />
              </View>
            </View>

            {/* Control Buttons Row */}
            <View style={styles.controlsRow}>
              <View style={styles.leftControls}>
                <IconButton
                  icon={() => (
                    <MaterialIcons
                      name={isPlaying ? 'pause' : 'play-arrow'}
                      size={32}
                      color={theme.colors.onSurface}
                    />
                  )}
                  size={32}
                  onPress={() => {
                    if (isPlaying) {
                      pause();
                    } else {
                      play();
                    }
                  }}
                />

                {/* Previous Episode */}
                {hasPrevEpisode && (
                  <IconButton
                    icon={() => (
                      <MaterialIcons
                        name="skip-previous"
                        size={24}
                        color={theme.colors.onSurface}
                      />
                    )}
                    size={24}
                    onPress={onPrevEpisode}
                  />
                )}

                <IconButton
                  icon={() => (
                    <MaterialIcons
                      name="skip-next"
                      size={24}
                      color={theme.colors.onSurface}
                    />
                  )}
                  size={24}
                  onPress={() => {
                    /* Handle next */
                  }}
                />

                <IconButton
                  icon={() => (
                    <MaterialIcons
                      name={volume > 0 ? 'volume-up' : 'volume-off'}
                      size={24}
                      color={theme.colors.onSurface}
                    />
                  )}
                  size={24}
                  onPress={() => {
                    if (volume > 0) {
                      onVolumeChange?.(0);
                    } else {
                      onVolumeChange?.(1);
                    }
                    setIsVolumeVisible(!isVolumeVisible);
                  }}
                />

                {/* Volume Slider */}
                {isVolumeVisible && (
                  <View style={styles.volumeContainer}>
                    <Slider
                      style={styles.volumeSlider}
                      minimumValue={0}
                      maximumValue={1}
                      value={volume}
                      onValueChange={onVolumeChange}
                      minimumTrackTintColor={theme.colors.primary}
                      maximumTrackTintColor="rgba(255,255,255,0.3)"
                      thumbTintColor={theme.colors.primary}
                    />
                  </View>
                )}

                <Text
                  style={[styles.timeText, {color: theme.colors.onSurface}]}>
                  {formatTime(currentTime)} /{' '}
                  {isLive ? 'LIVE' : formatTime(duration)}
                </Text>
              </View>

              <View style={styles.rightControls}>
                <IconButton
                  icon={() => (
                    <MaterialIcons
                      name="subtitles"
                      size={24}
                      color={theme.colors.onSurface}
                    />
                  )}
                  size={24}
                  onPress={() => setIsSubtitleMenuVisible(true)}
                />

                <IconButton
                  icon={() => (
                    <MaterialIcons
                      name="settings"
                      size={24}
                      color={theme.colors.onSurface}
                    />
                  )}
                  size={24}
                  onPress={() => setIsSettingsVisible(true)}
                />

                <IconButton
                  icon={() => (
                    <MaterialIcons
                      name="aspect-ratio"
                      size={24}
                      color={theme.colors.onSurface}
                    />
                  )}
                  size={24}
                  onPress={onFullscreenToggle}
                />

                {/* Next Episode */}
                {hasNextEpisode && (
                  <IconButton
                    icon={() => (
                      <MaterialIcons
                        name="skip-next"
                        size={24}
                        color={theme.colors.onSurface}
                      />
                    )}
                    size={24}
                    onPress={onNextEpisode}
                  />
                )}
              </View>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Quality Selection Modal */}
      <Portal>
        <Modal
          visible={isQualityMenuVisible}
          onDismiss={() => setIsQualityMenuVisible(false)}
          contentContainerStyle={[
            styles.modal,
            {backgroundColor: theme.colors.surface},
          ]}>
          <Text style={[styles.modalTitle, {color: theme.colors.onSurface}]}>
            Video Quality
          </Text>
          {qualityOptions.map(option => (
            <List.Item
              key={option}
              title={option}
              onPress={() => {
                if (onQualityChange) onQualityChange(option);
                setIsQualityMenuVisible(false);
              }}
              right={() =>
                quality === option ? (
                  <MaterialIcons
                    name="check"
                    size={20}
                    color={theme.colors.primary}
                  />
                ) : null
              }
            />
          ))}
        </Modal>
      </Portal>

      {/* Subtitle Selection Modal */}
      <Portal>
        <Modal
          visible={isSubtitleMenuVisible}
          onDismiss={() => setIsSubtitleMenuVisible(false)}
          contentContainerStyle={[
            styles.modal,
            {backgroundColor: theme.colors.surface},
          ]}>
          <Text style={[styles.modalTitle, {color: theme.colors.onSurface}]}>
            Subtitles
          </Text>
          <List.Item
            title="Off"
            onPress={() => {
              if (onSubtitleChange) onSubtitleChange(null);
              setIsSubtitleMenuVisible(false);
            }}
            right={() =>
              !selectedSubtitle ? (
                <MaterialIcons
                  name="check"
                  size={20}
                  color={theme.colors.primary}
                />
              ) : null
            }
          />
          {subtitles.map((subtitle, index) => (
            <List.Item
              key={index}
              title={
                subtitle.name || subtitle.language || `Subtitle ${index + 1}`
              }
              onPress={() => {
                if (onSubtitleChange) onSubtitleChange(subtitle);
                setIsSubtitleMenuVisible(false);
              }}
              right={() =>
                selectedSubtitle === subtitle ? (
                  <MaterialIcons
                    name="check"
                    size={20}
                    color={theme.colors.primary}
                  />
                ) : null
              }
            />
          ))}
        </Modal>
      </Portal>

      {/* Speed Selection Modal */}
      <Portal>
        <Modal
          visible={isSpeedMenuVisible}
          onDismiss={() => setIsSpeedMenuVisible(false)}
          contentContainerStyle={[
            styles.modal,
            {backgroundColor: theme.colors.surface},
          ]}>
          <Text style={[styles.modalTitle, {color: theme.colors.onSurface}]}>
            Playback Speed
          </Text>
          {speedOptions.map(speed => (
            <List.Item
              key={speed}
              title={`${speed}x`}
              onPress={() => {
                if (onPlaybackRateChange) onPlaybackRateChange(speed);
                setIsSpeedMenuVisible(false);
              }}
              right={() =>
                playbackRate === speed ? (
                  <MaterialIcons
                    name="check"
                    size={20}
                    color={theme.colors.primary}
                  />
                ) : null
              }
            />
          ))}
        </Modal>
      </Portal>

      {/* Source Selection Modal */}
      <Portal>
        <Modal
          visible={isSourceMenuVisible}
          onDismiss={() => setIsSourceMenuVisible(false)}
          contentContainerStyle={[
            styles.modal,
            {backgroundColor: theme.colors.surface},
          ]}>
          <Text style={[styles.modalTitle, {color: theme.colors.onSurface}]}>
            Video Source
          </Text>
          {sources.map((source, index) => (
            <List.Item
              key={index}
              title={source.name || `Source ${index + 1}`}
              description={source.url}
              onPress={() => {
                if (onSourceChange) onSourceChange(source);
                setIsSourceMenuVisible(false);
              }}
            />
          ))}
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  controls: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  topControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    // paddingTop: 12,
    // paddingBottom: 18,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    flex: 1,
  },
  centerPlayButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{translateX: -40}, {translateY: -40}],
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 40,
    padding: 20,
    zIndex: 1000,
    elevation: 10,
  },
  bufferingIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{translateX: -20}, {translateY: -20}],
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    // paddingBottom: 8,
    // paddingTop: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  progressContainer: {
    paddingTop: 12,
    marginBottom: 12,
    position: 'relative',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    position: 'relative',
  },
  progress: {
    height: '100%',
    backgroundColor: '#FF0000',
    borderRadius: 2,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  bufferProgress: {
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 2,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  slider: {
    position: 'absolute',
    top: -18,
    left: 0,
    right: 0,
    height: 40,
  },

  chapterMarker: {
    position: 'absolute',
    top: -2,
    width: 2,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 1,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftControls: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    marginLeft: 8,
    minWidth: 80,
  },
  volumeContainer: {
    width: 80,
    marginLeft: 8,
  },
  volumeSlider: {
    height: 20,
  },
  modal: {
    margin: 20,
    borderRadius: 8,
    padding: 20,
    maxHeight: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  doubleTapAreas: {
    flexDirection: 'row',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  leftTapArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0,
  },
  rightTapArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0,
  },
  seekPreview: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{translateX: -30}, {translateY: -15}],
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    zIndex: 2,
  },
  seekPreviewText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default VideoPlayerControls;
