import React, {useRef, useState, useEffect} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  FlatList,
  StatusBar,
} from 'react-native';
import {Appbar, Menu, Text, useTheme, Icon} from 'react-native-paper';
import Video, {VideoRef} from 'react-native-video';
import VideoPlayerControls from '../components/VideoPlayerControls';
import {MediaToView} from '../../domain/entities/MediaToView';
import RawVideo from '../../../plugins/data/model/media/RawVideo';
import {Subtitle} from '../../../plugins/data/model/media/Subtitle';
import ItemMedia from '../../../plugins/data/model/item/ItemMedia';
import Orientation, {OrientationType} from 'react-native-orientation-locker';
import SystemNavigationBar from 'react-native-system-navigation-bar';

interface VideoPlayerProps {
  paused?: boolean;
  onEnd?: () => void;
  media?: MediaToView;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onEnterFullscreen?: () => void;
  onExitFullscreen?: () => void;
}

interface VideoPlayerControlsProps {
  isPlaying: boolean;
  progress: number;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  onSeek: (value: number) => void;
  onSkipAndRewind: (value: number) => void;
  subtitles: any[];
  selectedSubtitle: Subtitle | null;
  onSelectSubtitle: (subtitle: Subtitle | null) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onEnterFullscreen?: () => void;
  onExitFullscreen?: () => void;
}

const {width, height} = Dimensions.get('screen');

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  paused = false,
  onEnd,
  media,
}) => {
  const videoRef = useRef<VideoRef>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(!paused);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState<number>(0);
  const [selectedSubtitle, setSelectedSubtitle] = useState<Subtitle | null>(
    null,
  );
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isScreenLocked, setIsScreenLocked] = useState(false);
  // const [selectedQuality, setSelectedQuality] = useState<QualityOption | null>(
  //   null,
  // );

  useEffect(() => {
    setIsPlaying(!paused);
  }, [paused]);

  const handlePlayPause = () => {
    setIsPlaying(prev => !prev);
  };

  const handleProgress = (data: {
    currentTime: number;
    playableDuration: number;
  }) => {
    setCurrentTime(data.currentTime);
    setProgress(data.currentTime / duration);
  };

  const handleLoad = (data: {duration: number}) => {
    setDuration(data.duration);
  };

  const handleSeek = (value: number) => {
    const seekTime = value * duration;
    setCurrentTime(seekTime);
    videoRef.current?.seek(seekTime);
  };

  const handleSkipAndRewind = (value: number) => {
    const clampedValue = Math.max(0, Math.min(value, duration));
    setCurrentTime(clampedValue);
    videoRef.current?.seek(clampedValue);
  };

  const handlePlaybackSpeedChange = () => {
    const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
    const currentIndex = speeds.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % speeds.length;
    setPlaybackRate(speeds[nextIndex]);
  };

  const handleScreenLockToggle = () => {
    setIsScreenLocked(prev => !prev);
  };

  const [dimensions, setDimensions] = useState(Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({window}) => {
      setDimensions(window);
    });
    return () => subscription.remove();
  }, []);

  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
  };

  const exitFullscreen = async () => {
    await SystemNavigationBar.navigationShow();
    setIsFullscreen(false);
    // Orientation.unlockAllOrientations();
  };

  const enterFullscreen = async () => {
    await SystemNavigationBar.immersive();
    setIsFullscreen(true);
    // Orientation.lockToLandscapeLeft();
  };

  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<'episodes' | 'more'>('episodes');
  const [isInList, setIsInList] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);
  const itemsPerPage = 20;

  const handleEpisodePress = (index: number) => {
    setSelectedEpisode(index);
    // TODO Handle Extraction
    // if (media?.details?.media[index].url) {
    videoRef.current?.seek(0);
    // }
  };

  const handleDownloadPress = (episode: ItemMedia) => {
    // TODO Handle Download
  };

  // When device enters landscape mode
  useEffect(() => {
    const subscription = Orientation.addDeviceOrientationListener(
      async (deviceOrentation: OrientationType) => {
        console.log('Device orientation changed');
        if (deviceOrentation === 'LANDSCAPE-LEFT') {
          await SystemNavigationBar.immersive();
          setIsFullscreen(true);
          // Orientation.lockToLandscapeLeft();
        } else if (deviceOrentation === 'LANDSCAPE-RIGHT') {
          await SystemNavigationBar.immersive();
          setIsFullscreen(true);
          // Orientation.lockToLandscapeRight();
        } else {
          await SystemNavigationBar.navigationShow();
          setIsFullscreen(false);
          // Orientation.lockToPortrait();
        }
      },
    );
    return () => Orientation.removeOrientationListener(subscription as any);
    // return () => subscription.remove();
  }, []);

  const renderEpisodeItem = ({item, index}: {item: any; index: number}) => (
    <TouchableOpacity
      style={[
        styles.episodeItem,
        selectedEpisode === index && styles.selectedEpisodeItem,
      ]}
      onPress={() => {
        setSelectedEpisode(index);
        if (item.videoUrl) {
          videoRef.current?.seek(0);
        }
      }}>
      <Text style={styles.episodeNumber}>{index + 1}</Text>
      <Image
        source={{uri: item.imageUrl || media?.details?.imageUrl}}
        // blurRadius={3}
        style={styles.episodeThumbnail}
      />
      <View style={styles.episodeInfo}>
        <Text style={styles.episodeTitle} numberOfLines={2}>
          {item.name || `Episode ${index + 1}`}
        </Text>
        {item.duration && (
          <Text style={styles.episodeDuration}>{item.duration}</Text>
        )}
      </View>
      <TouchableOpacity style={styles.downloadButton}>
        <Icon source="download" size={24} color="#fff" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (!media) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (isFullscreen) {
    return (
      <View style={[styles.container, styles.fullscreenContainer]}>
        <StatusBar hidden={true} />
        {/* Fullscreen Video Player Only */}
        <View
          style={{
            ...styles.videoContainer,
            height: Dimensions.get('screen').height,
            width: Dimensions.get('screen').width,
            aspectRatio: undefined,
          }}>
          <Video
            ref={videoRef}
            source={{
              uri: media?.media[selectedEpisode].url,
              headers: media?.media[selectedEpisode].headers,
            }}
            paused={!isPlaying}
            rate={playbackRate}
            onEnd={onEnd}
            onBuffer={() => setIsBuffering(true)}
            onReadyForDisplay={() => setIsBuffering(false)}
            onProgress={handleProgress}
            onLoad={handleLoad}
            style={{
              width: Dimensions.get('screen').width,
              height: Dimensions.get('screen').height,
              aspectRatio: undefined,
              position: 'absolute',
              zIndex: 1000,
            }}
            resizeMode="contain"
          />
          <VideoPlayerControls
            isPlaying={isPlaying}
            progress={progress}
            currentTime={currentTime}
            duration={duration}
            onTogglePlay={handlePlayPause}
            onSeek={handleSeek}
            onSkipAndRewind={handleSkipAndRewind}
            subtitles={[...(media?.media.map((m: any) => m.subtitle) || [])]}
            selectedSubtitle={selectedSubtitle}
            onSelectSubtitle={setSelectedSubtitle}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
            onEnterFullscreen={enterFullscreen}
            onExitFullscreen={exitFullscreen}
            playbackRate={playbackRate}
            onPlaybackSpeedChange={handlePlaybackSpeedChange}
            isScreenLocked={isScreenLocked}
            onScreenLockToggle={handleScreenLockToggle}
          />
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <StatusBar hidden={false} />
      {/* Video Player Section */}
      <View style={styles.videoContainer}>
        <Video
          ref={videoRef}
          source={{
            uri: media?.media[selectedEpisode].url,
            headers: media?.media[selectedEpisode].headers,
          }}
          paused={!isPlaying}
          rate={playbackRate}
          onEnd={onEnd}
          onBuffer={() => setIsBuffering(true)}
          onReadyForDisplay={() => setIsBuffering(false)}
          onProgress={handleProgress}
          onLoad={handleLoad}
          style={styles.videoContainer}
          resizeMode="contain"
        />
        <VideoPlayerControls
          isPlaying={isPlaying}
          progress={progress}
          currentTime={currentTime}
          duration={duration}
          onTogglePlay={handlePlayPause}
          onSeek={handleSeek}
          onSkipAndRewind={handleSkipAndRewind}
          subtitles={[...(media?.media.map((m: any) => m.subtitle) || [])]}
          selectedSubtitle={selectedSubtitle}
          onSelectSubtitle={setSelectedSubtitle}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          onEnterFullscreen={enterFullscreen}
          onExitFullscreen={exitFullscreen}
          playbackRate={playbackRate}
          onPlaybackSpeedChange={handlePlaybackSpeedChange}
          isScreenLocked={isScreenLocked}
          onScreenLockToggle={handleScreenLockToggle}
        />
      </View>

      {/* Media Info Section */}
      {media?.details && (
        <View style={styles.infoContainer}>
          <Text style={styles.title}>{media.details.name}</Text>

          <View style={styles.metaRow}>
            {media.details.matchPercentage && (
              <Text style={styles.matchPercentage}>
                {media.details.matchPercentage}% Match
              </Text>
            )}
            {media.details.releaseDate && (
              <Text style={styles.metaText}>{media.details.releaseDate}</Text>
            )}
            {media.details.rating && (
              <View style={styles.ageBadge}>
                <Text style={styles.ageText}>{media.details.rating}</Text>
              </View>
            )}
            <Text style={styles.metaText}>
              {media.details.media?.length || 1} Episodes
            </Text>
          </View>

          {media.details.genres && (
            <View style={styles.genreRow}>
              {media.details.genres.map((genre, index) => (
                <Text key={index} style={styles.genreText}>
                  {genre.name}
                  {index < (media.details.genres?.length || 0) - 1 && ' • '}
                </Text>
              ))}
            </View>
          )}

          <Text style={styles.description}>
            {media.details.synopsis || media.details.description}
          </Text>
        </View>
      )}

      {/* Episodes Section */}
      <View style={styles.episodesSection}>
        <View style={styles.episodesHeader}>
          <Text style={styles.episodesTitle}>Episodes</Text>
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <TouchableOpacity
                onPress={() => setMenuVisible(true)}
                style={styles.seasonSelector}>
                <Text style={styles.seasonText}>
                  {`${currentPage * itemsPerPage + 1}-${Math.min(
                    (currentPage + 1) * itemsPerPage,
                    media?.details.media.length,
                  )}`}
                </Text>
                <Icon source="chevron-down" size={16} color="#fff" />
              </TouchableOpacity>
            }>
            {Array.from(
              {length: Math.ceil(media?.details.media.length / itemsPerPage)},
              (_, i) => (
                <Menu.Item
                  key={i}
                  onPress={() => {
                    setCurrentPage(i);
                    setMenuVisible(false);
                  }}
                  title={`${i * itemsPerPage + 1}-${Math.min(
                    (i + 1) * itemsPerPage,
                    media?.details.media.length,
                  )}`}
                />
              ),
            )}
          </Menu>
        </View>

        {media?.details.media
          .slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)
          .map((episode, index) => {
            const globalIndex = currentPage * itemsPerPage + index;
            return (
              <TouchableOpacity
                key={episode.id}
                onPress={() => handleEpisodePress(globalIndex)}>
                <View style={styles.episodeItem}>
                  <Text
                    style={{
                      ...styles.episodeNumber,
                      fontSize:
                        (globalIndex + 1).toString().length > 1
                          ? (globalIndex + 1).toString().length > 2
                            ? (globalIndex + 1).toString().length > 3
                              ? 10
                              : 12
                            : 14
                          : 16,
                    }}>
                    {globalIndex + 1}
                  </Text>

                  <Image
                    source={{
                      uri: episode.imageUrl || media?.details.imageUrl,
                    }}
                    // blurRadius={3}
                    style={styles.episodeThumbnail}
                  />

                  <View style={styles.episodeInfo}>
                    <Text style={styles.episodeTitle} numberOfLines={2}>
                      {episode.name}
                    </Text>
                    {episode.duration && (
                      <Text style={styles.episodeDuration}>
                        {episode.duration}
                      </Text>
                    )}
                  </View>

                  <TouchableOpacity
                    style={styles.downloadButton}
                    onPress={() => handleDownloadPress(episode)}>
                    <Icon source="download" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullscreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  videoContainer: {
    // width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  playIcon: {
    marginLeft: 4,
  },
  timelineContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  timeline: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
  },
  progress: {
    height: '100%',
    backgroundColor: '#e50914',
    borderRadius: 2,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Netflix Sans',
  },
  infoContainer: {
    padding: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 16,
    paddingHorizontal: 32,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIcon: {
    width: 24,
    height: 24,
    marginBottom: 8,
  },
  actionText: {
    color: '#777',
    fontSize: 12,
    fontFamily: 'Netflix Sans',
  },
  selectedAction: {
    color: '#e50914',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    fontFamily: 'Netflix Sans',
  },
  matchPercentage: {
    color: '#46d369',
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 8,
    fontFamily: 'Netflix Sans',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  metaText: {
    color: '#777',
    fontSize: 14,
    fontFamily: 'Netflix Sans',
  },
  ageBadge: {
    backgroundColor: '#333',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#777',
  },
  ageText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Netflix Sans',
  },
  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  genreText: {
    color: '#777',
    fontSize: 14,
    fontFamily: 'Netflix Sans',
  },
  description: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 16,
    fontFamily: 'Netflix Sans',
  },
  episodesSection: {
    marginTop: 24,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  episodesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  episodesTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'Netflix Sans',
  },
  seasonSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  seasonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Netflix Sans',
  },
  episodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 8,
    borderRadius: 4,
  },
  episodeNumber: {
    color: '#777',
    width: 24,
    fontFamily: 'Netflix Sans',
    textAlign: 'center',
  },
  episodeThumbnail: {
    width: 120,
    height: 68,
    borderRadius: 4,
  },
  episodeInfo: {
    flex: 1,
  },
  episodeTitle: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 4,
    fontFamily: 'Netflix Sans',
  },
  episodeDuration: {
    color: '#777',
    fontSize: 14,
    fontFamily: 'Netflix Sans',
  },
  downloadButton: {
    padding: 8,
  },
  selectedEpisodeItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
  },
});

export default VideoPlayer;
