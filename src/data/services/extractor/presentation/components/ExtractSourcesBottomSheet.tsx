import {View, StyleSheet, Alert, Linking, Image} from 'react-native';
import React, {useEffect, useMemo, useState, useCallback, useRef} from 'react';
import {ScrollView} from 'react-native-gesture-handler';
import {
  ActivityIndicator,
  List,
  useTheme,
  Text,
  Portal,
  Dialog,
  Button,
} from 'react-native-paper';
import BottomSheet, {BottomSheetView} from '@gorhom/bottom-sheet';
import {BottomSheetMethods} from '@gorhom/bottom-sheet/lib/typescript/types';
import RawAudio from '../../../../../features/plugins/data/model/media/RawAudio';
import RawVideo from '../../../../../features/plugins/data/model/media/RawVideo';
import ExtractorAudio from '../../../../../features/plugins/data/model/media/ExtractorAudio';
import MediaType from '../../../../../features/plugins/data/model/media/MediaType';
import ExtractorVideo from '../../../../../features/plugins/data/model/media/ExtractorVideo';
import {useExtractorServiceStore} from '../state/ExtractorServiceStore';
import SendIntentAndroid from 'react-native-send-intent';
import DetailedItem from '../../../../../features/plugins/data/model/item/DetailedItem';
import {ExtractorViewModel} from '../viewmodels/ExtractorViewModel';
import LazyImage from '../../../../../core/shared/components/LazyImage';
import RNWebVideoCaster, {
  WebVideoCasterOptions,
  SubtitleTrack,
} from 'rn-web-video-caster';
import detectVideoMimeType from '../../../../../core/utils/detectVideoMimeType';
import {useNavigation} from '@react-navigation/native';
import {MediaToView} from '../../../../../features/media/domain/entities/MediaToView';
const ExtractorSourcesBottomSheet = ({
  bottomSheetRef,
}: {
  bottomSheetRef: React.RefObject<BottomSheetMethods>;
}) => {
  const theme = useTheme();
  const navigation = useNavigation();

  const {
    detailedItem,
    mediaIndex,
    extracting,
    setExtracting,
    bottomSheetVisible,
    setBottomSheetVisible: setVisible,
    rawSources,
    setRawSources,
    sources,
    setSources,
  } = useExtractorServiceStore(state => state);

  // useEffect(() => {
  //   if (detailedItem && detailedItem.media && detailedItem.media[mediaIndex]) {
  //     const mediaItem = detailedItem.media[mediaIndex];
  //     // Create a raw source from the media item
  //     const rawSources =
  //     setRawSources([rawSource]);
  //   }
  // }, [detailedItem, mediaIndex]);

  const extractorViewModel = useRef(new ExtractorViewModel()).current;

  // const [noSources, setNoSources] = useState<boolean>(false);
  // State for player choice dialog
  const [playerDialogVisible, setPlayerDialogVisible] =
    useState<boolean>(false);
  const [selectedMedia, setSelectedMedia] = useState<
    RawAudio | RawVideo | null
  >(null);

  // Bottom sheet opening/closing is now handled by App.tsx
  // useEffect(() => {
  //   console.log('bottomSheetVisible', bottomSheetVisible);
  //   if (bottomSheetVisible) {
  //     console.log('bottomSheetVisible', bottomSheetVisible);
  //     console.log('opening bottom sheet');
  //     bottomSheetRef.current?.snapToIndex(0);
  //   } else {
  //     console.log('bottomSheetVisible', bottomSheetVisible);
  //     console.log('closing bottom sheet');
  //     bottomSheetRef.current?.close();
  //   }
  // }, [bottomSheetVisible]);

  useEffect(() => {
    const doExtraction = async () => {
      // console.log('rawSources', rawSources);
      if (rawSources.length === 0) return;

      setExtracting(true);

      const sourcesToBeExtracted: (ExtractorAudio | ExtractorVideo)[] = [];
      const readySources: (RawAudio | RawVideo)[] = [];

      rawSources.forEach(source => {
        if (
          source.type === MediaType.ExtractorAudio ||
          source.type === MediaType.ExtractorVideo
        ) {
          sourcesToBeExtracted.push(source as ExtractorAudio | ExtractorVideo);
        } else {
          readySources.push(source as RawAudio | RawVideo);
        }
      });

      // Set ready sources immediately
      setSources(readySources);

      // Extract sources that need extraction
      if (sourcesToBeExtracted.length > 0) {
        try {
          // const extractionPromises = sourcesToBeExtracted.map(source =>
          //   extractorViewModel.extract(source),
          // );

          // const results = await Promise.all(extractionPromises);
          // console.log('results', results);
          // const allExtractedSources = results.flat();

          // Update sources with all extracted results at once
          // setSources([...sources, ...allExtractedSources]);

          for (const source of sourcesToBeExtracted) {
            try {
              const extractedSources = await extractorViewModel.extract(source);
              setSources([...sources, ...extractedSources]);
            } catch (error) {
              console.error('Extraction error:', error);
              continue;
            }
          }
        } catch (error) {
          console.error('Extraction error:', error);
        }
      }

      setExtracting(false);
    };

    if (!extracting && rawSources.length > 0) {
      doExtraction();
    }
  }, []);

  // useEffect(() => {
  //   if (sources.length < 0 && !extracting) {
  //     setNoSources(true);
  //   }
  // }, [extracting, sources.length]);

  const openMedia = useCallback(
    async (
      media: RawAudio | RawVideo,
      item: DetailedItem,
      index: number = 0,
      mediaPlayerToOpen: 'mxplayer' | 'webvideocast' = 'webvideocast',
    ): Promise<void> => {
      if (mediaPlayerToOpen === 'mxplayer') {
        await SendIntentAndroid.isAppInstalled(
          'com.mxtech.videoplayer.ad',
        ).then(async isInstalled => {
          if (isInstalled) {
            await SendIntentAndroid.openAppWithData(
              'com.mxtech.videoplayer.ad',
              media.url,
              'video/*',
              {
                title: item.name + ' - ' + item.media[index].name,
                headers: JSON.stringify(media.headers),
              },
            );
          } else {
            Alert.alert(
              'MX Player is not installed, would you like to install it?',
              'You can always install it later from the Play Store',
              [
                {
                  text: 'Cancel',
                  onPress: () => {},
                  style: 'cancel',
                },
                {
                  text: 'Install',
                  onPress: async () => {
                    await Linking.openURL(
                      'market://details?id=com.mxtech.videoplayer.ad',
                    );
                  },
                },
              ],
            );
          }
        });
      } else {
        await SendIntentAndroid.isAppInstalled(
          'com.instantbits.cast.webvideo',
        ).then(async isInstalled => {
          if (isInstalled) {
            const options: WebVideoCasterOptions = {
              videoURL: media.url,
              title: item.name + ' - ' + item.media[index].name,
              posterURL: media.iconUrl,
              headers: media.headers,
              subtitles: media.subtitles,
              hideVideoAddress: false,
              position: 0,
              filename:
                item.name +
                ' - ' +
                item.media[index].name +
                media.url.split('/').pop(),
              suppressErrorMessage: false,
              mimeType: detectVideoMimeType(media.url),
            };
          } else {
            Alert.alert(
              'Web Video Cast is not installed, would you like to install it?',
              'You can always install it later from the Play Store',
              [
                {
                  text: 'Cancel',
                  onPress: () => {},
                  style: 'cancel',
                },
                {
                  text: 'Install',
                  onPress: async () => {
                    await Linking.openURL(
                      'market://details?id=com.instantbits.cast.webvideo',
                    );
                  },
                },
              ],
            );
          }
        });
      }
    },
    [],
  );

  // console.log("rawSources", rawSources)

  return (
    <>
      <BottomSheet
        ref={bottomSheetRef}
        index={bottomSheetVisible ? 0 : -1}
        snapPoints={useMemo(() => ['50%'], [])}
        handleStyle={{backgroundColor: theme.colors.surface}}
        enablePanDownToClose={true}
        enableDynamicSizing={true}
        backgroundStyle={{
          backgroundColor: theme.colors.surface,
        }}
        onClose={() => {
          setVisible(false);
          setExtracting(false);
          // setNoSources(false);
          setRawSources([]);
          setSources([]);
          setPlayerDialogVisible(false);
          setSelectedMedia(null);
        }}>
        <BottomSheetView style={styles.bottomSheetOptions}>
          {sources.length < 1 ? (
            !extracting ? (
              <Text>No Sources Found</Text>
            ) : (
              <ActivityIndicator size="large" />
            )
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                flexGrow: 1,
              }}>
              {sources.map((source, sourceIndex) => (
                <List.Item
                  key={sourceIndex}
                  title={source.name}
                  left={(props: any) =>
                    source.iconUrl ? (
                      <Image source={{uri: source.iconUrl}} {...props} />
                    ) : (
                      <LazyImage
                        placeholderSource="square"
                        style={{borderRadius: 4}}
                      />
                    )
                  }
                  onPress={() => {
                    // Navigate to MediaNavigator with the selected source
                    const mediaToView: MediaToView = {
                      type: (source.type === MediaType.RawVideo
                        ? 'Video'
                        : 'Audio') as MediaToView['type'],
                      media: [source],
                      details: detailedItem,
                      index: 0,
                    };
                    (navigation as any).navigate('media', {media: mediaToView});
                  }}
                  onLongPress={() => {
                    setSelectedMedia(source);
                    setPlayerDialogVisible(true);
                  }}
                />
              ))}
            </ScrollView>
          )}
        </BottomSheetView>
      </BottomSheet>

      {/* Player choice dialog */}
      <Portal>
        <Dialog
          visible={playerDialogVisible}
          onDismiss={() => setPlayerDialogVisible(false)}>
          <Dialog.Title>Select Video Player</Dialog.Title>
          <Dialog.Content>
            <Text>Which video player would you like to use?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setPlayerDialogVisible(false);
                if (selectedMedia) {
                  openMedia(
                    selectedMedia,
                    detailedItem,
                    mediaIndex,
                    'mxplayer',
                  );
                  setSelectedMedia(null);
                }
              }}>
              MX Player
            </Button>
            <Button
              onPress={() => {
                setPlayerDialogVisible(false);
                if (selectedMedia) {
                  openMedia(
                    selectedMedia,
                    detailedItem,
                    mediaIndex,
                    'webvideocast',
                  );
                  setSelectedMedia(null);
                }
              }}>
              Web Video Cast
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
};

export default ExtractorSourcesBottomSheet;

const styles = StyleSheet.create({
  bottomSheetOptions: {
    flex: 1,
    flexDirection: 'column',
    padding: 16,
  },
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cardWrapper: {
    width: '30%',
    marginHorizontal: '1.5%',
    marginVertical: '1.5%',
  },
});
