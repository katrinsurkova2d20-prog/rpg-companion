import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useCharacter } from '../../CharacterContext';
import { ORIGINS } from '../CharacterScreen/logic/originsData';

const getOriginImage = (originName) => {
  if (!originName) return null;
  const found = ORIGINS.find(o => o.name === originName);
  return found ? found.image : null;
};

const NUM_COLS = 3;

const CreateCell = ({ onPress }) => (
  <TouchableOpacity style={styles.createCell} onPress={onPress} activeOpacity={0.7}>
    <Text style={styles.createPlus}>+</Text>
    <Text style={styles.createLabel}>Создать{'\n'}персонажа</Text>
  </TouchableOpacity>
);

const CharacterCell = ({ character, onPress, onDelete }) => {
  const originImage = getOriginImage(character.originName);
  return (
    <TouchableOpacity
      style={styles.characterCell}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.characterImageContainer}>
        {originImage ? (
          <Image source={originImage} style={styles.characterImage} resizeMode="cover" />
        ) : (
          <View style={styles.characterImagePlaceholder}>
            <Text style={styles.characterImagePlaceholderText}>?</Text>
          </View>
        )}
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={(event) => {
          event?.stopPropagation?.();
          onDelete();
        }}
        hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
      >
        <Text style={styles.deleteIcon}>🗑</Text>
      </TouchableOpacity>
      <Text style={styles.characterName} numberOfLines={2}>{character.name}</Text>
      {character.level ? (
        <Text style={styles.characterLevel}>Ур. {character.level}</Text>
      ) : null}
    </TouchableOpacity>
  );
};

const EmptyCell = ({ id }) => <View key={id} style={styles.emptyCell} />;

export default function HomeScreen({ navigation }) {
  const { getCharactersList, loadCharacter, resetCharacter, deleteCharacter } = useCharacter();
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getCharactersList();
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setCharacters(list);
    } catch (e) {
      setCharacters([]);
    } finally {
      setLoading(false);
    }
  }, [getCharactersList]);

  useFocusEffect(
    useCallback(() => {
      loadList();
    }, [loadList])
  );

  const handleCreate = () => {
    resetCharacter();
    navigation.navigate('Персонаж');
  };

  const handleOpen = async (id) => {
    const ok = await loadCharacter(id);
    if (ok) {
      navigation.navigate('Персонаж');
    }
  };

  const handleDelete = (character) => {
    const confirmDelete = async () => {
      await deleteCharacter(character.id);
      loadList();
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const confirmed = window.confirm('Вы действительно хотите удалить этого персонажа?');
      if (confirmed) {
        confirmDelete();
      }
      return;
    }

    Alert.alert(
      'Удаление персонажа',
      'Вы действительно хотите удалить этого персонажа?',
      [
        {
          text: 'Да',
          style: 'destructive',
          onPress: confirmDelete,
        },
        { text: 'Нет', style: 'cancel' },
      ],
      { cancelable: false }
    );
  };

  const allItems = [
    { type: 'create' },
    ...characters.map(c => ({ type: 'character', ...c })),
  ];

  const rows = [];
  for (let i = 0; i < allItems.length; i += NUM_COLS) {
    rows.push(allItems.slice(i, i + NUM_COLS));
  }
  if (rows.length > 0) {
    const lastRow = rows[rows.length - 1];
    while (lastRow.length < NUM_COLS) {
      lastRow.push({ type: 'empty', id: `empty_${lastRow.length}` });
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Менеджер персонажей</Text>
        <Text style={styles.subtitle}>Ролевая игра Fallout (2d20)</Text>
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#d4af37" style={styles.loader} />
        ) : (
          rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.row}>
              {row.map((item) => {
                if (item.type === 'create') {
                  return <CreateCell key="create" onPress={handleCreate} />;
                }
                if (item.type === 'empty') {
                  return <EmptyCell key={item.id} id={item.id} />;
                }
                return (
                  <CharacterCell
                    key={item.id}
                    character={item}
                    onPress={() => handleOpen(item.id)}
                    onDelete={() => handleDelete(item)}
                  />
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  titleContainer: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderBottomWidth: 1,
    borderBottomColor: '#d4af37',
  },
  title: {
    color: '#f0e68c',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
  },
  subtitle: {
    color: '#ccc',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 24,
  },
  loader: {
    marginTop: 60,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  createCell: {
    flex: 1,
    margin: 5,
    aspectRatio: 0.75,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#5a5a5a',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createPlus: {
    fontSize: 48,
    color: '#5a5a5a',
    lineHeight: 56,
    fontWeight: '200',
  },
  createLabel: {
    fontSize: 12,
    color: '#5a5a5a',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  characterCell: {
    flex: 1,
    margin: 5,
    aspectRatio: 0.75,
    borderWidth: 1,
    borderColor: '#5a5a5a',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    overflow: 'hidden',
  },
  characterImageContainer: {
    flex: 1,
    backgroundColor: '#e0e0e0',
  },
  deleteButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
  },
  deleteIcon: {
    fontSize: 15,
    lineHeight: 18,
  },
  characterImage: {
    width: '100%',
    height: '100%',
  },
  characterImagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#c8c8c8',
  },
  characterImagePlaceholderText: {
    fontSize: 36,
    color: '#888',
  },
  characterName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#222',
    textAlign: 'center',
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 2,
  },
  characterLevel: {
    fontSize: 10,
    color: '#555',
    textAlign: 'center',
    paddingBottom: 4,
  },
  emptyCell: {
    flex: 1,
    margin: 5,
    aspectRatio: 0.75,
  },
});
