import {View, Alert, Linking, StyleSheet, Dimensions} from 'react-native';
import React, {useState, useEffect, useRef, useMemo} from 'react';
import Orientation from 'react-native-orientation-locker';
import {MediaToView} from '../../domain/entities/MediaToView';
import VideoPlayerControls from '../components/VideoPlayerControls';
import {Button, Card, useTheme, Text} from 'react-native-paper';
import MediaType from '../../../plugins/data/model/media/MediaType';
// @ts-ignore – optional native module; will be resolved at runtime on device
import SystemSetting from 'react-native-system-setting';
import Video, {
  SelectedTrack,
  TextTrackType,
  ISO639_1,
} from 'react-native-video';
import RawVideo from '../../../plugins/data/model/media/RawVideo';
import {Subtitle} from '../../../plugins/data/model/media/Subtitle';

const VideoPlayerContent = ({
  hasError,
  videoPlayerError,
  VideoPlayerFallback,
  currentVideoUrl,
  videoRef,
  videoSource,
  styles,
  isPlaying,
  volume,
  playbackRate,
  resizeMode,
  handleVideoLoad,
  handleVideoLoadStart,
  handleVideoProgress,
  handleVideoError,
  handleVideoBuffer,
  handleVideoLoadEnd,
  media,
  selectedSubtitle,
  details,
  duration,
  currentTime,
  setCurrentTime,
  setDuration,
  handlePlayStateChange,
  handleSeek,
  handleFullscreenToggle,
  handleVolumeChange,
  handlePlaybackRateChange,
  handleQualityChange,
  handleSubtitleChange,
  isLoading,
  isBuffering,
  bufferedTime,
  isFullscreen,
  handleDoubleTapSeek,
  handleSwipeSeek,
  handleBrightnessChange,
}: any) => {
  if (hasError || videoPlayerError) {
    return <VideoPlayerFallback />;
  }

  return (
    <View style={styles.videoContainer}>
      {currentVideoUrl && (
        <Video
          ref={videoRef}
          source={videoSource}
          style={styles.video}
          paused={!isPlaying}
          volume={volume}
          rate={playbackRate}
          resizeMode={resizeMode}
          onLoad={handleVideoLoad}
          onLoadStart={handleVideoLoadStart}
          onProgress={handleVideoProgress}
          onEnd={() => handlePlayStateChange(false)}
          onError={handleVideoError}
          onBuffer={handleVideoBuffer}
          onReadyForDisplay={handleVideoLoadEnd}
          automaticallyWaitsToMinimizeStalling={true} // For better streaming
          bufferConfig={{
            minBufferMs: 15000,
            maxBufferMs: 50000,
            bufferForPlaybackMs: 2500,
            bufferForPlaybackAfterRebufferMs: 5000,
          }}
          textTracks={
            (media.media[media.index] as RawVideo)?.subtitles
              ?.filter(subtitle => subtitle.name && subtitle.language)
              .map((subtitle: Subtitle) => ({
                title: subtitle.name!,
                language: subtitle.language! as ISO639_1,
                uri: subtitle.url,
                type: subtitle.mimeType?.includes('vtt')
                  ? ('vtt' as TextTrackType)
                  : ('srt' as TextTrackType),
              })) || []
          }
          selectedTextTrack={
            selectedSubtitle
              ? ({
                  type: 'language',
                  value: selectedSubtitle.language,
                } as SelectedTrack)
              : undefined
          }
          pictureInPicture={true}
          playInBackground={true}
        />
      )}
      <VideoPlayerControls
        videoTitle={details.name}
        isPlaying={isPlaying}
        duration={duration}
        currentTime={currentTime}
        setCurrentTime={setCurrentTime}
        setDuration={setDuration}
        setIsPlaying={handlePlayStateChange}
        onSeek={handleSeek}
        onFullscreenToggle={handleFullscreenToggle}
        onVolumeChange={handleVolumeChange}
        onPlaybackRateChange={handlePlaybackRateChange}
        onQualityChange={handleQualityChange}
        onSubtitleChange={handleSubtitleChange}
        subtitles={media.media[media.index]?.subtitles || []}
        selectedSubtitle={selectedSubtitle}
        isBuffering={isLoading || isBuffering}
        bufferedTime={bufferedTime}
        isFullscreen={isFullscreen}
        onDoubleTapSeek={handleDoubleTapSeek}
        onSwipeSeek={handleSwipeSeek}
        onBrightnessChange={handleBrightnessChange}
        playbackRate={playbackRate}
        volume={volume}
      />
    </View>
  );
};

const VideoPlayer = ({media}: {media: MediaToView}) => {
  console.log('[VideoPlayer] Mounted');
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoPlayerError, setVideoPlayerError] = useState(false);
  const videoRef = useRef<any>(null);
  const theme = useTheme();
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Video player control states
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [brightness, setBrightness] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(true); // Default to fullscreen
  const [quality, setQuality] = useState('Auto');
  const [selectedSubtitle, setSelectedSubtitle] = useState<any>(null);
  const [isBuffering, setIsBuffering] = useState(true);
  const [bufferedTime, setBufferedTime] = useState(0);
  const [resizeMode, setResizeMode] = useState<'contain' | 'cover' | 'stretch'>(
    'contain',
  );
  const [videoReady, setVideoReady] = useState(false);

  const {width, height} = Dimensions.get('window');

  // Get initial brightness and lock orientation
  useEffect(() => {
    // Lock to landscape mode when component mounts
    Orientation.lockToLandscape();

    // Fetch current brightness
    SystemSetting.getBrightness()
      .then(setBrightness)
      .catch(() => {});

    // Cleanup function to unlock orientation when component unmounts
    return () => {
      Orientation.unlockAllOrientations();
    };
  }, []);

  // Memoize the current video URL to prevent unnecessary re-renders
  const currentVideoUrl = useMemo(() => {
    return media.media?.[media.index]?.url || null;
  }, [media.media, media.index]);

  // Reset video state when source changes (but only when it actually changes)
  const [lastVideoUrl, setLastVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (currentVideoUrl && currentVideoUrl !== lastVideoUrl) {
      console.log(
        '[useEffect] Video source changed, resetting states from:',
        lastVideoUrl,
        'to:',
        currentVideoUrl,
      );
      setIsLoading(true);
      setIsBuffering(true);
      setVideoReady(false);
      setCurrentTime(0);
      setBufferedTime(0); // Reset buffered time when source changes
      setHasError(false);
      setVideoPlayerError(false);
      setLastVideoUrl(currentVideoUrl);
    }
  }, [currentVideoUrl, lastVideoUrl]);

  // Ensure we only auto-resume once after the first ready event
  const hasAutoPlayedRef = useRef(false);

  // Fallback component when react-native-video fails
  const VideoPlayerFallback = () => (
    <View style={styles.container}>
      <Card style={styles.fallbackContainer}>
        <Card.Content style={styles.fallbackContent}>
          <Text variant="headlineSmall" style={styles.fallbackTitle}>
            Video Player Error
          </Text>
          <Text variant="bodyMedium" style={styles.fallbackMessage}>
            {errorMessage ||
              'Unable to play this video. The video format may not be supported or the stream may be unavailable.'}
          </Text>

          <View style={styles.fallbackButtons}>
            <Button
              mode="contained"
              onPress={openInExternalPlayer}
              style={styles.fallbackButton}>
              Open in External Player
            </Button>

            <Button
              mode="outlined"
              onPress={copyVideoUrl}
              style={styles.fallbackButton}>
              Copy Video URL
            </Button>

            <Button
              mode="text"
              onPress={showVideoInfo}
              style={styles.fallbackButton}>
              Video Information
            </Button>
          </View>
        </Card.Content>
      </Card>
    </View>
  );

  const openInExternalPlayer = async () => {
    const videoUrl = media.media[0].url;

    Alert.alert(
      'Open in External Player',
      'Choose how you want to open this video:',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Browser',
          onPress: async () => {
            try {
              await Linking.openURL(videoUrl);
            } catch (err) {
              Alert.alert('Error', 'Could not open URL in browser');
            }
          },
        },
        {
          text: 'Default Video Player',
          onPress: async () => {
            try {
              await Linking.openURL(videoUrl);
            } catch (err) {
              Alert.alert('Error', 'Could not open video in default player');
            }
          },
        },
      ],
    );
  };

  const copyVideoUrl = () => {
    const videoUrl = media.media[media.index]?.url || '';
    // For React Native, we can't copy to clipboard directly, so we'll show an alert
    Alert.alert('Video URL', videoUrl, [{text: 'OK', style: 'default'}]);
  };

  const showVideoInfo = () => {
    const source = media.media[media.index];
    const info = [
      `Title: ${media.details.name}`,
      `Source: ${source?.name || 'Unknown'}`,
      `Type: ${source?.type || 'Unknown'}`,
      `URL: ${source?.url || 'Unknown'}`,
    ].join('\n\n');

    Alert.alert('Video Information', info, [{text: 'OK', style: 'default'}]);
  };

  const handleVideoError = (err: any) => {
    // We'll be more specific about what constitutes an error
    console.error('[VideoPlayer] onError:', JSON.stringify(err, null, 2));

    // For m3u8, some errors are recoverable or informational, so we don't want to kill the player
    // This is a placeholder for more specific error checking logic in the future
    const isSeriousError =
      err?.error?.code &&
      // These are examples; we can add more non-fatal codes here
      ![
        -11819, // "MEDIA_ERROR_TIMED_OUT"
        -11828, // "MEDIA_ERROR_UNKNOWN" with no specific details
      ].includes(err.error.code);

    if (isSeriousError) {
      setHasError(true);
      setErrorMessage(
        err?.error?.localizedFailureReason ||
          err?.error?.localizedDescription ||
          'An unknown video error occurred.',
      );
    }
  };

  // Memoize all event handlers to prevent Video component re-renders
  const handleVideoLoad = useMemo(
    () => (data: any) => {
      console.log('Video loaded:', data);
      setDuration(data.duration);
      setHasError(false);

      // Mark video as ready and clear loading/buffering flags
      if (!videoReady) {
        setVideoReady(true);
      }
      if (isLoading) {
        setIsLoading(false);
      }
      if (isBuffering) {
        setIsBuffering(false);
      }
      console.log('Video load start');
      setIsLoading(true);
      setIsBuffering(true);
    },
    [videoReady, isLoading, isBuffering],
  );

  const currentTimeRef = useRef(0);
  const bufferedTimeRef = useRef(0);
  const isBufferingRef = useRef(false);
  const isDraggingRef = useRef(false); // Track if user is dragging the slider
  const lastUpdateRef = useRef(Date.now());

  // Called by VideoPlayerControls when user starts/stops dragging
  const setIsDragging = (dragging: boolean) => {
    isDraggingRef.current = dragging;
  };

  const handleVideoProgress = (data: any) => {
    currentTimeRef.current = data.currentTime;
    bufferedTimeRef.current = data.playableDuration;
    // Only update state if not dragging (for UI display)
    // if (!isDraggingRef.current && Date.now() - lastUpdateRef.current > 500) {
    //   setCurrentTime(data.currentTime);
    //   setBufferedTime(data.playableDuration);
    //   lastUpdateRef.current = Date.now();
    // }
  };

  const handleVideoBuffer = (data: any) => {
    isBufferingRef.current = data.isBuffering;
    // Only set state if buffering state actually changes
    if (isBuffering !== data.isBuffering) setIsBuffering(data.isBuffering);
  };

  const handleVideoLoadStart = () => {
    // Only set loading/buffering state if not already set
    if (!isLoading) setIsLoading(true);
    if (!isBuffering) setIsBuffering(true);
  };

  const handleVideoLoadEnd = useMemo(
    () => () => {
      console.log('Video ready for display');
      // Set video as ready only once to avoid re-renders
      if (isLoading) setIsLoading(false);
      if (isBuffering) setIsBuffering(false);
      if (!videoReady) setVideoReady(true);
      // Auto-play the very first time the video becomes ready
      if (!hasAutoPlayedRef.current) {
        hasAutoPlayedRef.current = true;
        setIsPlaying(true);
      }
      handleCast();
    },
    [isLoading, isBuffering, videoReady],
  );

  const handlePlaybackStateChanged = useMemo(
    () => (data: any) => {
      // Only log or update state if needed for UI
      console.log('Playback state changed:', data);
    },
    [],
  );

  const handleVideoSeek = useMemo(
    () => (data: any) => {
      // Only log or update state if needed for UI
      console.log('Video seeked to:', data.currentTime);
    },
    [],
  );

  // Memoize video style to prevent re-renders
  const videoStyle = useMemo(
    () => [styles.video, {width, height}],
    [width, height],
  );

  // Video control handlers
  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.seek(time);
    }
    // Do not setCurrentTime here; let onProgress update it
  };

  // Handle play state changes
  const handlePlayStateChange = (playing: boolean) => {
    console.log('Play state changing to:', playing, 'Video ready:', videoReady);
    // Allow setting play state even if video is not ready yet; the video will
    // start automatically once `videoReady` becomes true.
    setIsPlaying(playing);
  };

  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate);
  };

  const handleQualityChange = (newQuality: string) => {
    setQuality(newQuality);
    // Here you could implement quality switching logic
  };

  const handleSubtitleChange = (subtitle: any) => {
    setSelectedSubtitle(subtitle);
    // Here you could implement subtitle switching logic
  };

  const handleFullscreenToggle = () => {
    // Toggle between contain and cover modes instead of exiting fullscreen
    setResizeMode(prev => (prev === 'contain' ? 'cover' : 'contain'));
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
  };

  const handleSourceChange = (source: any) => {
    // Here you could implement source switching logic
    console.log('Source changed to:', source);
  };

  const handleDoubleTapSeek = (direction: 'forward' | 'backward') => {
    const seekTime = direction === 'forward' ? 10 : -10;
    const newTime = Math.max(0, Math.min(duration, currentTime + seekTime));
    handleSeek(newTime);
  };

  const handleSwipeSeek = (time: number) => {
    handleSeek(time);
  };

  const handlePictureInPicture = () => {
    // Implement picture-in-picture logic
    console.log('Picture-in-picture requested');
  };

  const handleCast = () => {
    // Implement casting logic
    console.log('Cast requested');
  };

  // Memoize subtitles only on media and index (not currentTime)
  const textTracks = useMemo(() => {
    if (!media.media || media.media.length === 0) return [];
    const source = media.media[media.index];
    if (!source || source.type !== MediaType.RawVideo) return [];
    return (source.subtitles || []).map((subtitle, index) => ({
      title: subtitle.name || subtitle.language || `Subtitle ${index + 1}`,
      language: subtitle.language || 'en',
      type: 'application/x-subrip',
      uri: subtitle.url,
    }));
  }, [media.media, media.index]);

  if (!media?.media?.[media.index]?.url) return null; // or a loading indicator

  const videoSource = useMemo(() => {
    if (!currentVideoUrl) return null;
    const currentMedia = media.media[media.index];

    const source: any = {
      uri: currentVideoUrl,
      headers: media.media[media.index].headers,
    };

    // Explicitly set type for HLS streams for better compatibility
    if ('isM3U8' in currentMedia && currentMedia.isM3U8) {
      source.type = 'm3u8';
    }

    return source;
  }, [currentVideoUrl, media.index]);

  // Memoize selectedTextTrack only on selectedSubtitle
  const selectedTextTrack = useMemo(() => {
    return selectedSubtitle
      ? ({
          type: 'language',
          value: selectedSubtitle.language,
        } as SelectedTrack)
      : undefined;
  }, [selectedSubtitle]);

  // Handle brightness change from gesture
  const handleBrightnessChange = (delta: number) => {
    const newBrightness = Math.max(0, Math.min(1, brightness + delta));
    SystemSetting.setBrightness(newBrightness).then(() => {
      setBrightness(newBrightness);
    });
  };

  return (
    <View style={styles.container}>
      <VideoPlayerContent
        hasError={hasError}
        videoPlayerError={videoPlayerError}
        VideoPlayerFallback={VideoPlayerFallback}
        currentVideoUrl={currentVideoUrl}
        videoRef={videoRef}
        videoSource={videoSource}
        styles={styles}
        isPlaying={isPlaying}
        volume={volume}
        playbackRate={playbackRate}
        resizeMode={resizeMode}
        handleVideoLoad={handleVideoLoad}
        handleVideoLoadStart={handleVideoLoadStart}
        handleVideoProgress={handleVideoProgress}
        handleVideoError={handleVideoError}
        handleVideoBuffer={handleVideoBuffer}
        handleVideoLoadEnd={handleVideoLoadEnd}
        media={media}
        selectedSubtitle={selectedSubtitle}
        details={media.details}
        duration={duration}
        currentTime={currentTime}
        setCurrentTime={setCurrentTime}
        setDuration={setDuration}
        handlePlayStateChange={handlePlayStateChange}
        handleSeek={handleSeek}
        handleFullscreenToggle={handleFullscreenToggle}
        handleVolumeChange={handleVolumeChange}
        handlePlaybackRateChange={handlePlaybackRateChange}
        handleQualityChange={handleQualityChange}
        handleSubtitleChange={handleSubtitleChange}
        isLoading={isLoading}
        isBuffering={isBuffering}
        bufferedTime={bufferedTime}
        isFullscreen={isFullscreen}
        handleDoubleTapSeek={handleDoubleTapSeek}
        handleSwipeSeek={handleSwipeSeek}
        handleBrightnessChange={handleBrightnessChange}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  fallbackContainer: {
    margin: 20,
    padding: 20,
  },
  fallbackContent: {
    alignItems: 'center',
  },
  fallbackTitle: {
    textAlign: 'center',
    marginBottom: 16,
  },
  fallbackMessage: {
    textAlign: 'center',
    marginBottom: 24,
  },
  fallbackButtons: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  fallbackButton: {
    width: '100%',
  },
  videoInfo: {
    width: '100%',
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
});

export default VideoPlayer;
