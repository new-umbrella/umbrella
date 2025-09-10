import React, { useEffect, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HomexHero from './presentation/components/HomeHero';
import CategorySwiper from '../../core/shared/components/CategorySwiper';
import SourceType from '../plugins/data/model/source/SourceType';
import Category from '../plugins/data/model/item/Category';
import { useNavigation } from '@react-navigation/native';
import {
  ActivityIndicator,
  Appbar,
  FAB,
  Text,
  TouchableRipple,
  useTheme,
} from 'react-native-paper';
import { useProfileStore } from '../profile/presentation/state/useProfileStore';
import { SvgUri } from 'react-native-svg';
import { useHomePageDataStore } from './presentation/state/useHomePageDataStore';
import { Plugin } from '../plugins/domain/entities/Plugin';
import { PluginService } from '../plugins/data/datasource/PluginService';
import { useLibraryPageDataStore } from '../library/presentation/state/useLibraryPageDataStore';
import { useFavoriteStore } from '../details/presentation/state/useFavoriteStore';
import Item from '../plugins/data/model/item/Item';
import { usePluginSelectorBottomSheetStore } from './presentation/state/usePluginSelectorBottomSheetStore';

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

const HomeNavigator: React.FC<HomeNavigatorProps> = () => {
  const navigation = useNavigation<any>();
  const {
    selectedPlugin,
    homePageData,
    setHomePageData,
    homeHeroItem,
    setHomeHeroItem,
  } = useHomePageDataStore();
  const { setBottomSheetVisible } = usePluginSelectorBottomSheetStore();

  const [loading, setLoading] = useState(false);

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
    if (!selectedPlugin?.name || homePageData[0]?.name) return;
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

  const { activeProfile } = useProfileStore();

  useEffect(() => {
    if (homePageData.length > 0 && !homeHeroItem) {
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
      style={{ ...styles.container, backgroundColor: theme.colors.background }}>
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size={'large'} />
        </View>
      ) : !selectedPlugin.name ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text
            style={{
              color: theme.colors.onBackground,
              textAlign: 'center',
            }}>
            Please select or install a plugin
          </Text>
          <View style={{ height: 8 }} />
          <Text>(╥﹏╥)</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          {homeHeroItem && (
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
                navigation.navigate('Category', { title: category.name })
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
