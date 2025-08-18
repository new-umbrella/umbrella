if (__DEV__) {
  require('./ReactotronConfig');
}
import './gesture-handler';
import {useColorScheme, StatusBar, Alert, Linking, View} from 'react-native';
import {PaperProvider} from 'react-native-paper';

import {DarkTheme, LightTheme} from './src/core/theme/theme';
import {useEffect} from 'react';
import BottomNavigationBar from './src/navigation/BottomNavigationBar';
import {NavigationContainer} from '@react-navigation/native';
import {navigationRef, isReadyRef} from './RootNavigation';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import InstallPluginDialog from './src/core/shared/components/dialogs/InstallPluginDialog';
import constants from './src/core/utils/constants';
import SplashScreen from 'react-native-splash-screen';
import DetailsNavigator from './src/features/details/DetailsNavigator';
import {useProfileStore} from './src/features/profile/presentation/state/useProfileStore';
import ProfileNavigator from './src/features/profile/ProfileNavigator';
import PluginInfoView from './src/features/plugins/presentation/views/PluginInfoView';
import {ExtractorService} from './src/data/services/extractor/data/datasource/ExtractorService';
import MediaType from './src/features/plugins/data/model/media/MediaType';
import ExtractorVideo from './src/features/plugins/data/model/media/ExtractorVideo';

import nodejs from 'nodejs-mobile-react-native';
import {PluginViewModel} from './src/features/plugins/presentation/viewmodels/PluginsViewModel';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {useInstallPluginDialogStore} from './src/features/plugins/presentation/state/useInstallPluginDialogStore';
import React from 'react';
import ExtractorSourcesBottomSheet from './src/data/services/extractor/presentation/components/ExtractSourcesBottomSheet';
import {useExtractorServiceStore} from './src/data/services/extractor/presentation/state/ExtractorServiceStore';
import BottomSheet from '@gorhom/bottom-sheet';
import {useSearchPageDataStore} from './src/features/search/presentation/state/useSearchPageDataStore';
import PaginationBottomSheet from './src/features/search/presentation/components/PaginationBottomSheet';
import {useFavoriteStore} from './src/features/details/presentation/state/useFavoriteStore';
import FavoriteBottomSheet from './src/features/details/presentation/components/FavoriteBottomSheet';
import MediaNavigator from './src/features/media/MediaNavigator';
import {SystemBars} from 'react-native-edge-to-edge';
import SystemNavigationBar from 'react-native-system-navigation-bar';
import {usePluginSelectorBottomSheetStore} from './src/features/home/presentation/state/usePluginSelectorBottomSheetStore';
import PluginSelectorBottomSheet from './src/features/home/presentation/components/PluginSelectorBottomSheet';

const Stack = createNativeStackNavigator();

export default function App() {
  // Extractor Tests
  // useEffect(() => {
  //   const extractorServiceExtract = async () => {
  //     const result = await ExtractorService.extract({
  //       type: MediaType.ExtractorVideo,
  //       url: 'https://alions.pro/v/22ly8zuqj9n2',
  //       name: 'test',
  //       iconUrl: 'https://ww27.gogoanimes.fi/img/vidhide.png',
  //       headers: {
  //         'User-Agent':
  //           'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
  //         Referer: 'https://ww27.gogoanimes.fi/',
  //       },
  //     } as ExtractorVideo).then(result => {
  //       console.log(result);
  //       return result;
  //     });
  //   };

  //   console.log('running');
  //   extractorServiceExtract();
  // }, []);

  useEffect(() => {
    SplashScreen.hide();
    nodejs.start('main.js');
    const extract = async () => {
      setExtractorBottomSheetVisible(true);
      const result = await ExtractorService.extract({
        type: MediaType.ExtractorVideo,
        url: 'https://gogoanimez.to/naruto-shippuden-episode-420/',
        // url: 'https://mysoap2day.net/movie/boruto-naruto-the-movie-2015-x13472011/watching/',
        // url: 'https://gogoanimes.fi/naruto-episode-1#',
        name: 'test',
        iconUrl: 'https://www.svgrepo.com/show/433942/gear.svg',
      } as ExtractorVideo);
      console.log(result);
    };
    extract();
    // nodejs.channel.addListener('message', message => {
    //   Alert.alert('From NodeJS', message);
    // });
  }, []);

  const colorScheme = useColorScheme();

  useEffect(() => {
    if (colorScheme === 'dark') {
      SystemNavigationBar.setNavigationColor(DarkTheme.colors.background);
      StatusBar.setBarStyle('light-content');
      StatusBar.setBackgroundColor(DarkTheme.colors.background);
    } else {
      SystemNavigationBar.setNavigationColor(LightTheme.colors.background);
      StatusBar.setBarStyle('dark-content');
      StatusBar.setBackgroundColor(LightTheme.colors.background);
    }
  }, [colorScheme]);

  useEffect(() => {}, [colorScheme]);

  useEffect(() => {
    return () => {
      isReadyRef.current = false;
    };
  }, []);

  const pluginViewModel = new PluginViewModel();

  useEffect(() => {
    const loadPlugins = async () => {
      await pluginViewModel.loadAllPluginsFromStorage();
    };
    loadPlugins();
  }, []);

  const {
    visible: installVisible,
    setVisible: setInstallVisible,
    plugin,
    setPlugin,
    loading,
    setLoading,
    setOnConfirm: setInstallOnConfirm,
    setWaitingForPlugins,
  } = useInstallPluginDialogStore(state => state);

  useEffect(() => {
    if (installVisible) return;
    const loadPlugins = async () => {
      await pluginViewModel.loadAllPluginsFromStorage();
    };
    loadPlugins();
  }, [installVisible]);

  useEffect(() => {
    Linking.addEventListener('url', async ({url}) => {
      if (loading) {
        return;
      }
      if (url.startsWith(constants.PLUGIN_SCHEME)) {
        setInstallVisible(true);
        setLoading(true);
        setWaitingForPlugins(true);
        setPlugin(undefined);

        const manifestUrl = url.replace(constants.PLUGIN_SCHEME, 'http://');

        await pluginViewModel.fetchManifest(manifestUrl).then(result => {
          switch (result.status) {
            case 'success': {
              setPlugin(result.data);
              setWaitingForPlugins(false);
              setInstallVisible(true);
              setInstallOnConfirm(async () => {
                await pluginViewModel
                  .fetchPlugin(result.data)
                  .then(result => {
                    switch (result.status) {
                      case 'success': {
                        Alert.alert(
                          'Installation successful',
                          `Plugin ${result.data.name} installed successfully`,
                        );
                        pluginViewModel.loadAllPluginsFromStorage();
                        break;
                      }
                      case 'error': {
                        Alert.alert(
                          'Installation failed',
                          `Plugin installation failed\n${result.error}`,
                        );
                        break;
                      }
                      default:
                        break;
                    }
                  })
                  .catch(error => {
                    console.error('Error fetching plugin:', error);
                    Alert.alert(
                      'Installation failed',
                      `An unexpected error occurred during plugin fetch: ${
                        error.message || error
                      }`,
                    );
                  });
              });
              break;
            }
            case 'error': {
              console.error(result.error);
              break;
            }
            default:
              break;
          }
        });
        setInstallVisible(true);
        setLoading(false);
      }
    });
  }, []);

  const {profiles, activeProfile} = useProfileStore(state => state);

  const extractorBottomSheetRef = React.useRef<BottomSheet>(null);

  const {
    bottomSheetVisible: extractorBottomSheetVisible,
    setBottomSheetVisible: setExtractorBottomSheetVisible,
  } = useExtractorServiceStore(state => state);

  useEffect(() => {
    console.log('bottomSheetVisible', extractorBottomSheetVisible);
    if (extractorBottomSheetVisible) {
      extractorBottomSheetRef.current?.snapToIndex(0);
    }
  }, [extractorBottomSheetVisible]);

  const {bottomSheetVisible: searchBottomSheetVisible} = useSearchPageDataStore(
    state => state,
  );

  const searchBottomSheetRef = React.useRef<BottomSheet>(null);

  useEffect(() => {
    if (searchBottomSheetVisible) {
      searchBottomSheetRef.current?.snapToIndex(0);
    }
  }, [searchBottomSheetVisible]);

  const {visible: favoriteBottomSheetVisible} = useFavoriteStore(
    state => state,
  );

  const favoriteBottomSheetRef = React.useRef<BottomSheet>(null);

  useEffect(() => {
    if (favoriteBottomSheetVisible) {
      favoriteBottomSheetRef.current?.snapToIndex(0);
    }
  }, [favoriteBottomSheetVisible]);

  const pluginSelectorBottomSheetRef = React.useRef<BottomSheet>(null);

  const {bottomSheetVisible: pluginSelectorBottomSheetVisible} =
    usePluginSelectorBottomSheetStore(state => state);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{flex: 1}}>
        <PaperProvider theme={colorScheme === 'dark' ? DarkTheme : LightTheme}>
          <NavigationContainer
            ref={navigationRef}
            onReady={() => {
              isReadyRef.current = true;
            }}>
            {/* <SystemBars hidden={true} /> */}
            <SystemBars style={colorScheme === 'dark' ? 'light' : 'dark'} />
            {/* <StatusBar
              // barStyle={
              //   colorScheme === 'dark' ? 'light-content' : 'dark-content'
              // }
              backgroundColor={
                colorScheme === 'dark'
                  ? DarkTheme.colors.background
                  : LightTheme.colors.background
              }
            /> */}
            <GestureHandlerRootView style={{flex: 1}}>
              <Stack.Navigator
                screenOptions={{
                  headerShown: false,
                  contentStyle: {
                    backgroundColor:
                      colorScheme === 'dark'
                        ? DarkTheme.colors.background
                        : LightTheme.colors.background,
                  },
                }}
                initialRouteName={
                  activeProfile === undefined || profiles.length === 0
                    ? 'profile'
                    : 'root'
                }>
                <Stack.Screen name="profile" component={ProfileNavigator} />
                <Stack.Screen name="root" component={BottomNavigationBar} />
                <Stack.Screen name="details" component={DetailsNavigator} />
                <Stack.Screen
                  name="pluginInfoView"
                  component={PluginInfoView}
                  options={{
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="media"
                  component={MediaNavigator}
                  options={{
                    headerShown: false,
                  }}
                />
              </Stack.Navigator>
              <InstallPluginDialog />
              {extractorBottomSheetVisible && (
                <ExtractorSourcesBottomSheet
                  bottomSheetRef={extractorBottomSheetRef}
                />
              )}
              {searchBottomSheetVisible && (
                <PaginationBottomSheet bottomSheetRef={searchBottomSheetRef} />
              )}
              {favoriteBottomSheetVisible && (
                <FavoriteBottomSheet bottomSheetRef={favoriteBottomSheetRef} />
              )}
              {pluginSelectorBottomSheetVisible && (
                <PluginSelectorBottomSheet
                  bottomSheetRef={pluginSelectorBottomSheetRef}
                />
              )}
            </GestureHandlerRootView>
          </NavigationContainer>
        </PaperProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
