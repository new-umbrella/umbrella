import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  FlatList,
  Image,
  Dimensions,
} from 'react-native';
import {
  useTheme,
  Appbar,
  Chip,
  Divider,
  Text,
  Card,
  Icon,
  IconButton,
} from 'react-native-paper';
import {useNavigation} from '@react-navigation/native';
import {LibraryViewModel} from './presentation/viewmodels/LibraryViewModel';
import {LibraryPageData} from './domain/entities/LibraryPageData';
import MediaType from '../plugins/data/model/media/MediaType';
import SourceType from '../plugins/data/model/source/SourceType';
import Item from '../plugins/data/model/item/Item';
import {Favorite, FavoriteCategoryType} from './domain/entities/Favorite';

/**
 * LibraryNavigator component
 *
 * This component implements the library screen with a modern UI design
 */
const LibraryNavigator = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>();

  const [selectedFilter, setSelectedFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const libraryViewModel = new LibraryViewModel();

  // Filter items based on selected filter
  const [favoriteData, setFavoriteData] = useState<LibraryPageData | null>(
    null,
  );

  useEffect(() => {
    // console.log('favoriteData', favoriteData);
    if (favoriteData?.favorites) return;
    setFavoriteData(libraryViewModel.getFavoritesData());
  }, [favoriteData, setFavoriteData, libraryViewModel]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setFavoriteData(libraryViewModel.getFavoritesData());
  }, []);

  //Handle filter deselection
  const handleFilterDeselection = () => {
    setSelectedFilter('all');
    setFavoriteData(libraryViewModel.getFavoritesData());
  };

  // Handle filter change
  const handleFilterChange = (filter: FavoriteCategoryType) => {
    setSelectedFilter(filter);
    setFavoriteData({
      ...favoriteData!,
      favorites: libraryViewModel
        .getFavoritesData()
        .favorites.filter(
          favorite => favorite.category?.toLowerCase() === filter.toLowerCase(),
        ),
    });
  };

  // Render library item
  const renderLibraryItem = ({favorite}: {favorite: Favorite}) => (
    <Card
      style={[
        styles.card,
        {backgroundColor: theme.dark ? '#101010' : '#f0f0f0'},
      ]}
      onPress={() =>
        navigation.navigate('details', {
          itemId: favorite.item.id,
          plugin: favorite.item.source,
        })
      }>
      <Card.Cover
        source={{uri: favorite.item.imageUrl}}
        // blurRadius={3}
        style={styles.cardImage}
      />
      <Card.Content
        style={{
          ...styles.cardContent,
          // backgroundColor: theme.dark ? '#101010' : '#f0f0f0',
        }}>
        <Text
          variant="titleMedium"
          numberOfLines={2}
          ellipsizeMode="tail"
          style={{color: theme.colors.onSurface}}>
          {favorite.item.name}
        </Text>
        <View style={styles.sourceContainer}>
          <Image
            source={{uri: favorite.item.source?.iconUrl}}
            style={styles.sourceIcon}
          />
          <Text
            variant="bodyMedium"
            numberOfLines={2}
            ellipsizeMode="tail"
            style={{color: theme.colors.onSurfaceVariant}}>
            {favorite.item.source?.name}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <StatusBar
        backgroundColor={theme.colors.background}
        barStyle={theme.dark ? 'light-content' : 'dark-content'}
      />

      {/* Header */}
      <View style={styles.header}>
        <Text variant="titleLarge" style={{color: theme.colors.onBackground}}>
          Library
        </Text>
        <IconButton
          icon="magnify"
          size={24}
          iconColor={theme.colors.onBackground}
          onPress={() => {}}
        />
      </View>

      {/* Filter chips */}
      <View
        style={[
          styles.filterContainer,
          {backgroundColor: theme.colors.background},
        ]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {Object.values(FavoriteCategoryType).map((sourceType, index) => (
            <Chip
              key={sourceType}
              selected={selectedFilter === sourceType}
              onPress={() => {
                if (selectedFilter === sourceType) {
                  handleFilterDeselection();
                } else {
                  handleFilterChange(sourceType);
                }
              }}
              style={styles.chip}>
              {sourceType}
            </Chip>
          ))}
        </ScrollView>
      </View>

      <Divider />

      {/* Content area */}
      <FlatList
        data={favoriteData?.favorites || []}
        renderItem={({item}) => renderLibraryItem({favorite: item})}
        keyExtractor={item => item.id}
        horizontal={false}
        contentContainerStyle={styles.contentContainer}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyStateContainer}>
            <Text
              style={[
                styles.emptyStateText,
                {color: theme.colors.onSurfaceVariant},
              ]}>
              No items in your library
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    elevation: 0,
    shadowOpacity: 0,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  filterContainer: {
    padding: 8,
    marginBottom: 8,
  },
  chip: {
    marginHorizontal: 4,
  },
  contentContainer: {
    padding: 8,
    // display: 'flex',
    // flexDirection: 'row',
    // flexWrap: 'wrap',
    // justifyContent: 'space-between',
    width: '100%',
  },
  card: {
    flex: 1,
    margin: 4,
    elevation: 2,
    width: '48%',
    height: 375,
    padding: 8,
  },
  cardContent: {
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  cardImage: {
    height: 250,
  },
  sourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sourceIcon: {
    width: 16,
    height: 16,
    marginRight: 8,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default LibraryNavigator;
