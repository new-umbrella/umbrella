import React, {useEffect, useState} from 'react';
import {ScrollView, StatusBar, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import HomexHero from './presentation/components/HomeHero';
import CategorySwiper from '../../core/shared/components/CategorySwiper';
import SourceType from '../plugins/data/model/source/SourceType';
import Category from '../plugins/data/model/item/Category';
import {useNavigation} from '@react-navigation/native';
import {
  ActivityIndicator,
  Appbar,
  FAB,
  TouchableRipple,
  useTheme,
} from 'react-native-paper';
import {useProfileStore} from '../profile/presentation/state/useProfileStore';
import {SvgUri} from 'react-native-svg';
import {useHomePageDataStore} from './presentation/state/useHomePageDataStore';
import {Plugin} from '../plugins/domain/entities/Plugin';
import {PluginService} from '../plugins/data/datasource/PluginService';
import {useLibraryPageDataStore} from '../library/presentation/state/useLibraryPageDataStore';
import {useFavoriteStore} from '../details/presentation/state/useFavoriteStore';
import Item from '../plugins/data/model/item/Item';
import {usePluginSelectorBottomSheetStore} from './presentation/state/usePluginSelectorBottomSheetStore';

interface HomeNavigatorProps {
  navigation?: any;
}

/**
 * HomeNavigator component
 *
 * This component serves as the main home screen navigator,
 * integrating the complete Netflix-style HomeScreen from anime-streaming-ui
 *
 * @param props - Component props
 * @returns HomeNavigator component
 */

const mockHeroData = {
  title: 'Attack on Titan',
  description:
    'After his hometown is destroyed and his mother is killed, young Eren Jaeger vows to cleanse the earth of the giant humanoid Titans that have brought humanity to the brink of extinction.',
  imageUrl:
    'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&q=80',
  rating: 'TV-MA',
  year: '2013',
  duration: '24 min',
};

const mockCategories: Category[] = [
  {
    name: 'Trending Now',
    url: '/trending',
    isPaginated: false,
    items: [
      {
        id: '1',
        name: 'Demon Slayer',
        imageUrl:
          'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=300&q=80',
        url: '/anime/demon-slayer',
        type: SourceType.Video,
      },
      {
        id: '2',
        name: 'Jujutsu Kaisen',
        imageUrl:
          'https://images.unsplash.com/photo-1541562232579-512a21360020?w=300&q=80',
        url: '/anime/jujutsu-kaisen',
        type: SourceType.Video,
      },
      {
        id: '3',
        name: 'One Piece',
        imageUrl:
          'https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=300&q=80',
        url: '/anime/one-piece',
        type: SourceType.Video,
      },
      {
        id: '4',
        name: 'My Hero Academia',
        imageUrl:
          'https://images.unsplash.com/photo-1618944847828-82e943c3bdb7?w=300&q=80',
        url: '/anime/my-hero-academia',
        type: SourceType.Video,
      },
      {
        id: '5',
        name: 'Chainsaw Man',
        imageUrl:
          'https://images.unsplash.com/photo-1634159899625-957471ff8b8d?w=300&q=80',
        url: '/anime/chainsaw-man',
        type: SourceType.Video,
      },
    ],
  },
  {
    name: 'Popular on Netflix',
    url: '/popular',
    isPaginated: false,
    items: [
      {
        id: '6',
        name: 'Death Note',
        imageUrl:
          'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=300&q=80',
        url: '/anime/death-note',
        type: SourceType.Video,
      },
      {
        id: '7',
        name: 'Naruto',
        imageUrl:
          'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=120&h=180&fit=crop',
        url: '/anime/naruto',
        type: SourceType.Video,
      },
      {
        id: '8',
        name: 'Fullmetal Alchemist',
        imageUrl:
          'https://images.unsplash.com/photo-1618944847828-82e943c3bdb7?w=300&q=80',
        url: '/anime/fullmetal-alchemist',
        type: SourceType.Video,
      },
      {
        id: '9',
        name: 'Tokyo Ghoul',
        imageUrl:
          'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=300&q=80',
        url: '/anime/tokyo-ghoul',
        type: SourceType.Video,
      },
      {
        id: '10',
        name: 'Hunter x Hunter',
        imageUrl:
          'https://images.unsplash.com/photo-1541562232579-512a21360020?w=300&q=80',
        url: '/anime/hunter-x-hunter',
        type: SourceType.Video,
      },
    ],
  },
  {
    name: 'New Releases',
    url: '/new-releases',
    isPaginated: false,
    items: [
      {
        id: '11',
        name: 'Spy x Family',
        imageUrl:
          'https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=300&q=80',
        url: '/anime/spy-x-family',
        type: SourceType.Video,
      },
      {
        id: '12',
        name: 'Cyberpunk: Edgerunners',
        imageUrl:
          'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=120&h=180&fit=crop',
        url: '/anime/cyberpunk-edgerunners',
        type: SourceType.Video,
      },
      {
        id: '13',
        name: 'Blue Lock',
        imageUrl:
          'https://images.unsplash.com/photo-1618944847828-82e943c3bdb7?w=300&q=80',
        url: '/anime/blue-lock',
        type: SourceType.Video,
      },
      {
        id: '14',
        name: 'Mob Psycho 100',
        imageUrl:
          'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=300&q=80',
        url: '/anime/mob-psycho-100',
        type: SourceType.Video,
      },
      {
        id: '15',
        name: 'Vinland Saga',
        imageUrl:
          'https://images.unsplash.com/photo-1541562232579-512a21360020?w=300&q=80',
        url: '/anime/vinland-saga',
        type: SourceType.Video,
      },
    ],
  },
];

const mockTabs = [
  {id: 'home', label: 'Home', icon: 'home', isActive: true},
  {id: 'search', label: 'Search', icon: 'search', isActive: false},
  {id: 'downloads', label: 'Downloads', icon: 'download', isActive: false},
  {id: 'profile', label: 'Profile', icon: 'person', isActive: false},
];

const HomeNavigator: React.FC<HomeNavigatorProps> = () => {
  const navigation = useNavigation<any>();
  const {selectedPlugin} = useHomePageDataStore();
  const {setBottomSheetVisible} = usePluginSelectorBottomSheetStore();

  const [loading, setLoading] = useState(false);
  const [homePageData, setHomePageData] = useState<Category[]>([]);

  const getHomePageData = async (plugin: Plugin) => {
    setLoading(true);
    setHomePageData(
      await PluginService.runPluginMethodInSandbox(
        selectedPlugin.pluginPath!,
        'getHomeCategories',
        [],
      ).then(res => res.data as Category[]),
    );
    setLoading(false);
  };

  useEffect(() => {
    getHomePageData(selectedPlugin);
  }, [selectedPlugin]);

  const handleRefresh = async () => {
    setLoading(true);
    await getHomePageData(selectedPlugin);
    setLoading(false);
  };

  const handlePlayPress = (item: Item) => {
    navigation.navigate('details', {
      itemId: item.id,
      plugin: selectedPlugin,
    });
  };

  const favoriteStore = useFavoriteStore();

  const handleAddToListPress = (item: Item) => {
    // Add to watchlist logic
    favoriteStore.setItem(item);
    favoriteStore.setVisible(true);
  };

  const handleMoreInfoPress = (item: Item) => {
    navigation.navigate('details', {
      itemId: item.id,
      plugin: selectedPlugin,
    });
  };

  const theme = useTheme();

  const {activeProfile} = useProfileStore();

  const [homeHeroItem, setHomeHeroItem] = useState<Item>({} as Item);

  useEffect(() => {
    if (homePageData.length > 0) {
      setHomeHeroItem(
        homePageData.flatMap(category => category.items)[
          Math.floor(
            Math.random() *
              homePageData.flatMap(category => category.items).length,
          )
        ],
      );
    }
  }, [homePageData]);

  return (
    <View
      style={{...styles.container, backgroundColor: theme.colors.background}}>
      {loading ? (
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <ActivityIndicator size={'large'} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          {homeHeroItem.name && (
            <HomexHero
              title={homeHeroItem.name}
              description={homeHeroItem.description ?? ''}
              imageUrl={homeHeroItem.imageUrl}
              onPlayPress={() => handlePlayPress(homeHeroItem)}
              onAddToListPress={() =>
                handleAddToListPress(homeHeroItem ?? ({} as Item))
              }
              onMoreInfoPress={() =>
                handleMoreInfoPress(homeHeroItem ?? ({} as Item))
              }
              rating={undefined}
              year={undefined}
              duration={undefined}
            />
          )}

          {homePageData.map((category, index) => (
            <CategorySwiper
              key={`${category.name}-${index}`}
              category={{
                ...category,
                source: selectedPlugin,
              }}
              onSeeAllPress={() =>
                navigation.navigate('Category', {title: category.name})
              }
            />
          ))}
        </ScrollView>
      )}
      <FAB
        icon="filter-variant"
        label={selectedPlugin.name ?? 'Select Plugin'}
        color={theme.colors.onSurface}
        mode="flat"
        style={{
          backgroundColor: theme.colors.surface,
          position: 'absolute',
          bottom: 8,
          right: 8,
        }}
        onPress={() => {
          setBottomSheetVisible(true);
        }}
      />
    </View>
  );
};

export default HomeNavigator;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    // paddingBottom: 16,
  },
});
