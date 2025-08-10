import {create} from 'zustand';
import {Plugin} from '../../../plugins/domain/entities/Plugin';
import {createJSONStorage, persist} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {usePluginStore} from '../../../plugins/presentation/state/usePluginStore';

interface PluginSelectorBottomSheetStoreState {
  bottomSheetVisible: boolean;
  setBottomSheetVisible: (visible: boolean) => void;
}

export const usePluginSelectorBottomSheetStore = create(
  persist<PluginSelectorBottomSheetStoreState>(
    (set, get) => ({
      bottomSheetVisible: false,
      setBottomSheetVisible: visible => set({bottomSheetVisible: visible}),
    }),
    {
      name: 'plugin-selector-bottom-sheet-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
