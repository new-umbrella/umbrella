import React, { useEffect, useState, useRef } from 'react';
import { DetailsViewModel } from './presentation/viewmodels/DetailsViewModel';
import { useNavigation, useRoute } from '@react-navigation/native';
import DetailedItem from '../plugins/data/model/item/DetailedItem';
import Status from '../../core/shared/types/Status';
import { Plugin } from '../plugins/domain/entities/Plugin';
import { ActivityIndicator, Text } from 'react-native-paper';
import {
  Alert,
  FlatList,
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  useColorScheme,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme, Icon, Menu } from 'react-native-paper';
import CategorySwiper from '../../core/shared/components/CategorySwiper';
import Category from '../plugins/data/model/item/Category';
import SourceType from '../plugins/data/model/source/SourceType';
import RawVideo from '../plugins/data/model/media/RawVideo';
import { MediaToView } from '../media/domain/entities/MediaToView';
import { LibraryViewModel } from '../library/presentation/viewmodels/LibraryViewModel';
import {
  Favorite,
  FavoriteCategoryType,
} from '../library/domain/entities/Favorite';
import Item from '../plugins/data/model/item/Item';
import { useFavoriteStore } from './presentation/state/useFavoriteStore';
import { useExtractorServiceStore } from '../../data/services/extractor/presentation/state/ExtractorServiceStore';
import BottomSheet from '@gorhom/bottom-sheet';
import SystemNavigationBar from 'react-native-system-navigation-bar';
import ExtractorVideo from '../plugins/data/model/media/ExtractorVideo';

interface RouteParams {
  itemId: string;
  plugin: Plugin;
}

const { width, height } = Dimensions.get('window');

const DetailsNavigator = () => {
  const route = useRoute();
  const { itemId, plugin } = route.params as RouteParams;

  const [details, setDetails] = useState<DetailedItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const detailsViewModel = new DetailsViewModel();

  const navigation = useNavigation();

  // ExtractorServiceStore for handling episode extraction
  const {
    setDetailedItem,
    setMediaIndex,
    setBottomSheetVisible,
    setRawSources,
    mediaIndex,
    rawSources,
  } = useExtractorServiceStore(state => state);

  useEffect(() => {
    fetchItemDetails();
  }, [itemId, plugin]);

  const fetchItemDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await detailsViewModel.fetchDetails(itemId, plugin);

      if (result.status === 'success') {
        setDetails(result.data);
      } else if (result.status === 'error') {
        setError(result.error || 'Failed to fetch details');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // useEffect(() => {
  //   const getRawSources = async (index: number) => {
  //     console.log("index", index)
  //     console.log(await detailsViewModel.getItemMedia(
  //       details!.media[index].id,
  //       plugin,
  //     ))
  //     setRawSources(
  //       await detailsViewModel.getItemMedia(
  //         details!.media[index].id,
  //         plugin,
  //       ),
  //     );
  //   };

  //   getRawSources(mediaIndex);
  // }, [mediaIndex]);

  // console.log('rawSources', rawSources);

  const handlePlay = () => {
    console.log('Play pressed for item:', itemId);
    // Implement play functionality
    (navigation as any).navigate('media' as unknown as never, {
      media: {
        type: 'Video',
        media: [
          {
            type: 'RawVideo',
            url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            headers: {},
          },
        ] as RawVideo[],
        details: details,
        index: 0,
      } as MediaToView,
    });
  };

  const handleDownload = (episode: any) => {
    console.log('Download episode:', episode.id);
    // Implement download functionality
  };

  const libraryViewModel = new LibraryViewModel();
  const favorites = libraryViewModel.getFavorites();

  const { isFavorited, setItem, setVisible, visible } = useFavoriteStore();

  const [favorite, setFavorite] = useState<Favorite | undefined>(undefined);
  const [isFavorite, setIsFavorite] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isFavorite && details?.type && favorites.length > 0) {
      setIsFavorite(
        favorites.some(
          (fav: Favorite) =>
            fav.item?.id === itemId &&
            fav.type === details?.type &&
            fav.item?.source?.name === plugin.name &&
            fav.item?.source?.author === plugin.author,
        ),
      );
    }
  }, [isFavorite, details?.type, isFavorited, visible]);

  useEffect(() => {
    if (isFavorite === true) {
      setFavorite(
        libraryViewModel
          .getFavorites()
          .find(
            (fav: Favorite) =>
              fav.item?.id === itemId &&
              fav.type === details?.type &&
              fav.item?.source?.name === plugin.name &&
              fav.item?.source?.author === plugin.author,
          ),
      );
    }
  }, [isFavorite]);

  const handleAddToList = () => {
    setItem({
      id: itemId,
      name: details?.name,
      imageUrl: details?.imageUrl,
      type: details?.type,
      url: details?.url,
      description: details?.description,
      source: plugin,
    } as Item);

    setVisible(true);
  };

  const handleShare = () => {
    console.log('Share pressed for item:', itemId);
    // Implement share functionality
  };

  const handleBack = () => {
    // Navigation handled by React Navigation
    // console.log('Back pressed');
    navigation.goBack();
  };

  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<'episodes' | 'more'>('episodes');
  const [isInList, setIsInList] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);
  const itemsPerPage = 20;

  // const handleAddToList = () => {
  //   setIsInList(!isInList);
  //   onAddToList();
  // };

  const getRawSources = async (index: number) => {
    console.log('index', index);
    // console.log('path', plugin.pluginPath);
    // console.log('id', details!.media[index].id);
    // console.log('getItemMedia', detailsViewModel.getItemMedia);
    console.log(
      await detailsViewModel.getItemMedia(details!.media[index].id, plugin),
    );
    setRawSources(
      await detailsViewModel.getItemMedia(details!.media[index].id, plugin),
    );
    // setRawSources(
    //   [...rawSources, {
    //     name: 'Universal Extractor',
    //     url: details!.media[index].url,
    //     type: 'ExtractorVideo',
    //     headers: {},
    //   } as ExtractorVideo]
    // );
  };

  const handleEpisodePress = async (episodeIndex: number) => {
    if (details) {
      // Set the detailed item and media index in the extractor store
      setDetailedItem(details);
      setMediaIndex(episodeIndex);
      await getRawSources(episodeIndex);
      // Open the extractor bottom sheet
      setBottomSheetVisible(true);
    }
  };

  const handleDownloadPress = (episode: any) => {
    // download episode
  };

  useEffect(() => {
    SystemNavigationBar.setNavigationColor(theme.colors.background);
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor(theme.colors.background);
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Error: {error}</Text>
      </View>
    );
  }

  if (!details) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>No details available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Image
            source={{
              uri: details.imageUrl,
            }}
            style={styles.heroImage}
            // blurRadius={1}
            resizeMode="cover"
          />

          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,1)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.gradient}
          />

          {/* Back Button */}
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Icon source="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>

          {/* Hero Content */}
        </View>
        <View style={styles.heroContent}>
          <Text style={styles.title}>{details.name}</Text>

          <View style={styles.metaRow}>
            {details.releaseDate && (
              <Text style={styles.metaText}>{details.releaseDate}</Text>
            )}
            {details.rating && (
              <View style={styles.ageBadge}>
                <Text style={styles.ageText}>{details.rating}</Text>
              </View>
            )}
            <Text style={styles.metaText}>{details.media.length}</Text>
            <Text style={styles.qualityText}>{details.description}</Text>
          </View>

          {details.genres && details.genres.length > 0 && (
            <View style={styles.genreRow}>
              {details.genres.map((genre, index) => (
                <Text key={index} style={styles.genreText}>
                  {genre.name}
                  {index < (details.genres!.length || 0) - 1 && ' • '}
                </Text>
              ))}
            </View>
          )}

          {typeof details.creators === 'string' ? (
            <View style={styles.creatorsRow}>
              <Text
                style={{
                  ...styles.creatorText,
                  borderColor: theme.colors.primary,
                }}>
                {details.creators}
              </Text>
            </View>
          ) : (
            details.creators &&
            details.creators.length > 0 && (
              <View style={styles.creatorsRow}>
                {details.creators.map((creator, index) => (
                  <Text
                    key={index}
                    style={{
                      ...styles.creatorText,
                      borderColor: theme.colors.primary,
                    }}>
                    {creator}
                  </Text>
                ))}
              </View>
            )
          )}

          {typeof details.otherNames === 'string' ? (
            <View style={styles.otherNamesRow}>
              <Text style={styles.otherNameText}>{details.otherNames}</Text>
            </View>
          ) : (
            details.otherNames &&
            details.otherNames.length > 0 && (
              <View style={styles.otherNamesRow}>
                {details.otherNames.map((otherName, index) => (
                  <Text key={index} style={styles.otherNameText}>
                    {otherName}
                  </Text>
                ))}
              </View>
            )
          )}

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.playButton} onPress={handlePlay}>
              <Icon source="play" size={20} color="#000" />
              <Text style={styles.playButtonText}>Play</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                if (isFavorite && favorite) {
                  // Remove from favorites
                  libraryViewModel.removeFavorite(favorite.id);
                  setIsFavorite(false);
                } else {
                  // Add to favorites
                  handleAddToList();
                }
              }}>
              <Icon
                source={isFavorite && favorite ? 'check' : 'plus'}
                size={24}
                color="#fff"
              />
              <Text style={styles.secondaryButtonText}>
                {isFavorite ? 'Remove' : 'My list'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.contentSection}>
          <Text style={styles.description}>{details.synopsis}</Text>

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
                        details.media.length,
                      )}`}
                    </Text>
                    <Icon source="chevron-down" size={16} color="#fff" />
                  </TouchableOpacity>
                }>
                {Array.from(
                  { length: Math.ceil(details.media.length / itemsPerPage) },
                  (_, i) => (
                    <Menu.Item
                      key={i}
                      onPress={() => {
                        setCurrentPage(i);
                        setMenuVisible(false);
                      }}
                      title={`${i * itemsPerPage + 1}-${Math.min(
                        (i + 1) * itemsPerPage,
                        details.media.length,
                      )}`}
                    />
                  ),
                )}
              </Menu>
            </View>

            {details.media
              .sort((a, b) => a.number - b.number)
              .slice(
                currentPage * itemsPerPage,
                (currentPage + 1) * itemsPerPage,
              )
              .map((episode, index) => {
                const globalIndex = currentPage * itemsPerPage + index;
                return (
                  <TouchableOpacity
                    key={episode.id}
                    // onPress={() => handlePlay()}>
                    onPress={async () => await handleEpisodePress(globalIndex)}>
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
                          uri: episode.imageUrl || details.imageUrl,
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

          {/* More Like This Section */}
          {details.related && details.related.length > 0 && (
            <View style={styles.moreSection}>
              <CategorySwiper
                category={{
                  name: 'More Like This',
                  url: '',
                  isPaginated: false,
                  items: details.related,
                  source: plugin,
                }}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default DetailsNavigator;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  heroSection: {
    height: height / 4,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  heroContent: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  metaText: {
    color: '#fff',
    fontSize: 14,
  },
  ageBadge: {
    backgroundColor: '#333',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
  },
  ageText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  qualityText: {
    color: '#fff',
    fontSize: 12,
    backgroundColor: '#333',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2,
  },
  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  genreText: {
    color: '#ccc',
    fontSize: 14,
  },
  creatorsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  creatorText: {
    color: '#fff',
    fontSize: 14,
    marginRight: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 4,
  },
  otherNamesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  otherNameText: {
    color: '#fff',
    backgroundColor: '#333',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    fontSize: 14,
  },
  actionRow: {
    flexDirection: 'column',
    gap: 8,
    alignItems: 'center',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 4,
    gap: 8,
    width: '100%',
    justifyContent: 'center',
  },
  playButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 4,
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  contentSection: {
    padding: 16,
  },
  description: {
    color: '#ccc',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 16,
  },
  creditsSection: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  creditsLabel: {
    color: '#666',
    fontSize: 14,
  },
  creditsText: {
    color: '#ccc',
    fontSize: 14,
    flex: 1,
  },
  episodesSection: {
    marginTop: 24,
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
  },
  seasonSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seasonText: {
    color: '#fff',
    fontSize: 16,
  },
  episodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  episodeNumber: {
    color: '#666',
    width: 24,
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
    fontSize: 14,
    marginBottom: 4,
  },
  episodeDuration: {
    color: '#666',
    fontSize: 12,
  },
  downloadButton: {
    padding: 8,
  },
  moreSection: {
    marginTop: 24,
    marginLeft: -16,
  },
  moreTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  similarItem: {
    marginRight: 12,
  },
  similarImage: {
    width: 120,
    height: 180,
    borderRadius: 4,
  },
  similarTitle: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
  },
});
