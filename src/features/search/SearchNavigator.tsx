import React, {useState, useCallback, useEffect} from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import {
  ActivityIndicator,
  useTheme,
  Appbar,
  Divider,
  Text,
  Snackbar,
} from 'react-native-paper';
import {useNavigation} from '@react-navigation/native';
import {useSearchPageDataStore} from './presentation/state/useSearchPageDataStore';
import SearchBar from './presentation/components/SearchBar';
import SearchFiltersSelector from './presentation/components/SearchFiltersSelector';
import CategorySwiper from '../../core/shared/components/CategorySwiper';
import {SearchViewModel} from './presentation/viewmodels/SearchViewModel';
import Category from '../plugins/data/model/item/Category';

/**
 * SearchNavigator component
 *
 * This component implements the search screen with a modern UI design
 * and integrates with the SearchViewModel for actual search functionality
 */
const SearchNavigator = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>();

  // Use the search view model
  const searchViewModel = new SearchViewModel();

  // Use the search page data store
  const {
    query,
    setQuery,
    pluginsToSearch,
    sourceTypesToSearch,
    results,
    setResults,
    alreadyStarted,
    setAlreadyStarted,
    setQuery: setBottomSheetQuery,
    setBottomSheetActivePlugin,
    setBottomSheetVisible,
  } = useSearchPageDataStore(state => state);

  const handleSeeAllPress = (category: Category) => {
    setBottomSheetQuery(query);
    setBottomSheetActivePlugin(category.source!);
    setBottomSheetVisible(true);
  };

  // View state
  const [isGridView, setIsGridView] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Handle search
  const handleSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        return;
      }

      setIsLoading(true);

      try {
        // Use the search view model to perform the search
        await searchViewModel.search();
        setAlreadyStarted(true);
      } catch (error) {
        setSnackbarMessage('An error occurred while searching.');
        setSnackbarVisible(true);
      } finally {
        setIsLoading(false);
      }
    },
    [pluginsToSearch, sourceTypesToSearch, searchViewModel, setAlreadyStarted],
  );

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    if (query.trim()) {
      await handleSearch(query);
    }
  }, [query, handleSearch]);

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <Text
        style={[styles.emptyStateText, {color: theme.colors.onSurfaceVariant}]}>
        {query ? 'No results found' : 'Start searching to discover content'}
      </Text>
    </View>
  );

  return (
    <View
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      {/* Header with search bar */}
      {/* <Appbar.Header style={styles.header}> */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <SearchBar onSubmitEditing={handleSearch} />
        </View>
        <TouchableOpacity
          style={[
            styles.viewToggle,
            {
              // backgroundColor: theme.colors.surface,
              borderRadius: 4,
              padding: 4,
            },
          ]}
          onPress={() => setIsGridView(!isGridView)}>
          <Appbar.Action
            icon={isGridView ? 'view-grid' : 'view-list'}
            color={theme.colors.onSurface}
            size={24}
          />
        </TouchableOpacity>
      </View>
      {/* </Appbar.Header> */}

      {/* Filter options */}
      <View
        style={[
          styles.filterContainer,
          // {backgroundColor: theme.colors.surface},
        ]}>
        <SearchFiltersSelector />
      </View>

      <Divider />

      {/* Content area */}
      <ScrollView
        style={styles.contentContainer}
        contentContainerStyle={{flexGrow: 1}}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
          />
        }>
        {isLoading && results.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
          </View>
        ) : results.length === 0 && alreadyStarted ? (
          renderEmptyState()
        ) : results.length > 0 ? (
          results
            .filter(
              (category: Category) =>
                category && category.items && category.items.length > 0,
            )
            .map((category: Category, index: number) => (
              <View key={index} style={styles.categoryContainer}>
                <CategorySwiper
                  category={category}
                  onSeeAllPress={() => handleSeeAllPress(category)}
                />
              </View>
            ))
        ) : (
          renderEmptyState()
        )}
      </ScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        action={{
          label: 'Dismiss',
          onPress: () => setSnackbarVisible(false),
        }}>
        {snackbarMessage}
      </Snackbar>
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
    gap: 8,
    padding: 8,
  },
  searchContainer: {
    flex: 1,
    marginRight: 8,
  },
  viewToggle: {
    marginLeft: 8,
  },
  filterContainer: {
    width: '100%',
    paddingBottom: 8,
    paddingLeft: 8,
  },
  contentContainer: {
    flex: 1,
  },
  categoryContainer: {
    marginVertical: 8,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
});

export default SearchNavigator;
