import React, {useState} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
  SafeAreaView,
  Switch,
} from 'react-native';
import {useTheme, Appbar, List, Divider, Text} from 'react-native-paper';
import {useNavigation} from '@react-navigation/native';

/**
 * SettingsNavigator component
 *
 * This component implements the settings screen with a modern UI design
 */
const SettingsNavigator = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>();

  const [settings, setSettings] = useState({
    darkMode: theme.dark,
    notifications: true,
    autoPlay: true,
    downloadQuality: '1080p',
    streamingQuality: '720p',
    subtitles: true,
    dataSaver: false,
  });

  const handleSettingChange = (key: string, value: boolean) => {
    setSettings(prev => ({...prev, [key]: value}));
  };

  return (
    <SafeAreaView
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <StatusBar
        backgroundColor={theme.colors.background}
        barStyle={theme.dark ? 'light-content' : 'dark-content'}
      />

      <Appbar.Header
        style={[styles.header, {backgroundColor: theme.colors.background}]}>
        {/* <Appbar.BackAction onPress={() => navigation.goBack()} /> */}
        <Appbar.Content title="Settings" />
      </Appbar.Header>

      <ScrollView style={styles.scrollView}>
        {/* Account Section */}
        <List.Section>
          <List.Subheader>Account</List.Subheader>
          <List.Item
            title="Profile"
            description="Manage your profile information"
            left={props => <List.Icon {...props} icon="account" />}
            onPress={() => {}}
          />
          {/* <List.Item
            title="Subscription"
            description="View and manage your subscription"
            left={props => <List.Icon {...props} icon="credit-card" />}
            onPress={() => {}}
          /> */}
        </List.Section>

        <Divider />

        {/* Playback Section */}
        <List.Section>
          <List.Subheader>Playback</List.Subheader>
          <List.Item
            title="Dark Mode"
            description="Use dark theme throughout the app"
            left={props => <List.Icon {...props} icon="theme-light-dark" />}
            right={() => (
              <Switch
                value={settings.darkMode}
                onValueChange={(value: boolean) =>
                  handleSettingChange('darkMode', value)
                }
              />
            )}
          />
          <List.Item
            title="Auto Play"
            description="Automatically play next episode"
            left={props => <List.Icon {...props} icon="play" />}
            right={() => (
              <Switch
                value={settings.autoPlay}
                onValueChange={(value: boolean) =>
                  handleSettingChange('autoPlay', value)
                }
              />
            )}
          />
          <List.Item
            title="Subtitles"
            description="Show subtitles by default"
            left={props => <List.Icon {...props} icon="subtitles" />}
            right={() => (
              <Switch
                value={settings.subtitles}
                onValueChange={(value: boolean) =>
                  handleSettingChange('subtitles', value)
                }
              />
            )}
          />
        </List.Section>

        <Divider />

        {/* Quality Section */}
        <List.Section>
          <List.Subheader>Quality</List.Subheader>
          <List.Item
            title="Streaming Quality"
            description={settings.streamingQuality}
            left={props => <List.Icon {...props} icon="wifi" />}
            onPress={() => {}}
          />
          <List.Item
            title="Download Quality"
            description={settings.downloadQuality}
            left={props => <List.Icon {...props} icon="download" />}
            onPress={() => {}}
          />
          <List.Item
            title="Data Saver"
            description="Reduce data usage on mobile networks"
            left={props => <List.Icon {...props} icon="cellphone" />}
            right={() => (
              <Switch
                value={settings.dataSaver}
                onValueChange={(value: boolean) =>
                  handleSettingChange('dataSaver', value)
                }
              />
            )}
          />
        </List.Section>

        <Divider />

        {/* Notifications Section */}
        <List.Section>
          <List.Subheader>Notifications</List.Subheader>
          <List.Item
            title="Push Notifications"
            description="Receive updates about new episodes"
            left={props => <List.Icon {...props} icon="bell" />}
            right={() => (
              <Switch
                value={settings.notifications}
                onValueChange={(value: boolean) =>
                  handleSettingChange('notifications', value)
                }
              />
            )}
          />
        </List.Section>

        <Divider />

        {/* About Section */}
        <List.Section>
          <List.Subheader>About</List.Subheader>
          <List.Item
            title="Version"
            description="1.0.0"
            left={props => <List.Icon {...props} icon="information" />}
          />
          <List.Item
            title="Privacy Policy"
            left={props => <List.Icon {...props} icon="shield" />}
            onPress={() => {}}
          />
          <List.Item
            title="Terms of Service"
            left={props => <List.Icon {...props} icon="file-document" />}
            onPress={() => {}}
          />
        </List.Section>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    elevation: 0,
    shadowOpacity: 0,
  },
  scrollView: {
    flex: 1,
  },
});

export default SettingsNavigator;
