import React from 'react';
import {View, Text, StyleSheet, Image, TouchableOpacity} from 'react-native';
import {useTheme} from 'react-native-paper';

const ExtractorUI = () => {
  const theme = useTheme();
  const colors = theme.colors;

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <View style={styles.header}>
        <Text style={[styles.title, {color: colors.onBackground}]}>
          Available Sources
        </Text>
      </View>

      <View style={styles.sourcesContainer}>
        <View style={styles.sourceCard}>
          <Image
            source={{uri: 'https://via.placeholder.com/150'}}
            style={styles.thumbnail}
          />
          <View style={styles.sourceInfo}>
            <Text style={[styles.sourceName, {color: colors.onBackground}]}>
              High Quality Source
            </Text>
            <View style={styles.matchBadge}>
              <Text style={styles.matchText}>98% Match</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, {width: '98%'}]} />
            </View>
          </View>
        </View>

        <View style={styles.sourceCard}>
          <Image
            source={{uri: 'https://via.placeholder.com/150'}}
            style={styles.thumbnail}
          />
          <View style={styles.sourceInfo}>
            <Text style={[styles.sourceName, {color: colors.onBackground}]}>
              Standard Quality
            </Text>
            <View style={styles.matchBadge}>
              <Text style={styles.matchText}>85% Match</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, {width: '85%'}]} />
            </View>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.selectButton}>
        <Text style={styles.buttonText}>SELECT SOURCE</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  sourcesContainer: {
    marginBottom: 20,
  },
  sourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
  },
  thumbnail: {
    width: 100,
    height: 60,
    borderRadius: 4,
    marginRight: 15,
  },
  sourceInfo: {
    flex: 1,
  },
  sourceName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  matchBadge: {
    backgroundColor: '#46d369',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  matchText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#424242',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#46d369',
  },
  selectButton: {
    backgroundColor: '#e50914',
    paddingVertical: 14,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default ExtractorUI;
