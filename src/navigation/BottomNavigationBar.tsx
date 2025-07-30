import * as React from 'react';
import {
  Appbar,
  BottomNavigation,
  Drawer,
  Text,
  TouchableRipple,
  useTheme,
} from 'react-native-paper';
import PluginsNavigator from '../features/plugins/PluginsNavigator';
import {
  AppState,
  Platform,
  StyleSheet,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native';
import {DarkTheme, LightTheme} from '../core/theme/theme';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
} from '@react-navigation/drawer';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import SearchNavigator from '../features/search/SearchNavigator';
import {useBottomNavigationBarState} from './useBottomNavigationBarState';
import {useEffect, useState} from 'react';
import {usePluginStore} from '../features/plugins/presentation/state/usePluginStore';
import HomeNavigator from '../features/home/HomeNavigator';
import LibraryNavigator from '../features/library/LibraryNavigator';
import {SvgUri} from 'react-native-svg';
import {useProfileStore} from '../features/profile/presentation/state/useProfileStore';
import PluginListView from '../features/plugins/presentation/views/PluginListView';
import Orientation from 'react-native-orientation-locker';
import SettingsNavigator from '../features/settings/SettingsNavigator';

// BottomNavigationBar
// This component is used to display the bottom navigation bar
// Shown on all top level screens
// Shows a Rail when in landscape mode

const NavScreenWrapper: React.FC<any> = props => {
  const navigation = useNavigation();
  const {activeProfile} = useProfileStore(state => state);

  return (
    <View style={{flex: 1}}>
      <Appbar.Header>
        <Appbar.Content title={props.title} />
        <TouchableRipple>
          <View
            style={{
              overflow: 'hidden',
              borderRadius: 2,
              marginRight: 16,
            }}>
            <SvgUri
              width={32}
              height={32}
              uri={activeProfile?.profile_image || ''}
              onPress={() => navigation.navigate('profile' as never)}
            />
          </View>
        </TouchableRipple>
      </Appbar.Header>
      <View style={styles.container}>{props.children}</View>
    </View>
  );
};

const DrawerNavigator = createDrawerNavigator();

const DrawerContent = ({props, setIndex}: any) => {
  const colorScheme = useColorScheme();
  const theme = useTheme();

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={{
        flex: 1,
        width: 80,
        alignItems: 'center',
      }}>
      <View style={{flex: 1}} />
      <Drawer.CollapsedItem
        focusedIcon="home"
        unfocusedIcon="home-outline"
        label="Home"
        active={props.navigation.getState().index === 0}
        onPress={() => {
          props.navigation.navigate('home');
          setIndex(0);
        }}
        theme={theme}
      />
      <View style={{flex: 1}} />
      <Drawer.CollapsedItem
        focusedIcon="magnify"
        unfocusedIcon="magnify"
        label="Search"
        active={props.navigation.getState().index === 1}
        onPress={() => {
          props.navigation.navigate('search');
          setIndex(1);
        }}
        theme={theme}
      />
      <View style={{flex: 1}} />
      <Drawer.CollapsedItem
        focusedIcon="library"
        unfocusedIcon="library"
        label="Library"
        active={props.navigation.getState().index === 2}
        onPress={() => {
          props.navigation.navigate('library');
          setIndex(2);
        }}
        theme={theme}
      />
      <View style={{flex: 1}} />
      <Drawer.CollapsedItem
        focusedIcon="power-plug"
        unfocusedIcon={'power-plug-outline'}
        label="Plugins"
        active={props.navigation.getState().index === 3}
        onPress={() => {
          props.navigation.navigate('plugins');
          setIndex(3);
        }}
        theme={theme}
      />
      <View style={{flex: 1}} />
      <Drawer.CollapsedItem
        focusedIcon="cog"
        unfocusedIcon="cog-outline"
        label="Settings"
        active={props.navigation.getState().index === 4}
        onPress={() => {
          props.navigation.navigate('settings');
          setIndex(4);
        }}
        theme={theme}
      />
      <View style={{flex: 1}} />
    </DrawerContentScrollView>
  );
};

const BottomNavigationBar = () => {
  const [index, setIndex] = React.useState(0);
  const [routes] = React.useState([
    {
      key: 'home',
      title: 'Home',
      focusedIcon: 'home',
      unfocusedIcon: 'home-outline',
    },
    {
      key: 'search',
      title: 'Search',
      focusedIcon: 'magnify',
      unfocusedIcon: 'magnify',
    },
    {
      key: 'library',
      title: 'Library',
      focusedIcon: 'library',
      unfocusedIcon: 'library',
    },
    {
      key: 'plugins',
      title: 'Plugins',
      focusedIcon: 'power-plug',
      unfocusedIcon: 'power-plug-outline',
    },
    {
      key: 'settings',
      title: 'Settings',
      focusedIcon: 'cog',
      unfocusedIcon: 'cog-outline',
    },
  ]);

  // Lock to portrait mode on component mount
  useEffect(() => {
    Orientation.lockToPortrait();

    // Cleanup function to unlock orientation when component unmounts
    return () => {
      Orientation.unlockAllOrientations();
    };
  }, []);

  const Home = () => (
    // <NavScreenWrapper title="Home">
    <HomeNavigator />
    // </NavScreenWrapper>
  );

  const Search = () => (
    // <NavScreenWrapper title="Search">
    <SearchNavigator />
    // </NavScreenWrapper>
  );

  const Library = () => (
    // <NavScreenWrapper title="Library">
    <LibraryNavigator />
    // </NavScreenWrapper>
  );

  const Plugins = () => (
    // <NavScreenWrapper title="Plugins">
    <PluginsNavigator />
    // </NavScreenWrapper>
  );

  const Settings = () => (
    // <NavScreenWrapper title="Settings">
    <SettingsNavigator />
    // </NavScreenWrapper>
  );

  const renderScene = BottomNavigation.SceneMap({
    home: Home,
    search: Search,
    library: Library,
    plugins: Plugins,
    settings: Settings,
  });

  const {height, width} = useWindowDimensions();
  const theme = useTheme();
  const {visible} = useBottomNavigationBarState();
  const navigation = useNavigation();
  const {activeProfile} = useProfileStore(state => state);

  useEffect(() => {
    if (!activeProfile) {
      navigation.navigate('profile' as never);
    }
  }, [navigation, activeProfile]);

  // Since we're locking to portrait mode, we always show the bottom navigation
  return (
    <BottomNavigation
      navigationState={{index, routes}}
      onIndexChange={setIndex}
      renderScene={renderScene}
      theme={theme}
      barStyle={{
        backgroundColor: theme.colors.surface,
        display: visible ? 'flex' : 'none',
      }}
    />
  );
};

export default BottomNavigationBar;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor: 'blue',
  },
});
