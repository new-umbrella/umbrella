import React from 'react';
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ImageBackground,
} from 'react-native';
import {Text, Button} from 'react-native-paper';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';

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
  return (
    <View style={styles.container}>
      <ImageBackground
        source={{uri: imageUrl}}
        style={styles.image}
        resizeMode="cover">
        <LinearGradient
          colors={[
            'rgba(0, 0, 0, 0.0)',
            'rgba(0, 0, 0, 0.0)',
            'rgba(0, 0, 0, 0.05)',
            'rgba(0, 0, 0, 0.15)',
            'rgba(0, 0, 0, 0.35)',
            'rgba(0, 0, 0, 0.55)',
            'rgba(0, 0, 0, 0.75)',
          ]}
          locations={[0, 0.3, 0.5, 0.7, 0.85, 0.95, 1]}
          style={styles.gradientOverlay}
        />

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
              onPress={onAddToListPress}
              style={[styles.button, styles.secondaryButton]}
              labelStyle={styles.secondaryButtonLabel}
              icon={({size, color}) => (
                <MaterialIcons name="add" size={size} color={color} />
              )}>
              My List
            </Button>

            <TouchableOpacity
              style={styles.infoButton}
              onPress={onMoreInfoPress}>
              <MaterialIcons name="info-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
};

export default HomeHero;

const styles = StyleSheet.create({
  container: {
    height: screenHeight / 2,
    width: screenWidth,
  },
  image: {
    width: '100%',
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
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F5F5F5',
    marginBottom: 8,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
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
