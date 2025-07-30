import React from 'react';
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ImageBackground,
} from 'react-native';
import {Text} from 'react-native-paper';
import LinearGradient from 'react-native-linear-gradient';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import Item from '../../../features/plugins/data/model/item/Item';

const {width: screenWidth, height: screenHeight} = Dimensions.get('window');

type RootStackParamList = {
  details: {itemId: string; plugin: any};
  // Add other screens here
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'details'>;

interface ItemCardProps {
  item: Item;
  variant?: 'tall' | 'wide' | 'square';
}

const ItemCard: React.FC<ItemCardProps> = ({item, variant = 'tall'}) => {
  const navigation = useNavigation<NavigationProp>();

  const getDimensions = () => {
    switch (variant) {
      case 'wide':
        return {
          width: 360,
          height: 180,
        };
      case 'square':
        return {
          width: 180,
          height: 180,
        };
      case 'tall':
      default:
        return {
          width: 120,
          height: 185,
        };
    }
  };

  const dimensions = getDimensions();

  const handlePress = () => {
    navigation.navigate('details', {
      itemId: item.id,
      plugin: item.source,
    });
  };

  return (
    <TouchableOpacity
      style={[styles.container, dimensions]}
      onPress={handlePress}
      activeOpacity={0.8}>
      <ImageBackground
        source={{uri: item.imageUrl}}
        style={[styles.image, dimensions]}
        // blurRadius={4}
        resizeMode="cover">
        <LinearGradient
          colors={['rgba(0, 0, 0, 0.0)', 'rgba(0, 0, 0, 0.75)']}
          start={{x: 0, y: 0}}
          end={{x: 0, y: 1}}
          style={styles.overlay}>
          <Text style={styles.title} numberOfLines={2}>
            {item.name}
          </Text>
        </LinearGradient>
      </ImageBackground>
    </TouchableOpacity>
  );
};

export default ItemCard;

const styles = StyleSheet.create({
  container: {
    marginRight: 8,
    borderRadius: 4,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  image: {
    borderRadius: 4,
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
});
