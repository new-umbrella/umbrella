import {
  View,
  StyleSheet,
  Dimensions,
  StatusBar,
  Image,
  TouchableOpacity,
} from 'react-native';
import React, {useEffect, useRef, useState} from 'react';
import {GestureHandlerRootView, ScrollView} from 'react-native-gesture-handler';
import {Text, List, useTheme} from 'react-native-paper';
import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import {BottomSheetMethods} from '@gorhom/bottom-sheet/lib/typescript/types';
import {usePluginSelectorBottomSheetStore} from '../state/usePluginSelectorBottomSheetStore';
import {
  Favorite,
  FavoriteCategoryType,
} from '../../../library/domain/entities/Favorite';
import Item from '../../../plugins/data/model/item/Item';
import uuid from 'react-native-uuid';
import {useHomePageDataStore} from '../state/useHomePageDataStore';
import {usePluginStore} from '../../../plugins/presentation/state/usePluginStore';
import {Plugin} from '../../../plugins/domain/entities/Plugin';

const PluginSelectorBottomSheet = ({
  bottomSheetRef,
}: {
  bottomSheetRef: React.RefObject<BottomSheetMethods>;
}) => {
  const [plugins, setPlugins] = useState<Plugin[]>(
    usePluginStore.getState().getPlugins(),
  );

  const refreshPlugins = () =>
    setPlugins(usePluginStore.getState().getPlugins());

  const {bottomSheetVisible, setBottomSheetVisible} =
    usePluginSelectorBottomSheetStore();
  const {setSelectedPlugin} = useHomePageDataStore();

  const theme = useTheme();

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={bottomSheetVisible ? 0 : -1}
      snapPoints={['50%', '100%']}
      handleStyle={{backgroundColor: theme.colors.surface}}
      enablePanDownToClose={true}
      enableDynamicSizing={true}
      onClose={() => {
        setBottomSheetVisible(false);
      }}
      backgroundStyle={{
        backgroundColor: theme.colors.surface,
      }}>
      <BottomSheetScrollView
        contentContainerStyle={{paddingBottom: 16}}
        style={{
          ...styles.bottomSheetOptions,
          backgroundColor: theme.colors.surface,
        }}>
        {plugins.map((plugin, index: number) => (
          // <List.Item
          //   key={index}
          //   left={props => (
          //     <List.Image
          //       {...props}
          //       style={styles.pluginIcon}
          //       source={{uri: plugin.iconUrl}}
          //     />
          //   )}
          //   containerStyle={{paddingHorizontal: 8, margin: 0}}
          //   title={plugin.name}
          //   titleStyle={{fontSize: 18, fontWeight: 'bold'}}
          //   onPress={() => {
          //     setSelectedPlugin(plugin);
          //     setBottomSheetVisible(false);
          //   }}
          // />
          <TouchableOpacity
            key={index}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 4,
              paddingHorizontal: 8,
              marginVertical: 8,
            }}
            onPress={() => {
              setSelectedPlugin(plugin);
              setBottomSheetVisible(false);
            }}>
            <View style={{flex: 1, flexDirection: 'row', alignItems: 'center'}}>
              <Image style={styles.pluginIcon} source={{uri: plugin.iconUrl}} />
              <Text
                variant="headlineSmall"
                style={{
                  marginLeft: 8,
                }}>
                {plugin.name}
              </Text>
            </View>
            <Text
              variant="bodyMedium"
              style={{
                marginRight: 8,
              }}>
              {plugin.sourceType}
            </Text>
          </TouchableOpacity>
        ))}
      </BottomSheetScrollView>
    </BottomSheet>
  );
};

export default PluginSelectorBottomSheet;

const styles = StyleSheet.create({
  bottomSheetWrapper: {
    paddingBottom:
      Dimensions.get('screen').height > Dimensions.get('window').width
        ? 100
        : 0,
  },
  bottomSheetOptions: {
    flex: 1,
    flexDirection: 'column',
  },
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  pluginIcon: {
    width: 24,
    height: 24,
  },
});
