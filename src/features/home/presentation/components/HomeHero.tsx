import React from 'react';
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ImageBackground,
} from 'react-native';
import {Text, Button, TouchableRipple} from 'react-native-paper';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import {SvgUri} from 'react-native-svg';
import {useNavigation} from '@react-navigation/native';
import {useProfileStore} from '../../../profile/presentation/state/useProfileStore';

const {width: screenWidth, height: screenHeight} = Dimensions.get('window');

interface HomeHeroProps {
  title: string;
  description: string;
  imageUrl: string;
  onPlayPress: () => void;
  onAddToListPress: () => void;
  onMoreInfoPress: () => void;
  rating?: string;
  year?: string;
  duration?: string;
}

const HomeHero: React.FC<HomeHeroProps> = ({
  title,
  description,
  imageUrl,
  onPlayPress,
  onAddToListPress,
  onMoreInfoPress,
  rating,
  year,
  duration,
}) => {
  const navigation = useNavigation<any>();
  const {activeProfile} = useProfileStore();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(0, 0, 0, 0.0)', 'rgba(0, 0, 0, 0.5)']}
        start={{x: 0, y: 1}}
        end={{x: 0, y: 0}}
        style={styles.containerGradient}
      />
      <ImageBackground
        source={{uri: imageUrl}}
        style={styles.image}
        resizeMode="cover">
        <LinearGradient
          colors={['rgba(0, 0, 0, 0.0)', 'rgba(0, 0, 0, 1)']}
          start={{x: 0, y: 0}}
          end={{x: 0, y: 1}}
          style={styles.gradientOverlay}
        />

        <View style={styles.overlay}>
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
        </View>
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>

          <View style={styles.metadata}>
            {year && <Text style={styles.metadataText}>{year}</Text>}
            {rating && (
              <>
                <Text style={styles.metadataSeparator}>•</Text>
                <Text style={styles.metadataText}>{rating}</Text>
              </>
            )}
            {duration && (
              <>
                <Text style={styles.metadataSeparator}>•</Text>
                <Text style={styles.metadataText}>{duration}</Text>
              </>
            )}
          </View>

          <Text style={styles.description} numberOfLines={3}>
            {description}
          </Text>

          <View style={styles.actions}>
            <Button
              mode="contained"
              onPress={onPlayPress}
              style={[styles.button, styles.playButton]}
              labelStyle={styles.playButtonLabel}
              icon={({size, color}) => (
                <MaterialIcons name="play-arrow" size={size} color={color} />
              )}>
              Play
            </Button>

            <Button
              mode="outlined"
              // onPress={onAddToListPress}
              onPress={onMoreInfoPress}
              style={[styles.button, styles.secondaryButton]}
              labelStyle={styles.secondaryButtonLabel}
              icon={({size, color}) => (
                <MaterialIcons name="info" size={size} color={color} />
              )}>
              Info
            </Button>

            {/* <TouchableOpacity
              style={styles.infoButton}
              onPress={onMoreInfoPress}>
              <MaterialIcons name="info-outline" size={24} color="#fff" />
            </TouchableOpacity> */}
          </View>
        </View>
      </ImageBackground>
    </View>
  );
};

export default HomeHero;

const styles = StyleSheet.create({
  container: {
    height: screenHeight * 0.6,
    width: screenWidth,
  },
  containerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  image: {
    width: Dimensions.get('window').width,
    height: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 300,
  },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 40,
    zIndex: 2,
  },
  overlay: {
    position: 'absolute',
    top: 16,
    right: 0,
    zIndex: 2,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F5F5F5',
    marginBottom: 8,
    textAlign: 'center',
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  metadataText: {
    fontSize: 14,
    color: '#C0C0C0',
  },
  metadataSeparator: {
    fontSize: 14,
    color: '#C0C0C0',
    marginHorizontal: 8,
  },
  description: {
    fontSize: 16,
    color: '#E5E5E5',
    lineHeight: 22,
    marginBottom: 20,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  button: {
    borderRadius: 4,
    minWidth: 100,
  },
  playButton: {
    backgroundColor: '#FFFFFF',
  },
  playButtonLabel: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'rgba(109, 109, 110, 0.7)',
    borderColor: 'transparent',
  },
  secondaryButtonLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(109, 109, 110, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
