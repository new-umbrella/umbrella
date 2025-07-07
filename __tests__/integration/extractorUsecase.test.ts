import { GetPluginsUsecase } from '../../src/features/plugins/domain/usecases/GetPluginsUsecase';
import { PluginRepository } from '../../src/features/plugins/domain/repositories/PluginRepository';
import { PluginRepositoryImpl } from '../../src/features/plugins/data/repository/PluginRepositoryImpl';

// Mock the repository implementation
jest.mock('../../src/features/plugins/data/repository/PluginRepositoryImpl', () => ({
  PluginRepositoryImpl: jest.fn().mockImplementation(() => ({
    getPlugins: jest.fn()
  }))
}));

describe('GetPluginsUsecase Integration Tests', () => {
  const mockPlugins = [
    { id: '1', name: 'Test Plugin', version: '1.0.0' },
    { id: '2', name: 'Another Plugin', version: '2.1.3' }
  ];

  let repository: PluginRepository;
  let useCase: GetPluginsUsecase;

  beforeEach(() => {
    repository = new PluginRepositoryImpl();
    useCase = new GetPluginsUsecase(repository);
    jest.clearAllMocks();
  });

  it('should retrieve plugins from repository', () => {
    repository.getPlugins = jest.fn().mockReturnValue(mockPlugins);
    
    const result = useCase.execute();
    
    expect(result).toEqual(mockPlugins);
    expect(repository.getPlugins).toHaveBeenCalledTimes(1);
  });

  it('should return empty array when repository has no plugins', () => {
    repository.getPlugins = jest.fn().mockReturnValue([]);
    
    const result = useCase.execute();
    
    expect(result).toEqual([]);
    expect(repository.getPlugins).toHaveBeenCalledTimes(1);
  });
});
