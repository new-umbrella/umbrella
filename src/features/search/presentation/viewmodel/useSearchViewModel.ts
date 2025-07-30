import {useState, useCallback, useRef} from 'react';
import {SearchService} from '../../data/datasource/SearchService';
import {useSearchPageDataStore} from '../state/useSearchPageDataStore';
import Category from '../../../plugins/data/model/item/Category';
import {Plugin} from '../../../plugins/domain/entities/Plugin';
import SourceType from '../../../plugins/data/model/source/SourceType';

/**
 * Search View Model
 *
 * This view model handles the search functionality and coordinates between
 * the search service and the UI components
 */
export const useSearchViewModel = () => {
  const listeners = useRef<((results: Category[]) => void)[]>([]);

  const search = useCallback(
    async (
      query: string,
      plugins: Plugin[],
      sourceTypes: SourceType[],
    ): Promise<void> => {
      try {
        // Update the search query in the store
        useSearchPageDataStore.setState({query});

        // Update source types if provided
        if (sourceTypes && sourceTypes.length > 0) {
          useSearchPageDataStore.setState({sourceTypesToSearch: sourceTypes});
        }

        // Update plugins to search
        useSearchPageDataStore.setState({pluginsToSearch: plugins});

        // Perform the search using the SearchService
        const results = await SearchService.search();

        // Notify all listeners
        listeners.current.forEach(listener => listener(results));
      } catch (error) {
        console.error('Search error:', error);
        useSearchPageDataStore.setState({results: []});
        throw error;
      }
    },
    [],
  );

  const onResultsUpdated = useCallback(
    (callback: (results: Category[]) => void) => {
      listeners.current.push(callback);

      return () => {
        const index = listeners.current.indexOf(callback);
        if (index > -1) {
          listeners.current.splice(index, 1);
        }
      };
    },
    [],
  );

  return {
    search,
    onResultsUpdated,
  };
};
