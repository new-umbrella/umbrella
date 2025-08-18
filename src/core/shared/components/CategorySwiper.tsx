import React from 'react';
import {View, ScrollView, StyleSheet, TouchableOpacity} from 'react-native';
import {Icon, Text} from 'react-native-paper';
import ItemCard from './ItemCard';
import Category from '../../../features/plugins/data/model/item/Category';

interface CategorySwiperProps {
  category: Category;
  onSeeAllPress?: () => void;
  variant?: 'tall' | 'wide' | 'square';
}

const CategorySwiper: React.FC<CategorySwiperProps> = ({
  category,
  onSeeAllPress,
  variant = 'tall',
}) => {
  // Filter valid items from the category
  const validItems = category.items.filter(
    item => item && item.imageUrl && item.imageUrl.trim() !== '',
  );

  if (validItems.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{category.name}</Text>
        {onSeeAllPress && category.isPaginated && (
          <TouchableOpacity style={styles.seeAll} onPress={onSeeAllPress}>
            <Icon source={'arrow-right'} size={24} color="#A0A0A0" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {validItems.map((item, index) => (
          <ItemCard
            key={index}
            item={{...item, source: category.source}}
            variant={variant}
          />
        ))}
      </ScrollView>
    </View>
  );
};

export default CategorySwiper;

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  seeAll: {
    padding: 4,
  },
  scrollContent: {
    marginLeft: 16,
  },
});
