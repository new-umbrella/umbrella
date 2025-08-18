import {create} from 'zustand';
import Category from '../../../plugins/data/model/item/Category';
import {Plugin} from '../../../plugins/domain/entities/Plugin';
import {createJSONStorage, persist} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {usePluginStore} from '../../../plugins/presentation/state/usePluginStore';
import {PluginViewModel} from '../../../plugins/presentation/viewmodels/PluginsViewModel';
import {PluginService} from '../../../plugins/data/datasource/PluginService';
import Item from '../../../plugins/data/model/item/Item';

// Home page data store
// This is used to store the home page data.
// TODO: Test this with multiple plugins.

interface HompageDataStoreState {
  selectedPlugin: Plugin;
  setSelectedPlugin: (selectedPlugin: Plugin) => void;
  homePageData: Category[];
  setHomePageData: (homePageData: Category[]) => void;
  homeHeroItem: Item | null;
  setHomeHeroItem: (homeHeroItem: Item | null) => void;
}

export const useHomePageDataStore = create(
  persist<HompageDataStoreState>(
    (set, get) => ({
      selectedPlugin: {} as Plugin,
      setSelectedPlugin: (selectedPlugin: Plugin) => set({selectedPlugin}),
      homePageData: [] as Category[],
      setHomePageData: (homePageData: Category[]) => set({homePageData}),
      homeHeroItem: null,
      setHomeHeroItem: (homeHeroItem: Item | null) => set({homeHeroItem}),
      // getHomePageData: async (homePageData: Category[]) => {
      //   set({
      //     homePageData: (await PluginService.runPluginMethodInSandbox(
      //       get().selectedPlugin.pluginPath!,
      //       'getHomePageData',
      //       [],
      //     ).then(res => res.data)) as Category[],
      //   });
      // },
    }),
    {
      name: 'home-page-data',
      storage: createJSONStorage(() => AsyncStorage),
      version: 0,
    },
  ),
);
