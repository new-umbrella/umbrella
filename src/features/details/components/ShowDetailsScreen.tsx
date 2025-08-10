import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import {useTheme} from 'react-native-paper';

const {width} = Dimensions.get('window');

interface Episode {
  id: string;
  title: string;
  description: string;
  duration: string;
  thumbnail: string;
  isDownloaded?: boolean;
}

interface ShowDetailsScreenProps {
  show: {
    title: string;
    year: string;
    rating: string;
    seasons: string;
    description: string;
    cast: string;
    creator: string;
    genres: string[];
    episodes: Episode[];
  };
}

const ShowDetailsScreen: React.FC<ShowDetailsScreenProps> = ({show}) => {
  const theme = useTheme();

  const mockShow = {
    title: 'Stranger Things',
    year: '2022',
    rating: 'U/A',
    seasons: '4 Seasons',
    description:
      "On his way home from a friend's house, young Will sees something terrifying. Nearby, a sinister secret lurks in the depths of a government lab.",
    cast: 'Winona Ryder, David Harbour, Millie Bobby Brown...',
    creator: 'The Duffer Brothers',
    genres: ['Sci-Fi', 'Horror', 'Drama'],
    episodes: [
      {
        id: '1',
        title: 'S1:E1 Chapter One: The Vanishing of Will Byers',
        description:
          "On his way home from a friend's house, young Will sees something terrifying. Nearby, a sinister secret lurks in the depths of a government lab.",
        duration: '51 min',
        thumbnail: 'placeholder',
      },
      {
        id: '2',
        title: 'S1:E2 Chapter Two: The Weirdo on Maple Street',
        description:
          'A frantic mother searches for her missing son. A police chief helps her investigation.',
        duration: '56 min',
        thumbnail: 'placeholder',
      },
    ],
  };

  const data = show || mockShow;

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      {/* Hero Image */}
      <View style={styles.heroContainer}>
        <Image
          source={{
            uri: 'https://via.placeholder.com/375x205/000000/FFFFFF?text=Stranger+Things',
          }}
          style={styles.heroImage}
          resizeMode="cover"
        />
        <View style={styles.heroOverlay}>
          <Text style={styles.previewText}>Preview</Text>
          <View style={styles.heroControls}>
            <TouchableOpacity style={styles.controlButton}>
              <Text style={styles.controlButtonText}>Cast</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton}>
              <Text style={styles.controlButtonText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton}>
              <Text style={styles.controlButtonText}>Mute</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Show Info */}
      <View style={styles.showInfo}>
        <View style={styles.seriesBadge}>
          <Text style={styles.seriesText}>SERIES</Text>
        </View>
        <Text style={[styles.title, {color: theme.colors.onSurface}]}>
          {data.title}
        </Text>
        <View style={styles.metaInfo}>
          <Text
            style={[styles.metaText, {color: theme.colors.onSurfaceVariant}]}>
            {data.year}
          </Text>
          <View
            style={[
              styles.ratingBadge,
              {backgroundColor: theme.colors.surfaceVariant},
            ]}>
            <Text style={[styles.ratingText, {color: theme.colors.onSurface}]}>
              {data.rating}
            </Text>
          </View>
          <Text
            style={[styles.metaText, {color: theme.colors.onSurfaceVariant}]}>
            {data.seasons}
          </Text>
          <View style={[styles.hdBadge, {borderColor: theme.colors.outline}]}>
            <Text style={[styles.hdText, {color: theme.colors.onSurface}]}>
              HD
            </Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.playButton, {backgroundColor: theme.colors.primary}]}>
          <Text style={styles.playButtonText}>Play</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.downloadButton,
            {backgroundColor: theme.colors.surfaceVariant},
          ]}>
          <Text
            style={[
              styles.downloadButtonText,
              {color: theme.colors.onSurface},
            ]}>
            Download S1:E1
          </Text>
        </TouchableOpacity>
      </View>

      {/* Additional Actions */}
      <View style={styles.additionalActions}>
        <TouchableOpacity style={styles.actionItem}>
          <Text
            style={[styles.actionText, {color: theme.colors.onSurfaceVariant}]}>
            My List
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionItem}>
          <Text
            style={[styles.actionText, {color: theme.colors.onSurfaceVariant}]}>
            Rate
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionItem}>
          <Text
            style={[styles.actionText, {color: theme.colors.onSurfaceVariant}]}>
            Share
          </Text>
        </TouchableOpacity>
      </View>

      {/* Description */}
      <View style={styles.descriptionSection}>
        <Text
          style={[styles.description, {color: theme.colors.onSurfaceVariant}]}>
          {data.description}
        </Text>
        <Text style={[styles.cast, {color: theme.colors.onSurfaceVariant}]}>
          Cast: {data.cast}
        </Text>
        <Text style={[styles.creator, {color: theme.colors.onSurfaceVariant}]}>
          Creator: {data.creator}
        </Text>
      </View>

      {/* Navigation Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabs}>
          <Text
            style={[
              styles.tab,
              styles.activeTab,
              {color: theme.colors.onSurface},
            ]}>
            Episodes
          </Text>
          <Text style={[styles.tab, {color: theme.colors.onSurfaceVariant}]}>
            Collection
          </Text>
          <Text style={[styles.tab, {color: theme.colors.onSurfaceVariant}]}>
            More Like This
          </Text>
          <Text style={[styles.tab, {color: theme.colors.onSurfaceVariant}]}>
            Trailers & More
          </Text>
        </ScrollView>
        <View
          style={[
            styles.activeTabIndicator,
            {backgroundColor: theme.colors.primary},
          ]}
        />
      </View>

      {/* Season Selector */}
      <View style={styles.seasonSelector}>
        <Text style={[styles.seasonText, {color: theme.colors.onSurface}]}>
          {data.title}
        </Text>
        <Text
          style={[
            styles.seasonDropdown,
            {color: theme.colors.onSurfaceVariant},
          ]}>
          ⌄
        </Text>
      </View>

      {/* Episodes List */}
      <View style={styles.episodesList}>
        {data.episodes.map(episode => (
          <View
            key={episode.id}
            style={[
              styles.episodeItem,
              {borderBottomColor: theme.colors.outline},
            ]}>
            <Image
              source={{
                uri:
                  'https://via.placeholder.com/116x75/333333/FFFFFF?text=E' +
                  episode.id,
              }}
              style={styles.episodeThumbnail}
            />
            <View style={styles.episodeInfo}>
              <Text
                style={[styles.episodeTitle, {color: theme.colors.onSurface}]}>
                {episode.title}
              </Text>
              <Text
                style={[
                  styles.episodeDescription,
                  {color: theme.colors.onSurfaceVariant},
                ]}>
                {episode.description}
              </Text>
              <Text
                style={[
                  styles.episodeDuration,
                  {color: theme.colors.onSurfaceVariant},
                ]}>
                {episode.duration}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroContainer: {
    position: 'relative',
    height: 205,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'space-between',
    padding: 16,
  },
  previewText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  heroControls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
  },
  controlButton: {
    padding: 8,
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 12,
  },
  showInfo: {
    padding: 16,
  },
  seriesBadge: {
    backgroundColor: '#e50914',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  seriesText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 14,
  },
  ratingBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  hdBadge: {
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
  },
  hdText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  playButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  playButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  downloadButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  downloadButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  additionalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
  },
  actionItem: {
    alignItems: 'center',
  },
  actionText: {
    fontSize: 12,
    marginTop: 4,
  },
  descriptionSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  cast: {
    fontSize: 14,
    marginBottom: 4,
  },
  creator: {
    fontSize: 14,
  },
  tabsContainer: {
    marginBottom: 16,
  },
  tabs: {
    paddingHorizontal: 16,
  },
  tab: {
    fontSize: 16,
    marginRight: 24,
    paddingVertical: 8,
  },
  activeTab: {
    fontWeight: 'bold',
  },
  activeTabIndicator: {
    height: 2,
    width: 60,
    marginLeft: 16,
  },
  seasonSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  seasonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  seasonDropdown: {
    fontSize: 16,
  },
  episodesList: {
    paddingHorizontal: 16,
  },
  episodeItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  episodeThumbnail: {
    width: 116,
    height: 75,
    borderRadius: 4,
    marginRight: 12,
  },
  episodeInfo: {
    flex: 1,
  },
  episodeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  episodeDescription: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 4,
  },
  episodeDuration: {
    fontSize: 12,
  },
});

export default ShowDetailsScreen;
