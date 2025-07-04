import {create} from 'zustand';
import {PluginRepositoryImpl} from '../../data/repository/PluginRepositoryImpl';
import {DeletePluginUsecase} from '../../domain/usecases/DeletePluginUsecase';
import {Plugin} from '../../domain/entities/Plugin';

const deletePlugin = new DeletePluginUsecase(new PluginRepositoryImpl());

// Install plugin dialog store
// This store is used to display a dialog that asks the user to install a plugin
interface InstallPluginDialogStoreState {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  visible: boolean;
  setVisible: (visible: boolean) => void;
  plugin?: Plugin;
  setPlugin: (plugin: Plugin | undefined) => void;
  deleteManifestFile: () => void;
  onConfirm: () => Promise<void>;
  setOnConfirm: (onConfirm: () => void) => void;
  waitingForPlugins: boolean;
  setWaitingForPlugins: (waitingForPluginss: boolean) => void;
}

export const useInstallPluginDialogStore =
  create<InstallPluginDialogStoreState>((set, get) => ({
    loading: false,
    setLoading: loading => set({loading}),
    visible: false,
    setVisible: visible => set({visible}),
    plugin: undefined,
    setPlugin: plugin => set({plugin: plugin}),
    deleteManifestFile: () => {
      if (!get().plugin) return;
      deletePlugin.execute(get().plugin as Plugin);
      set({visible: false});
      set({plugin: undefined});
    },
    onConfirm: async () => {
      return Promise.resolve();
    },
    setOnConfirm: onConfirm =>
      set({
        async onConfirm() {
          await onConfirm();
          set({visible: false, plugin: undefined, loading: false});
        },
      }),

    waitingForPlugins: false,
    setWaitingForPlugins: waitingForPlugins => set({waitingForPlugins}),
  }));
