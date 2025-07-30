import {View, StyleSheet, Alert, Linking, Image} from 'react-native';
import React, {useEffect, useMemo, useState} from 'react';
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
    setBottomSheetVisible: setVisible,
    rawSources,
    setRawSources,
    sources,
    setSources,
  } = useExtractorServiceStore(state => state);

  const extractorViewModel = new ExtractorViewModel();

  const [noSources, setNoSources] = useState<boolean>(false);
  // State for player choice dialog
  const [playerDialogVisible, setPlayerDialogVisible] =
    useState<boolean>(false);
  const [selectedMedia, setSelectedMedia] = useState<
    RawAudio | RawVideo | null
  >(null);

  // console.log(mediaIndex);

  // console.log(rawSources);

  useEffect(() => {
    const doExtraction = async () => {
      var sourcesToBeExtracted: (
        | ExtractorAudio
        | RawAudio
        | ExtractorVideo
        | RawVideo
      )[] = [];
      console.log('rawSources', rawSources);
      rawSources.map(source => {
        if (
          source.type === MediaType.ExtractorAudio ||
          source.type === MediaType.ExtractorVideo
        ) {
          sourcesToBeExtracted.push(source);
        }
      });
      setSources(
        rawSources.filter(source => !sourcesToBeExtracted.includes(source)) as (
          | RawAudio
          | RawVideo
        )[],
      );
      (rawSources as (ExtractorAudio | ExtractorVideo)[]).forEach(
        async (source, index: number) => {
          await extractorViewModel.extract(source).then(result => {
            result.map((extractedSource: RawAudio | RawVideo) => {
              setSources([...sources, extractedSource]);
            });
          });
        },
      );
    };

    const startExtraction = async () => {
      if (rawSources.length > 0) {
        setExtracting(true);
        await doExtraction().then(() => {
          setExtracting(false);
        });
      }
    };

    if (!extracting) {
      startExtraction();
    }
  }, [rawSources.length]);

  useEffect(() => {
    if (sources.length < 0 && !extracting) {
      setNoSources(true);
    }
  }, [extracting, sources.length]);

  const openMedia = async (
    media: RawAudio | RawVideo,
    item: DetailedItem,
    index: number = 0,
    mediaPlayerToOpen: 'mxplayer' | 'webvideocast' = 'webvideocast',
  ): Promise<void> => {
    if (mediaPlayerToOpen === 'mxplayer') {
      await SendIntentAndroid.isAppInstalled('com.mxtech.videoplayer.ad').then(
        async isInstalled => {
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
        },
      );
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
            position: 0, // Start at 30 seconds
            // userAgent: media.headers?.['User-Agent'] || 'Umbrella/1.0',
            filename:
              item.name +
              ' - ' +
              item.media[index].name +
              media.url.split('/').pop(),
            suppressErrorMessage: false,
            mimeType: detectVideoMimeType(media.url),
          };
          // RNWebVideoCaster.playVideo(options);
          // RNWebVideoCaster.isAppInstalled((isInstalled: boolean) => {
          //   console.log('IS INSTALLED', isInstalled);
          // });
          //   await SendIntentAndroid.openAppWithData(
          //     'com.instantbits.cast.webvideo',
          //     media.url,
          //     'video/*',
          //     {
          //       title: item.name + ' - ' + item.media[index].name,
          //       headers: JSON.stringify(media.headers),
          //     },
          //   );
          // try {
          //   await Linking.openURL(
          //     `wvc-x-callback://open?url=${media.url}&headers=Referer:$20https://s3taku.one/`,
          //     // ${
          //     //   media.headers
          //     //     ? Object.entries(media.headers)
          //     //         .map(([key, value]) => `&${key}:%20${value}`)
          //     //         .join('')
          //     //     : ''
          //     // }`,
          //   );
          // } catch (error) {
          //   console.log('ERROR', error);
          // }
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
  };

  console.log('SOURCES', sources);

  return (
    <>
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
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
          setNoSources(false);
          setRawSources([]);
          setSources([]);
          setPlayerDialogVisible(false);
          setSelectedMedia(null);
        }}>
        <BottomSheetView
          style={{
            ...styles.bottomSheetOptions,
          }}>
          {sources.length < 1 ? (
            noSources ? (
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
                        ? 'video'
                        : 'audio') as MediaToView['type'],
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
