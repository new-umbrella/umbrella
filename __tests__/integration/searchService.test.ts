/* eslint-disable testing-library/await-async-utils */
import { SearchService } from '../../src/features/search/data/datasource/SearchService';
import { PluginService } from '../../src/features/plugins/data/datasource/PluginService';
import { useSearchPageDataStore } from '../../src/features/search/presentation/state/useSearchPageDataStore';
import SourceType from '../../src/features/plugins/data/model/source/SourceType';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');

// Mock PluginService with TypeScript-friendly implementation
jest.mock('../../src/features/plugins/data/datasource/PluginService', () => ({
  PluginService: {
    runPluginMethodInSandbox: jest.fn()
  }
}));

describe('SearchService Integration Tests', () => {
  const mockPlugin = {
    id: 'movie-plugin',
    name: 'MovieDB',
    version: 1,
    pluginUrl: 'https://moviedb-plugin.example',
    pluginPath: '/plugins/moviedb',
    sourceType: SourceType.Video,
    isActive: true
  };

  const mockCategory = {
    id: 'sci-fi-movies',
    name: 'Science Fiction Movies',
    items: [
      { id: 1, title: 'The Matrix', year: 1999 },
      { id: 2, title: 'Blade Runner', year: 1982 }
    ],
    total: 2,
    source: {
      name: 'MovieDB',
      sourceType: SourceType.Video
    }
  };

  const mockPagination = {
    id: 'sci-fi-movies-page2',
    name: 'Science Fiction Movies',
    items: [
      { id: 3, title: 'Inception', year: 2010 }
    ],
    total: 3,
    source: {
      name: 'MovieDB',
      sourceType: 'movie' as SourceType
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useSearchPageDataStore.setState({
      query: '',
      results: [],
      pluginsToSearch: [mockPlugin],
      sourceTypesToSearch: [],
      bottomSheetItems: []
    });
  });

  it('should search and populate store', async () => {
    (PluginService.runPluginMethodInSandbox as jest.Mock).mockResolvedValue({
      data: mockCategory
    });

    useSearchPageDataStore.setState({ query: 'sci-fi' });
    await SearchService.search();

    const state = useSearchPageDataStore.getState();
    expect(state.results[0].items).toHaveLength(2);
  });

  it('should handle pagination', async () => {
    (PluginService.runPluginMethodInSandbox as jest.Mock)
      .mockResolvedValueOnce({ data: mockCategory })
      .mockResolvedValueOnce({ data: mockPagination });

    await SearchService.search();
    await SearchService.getNextPage(2, mockPlugin);

    const state = useSearchPageDataStore.getState();
    expect(state.results[0].items).toHaveLength(3);
  });

  it('should handle errors', async () => {
    const errorMsg = 'Network error';
    (PluginService.runPluginMethodInSandbox as jest.Mock).mockRejectedValue(new Error(errorMsg));
    
    await expect(SearchService.search())
      .rejects
      .toThrow(errorMsg);
  });
});
