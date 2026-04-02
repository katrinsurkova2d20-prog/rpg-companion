import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
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
import { setCurrentLocale, useLocale } from '../../../i18n/locale';
import { tHomeScreen } from './logic/homeScreenI18n';
import * as db from '../../../db';
import {
  createCharacterExportPayload,
  parseCharacterImportPayload,
  downloadCharacterPayloadWeb,
  pickCharacterFileWeb,
  IMPORT_ERRORS,
} from './logic/characterTransfer';

const getOriginImage = (originName) => {
  if (!originName) return null;
  const found = ORIGINS.find(o => o.name === originName);
  return found ? found.image : null;
};

const NUM_COLS = 3;

const ActionCell = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.createCell} onPress={onPress} activeOpacity={0.7}>
    <Text style={styles.createPlus}>{icon}</Text>
    <Text style={styles.createLabel}>{label}</Text>
  </TouchableOpacity>
);

const CharacterCell = ({ character, onPress, onDelete, onDownload }) => {
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

      <TouchableOpacity
        style={styles.downloadButton}
        onPress={(event) => {
          event?.stopPropagation?.();
          onDownload();
        }}
        hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
      >
        <Text style={styles.downloadIcon}>⭳</Text>
      </TouchableOpacity>
      <Text style={styles.characterName} numberOfLines={2}>{character.name}</Text>
      {character.level ? (
        <Text style={styles.characterLevel}>{tHomeScreen("labels.level", "Ур.")} {character.level}</Text>
      ) : null}
    </TouchableOpacity>
  );
};

const EmptyCell = ({ id }) => <View key={id} style={styles.emptyCell} />;

export default function HomeScreen({ navigation }) {
  const locale = useLocale();
  const { getCharactersList, loadCharacter, resetCharacter, deleteCharacter } = useCharacter();
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const languageOptions = [
    { code: 'ru-RU', label: tHomeScreen('language.russian', 'Русский'), flag: '🇷🇺' },
    { code: 'en-EN', label: tHomeScreen('language.english', 'English'), flag: '🇬🇧' },
  ];

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
    navigation.navigate('CharacterTab');
  };

  const handleOpen = async (id) => {
    const ok = await loadCharacter(id);
    if (ok) {
      navigation.navigate('CharacterTab');
    }
  };

  const handleDelete = (character) => {
    const confirmDelete = async () => {
      await deleteCharacter(character.id);
      loadList();
    };

    const confirmMessage = tHomeScreen('deleteConfirm', 'Вы действительно хотите удалить этого персонажа?');

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const confirmed = window.confirm(confirmMessage);
      if (confirmed) {
        confirmDelete();
      }
      return;
    }

    Alert.alert(
      tHomeScreen('title', 'Менеджер персонажей'),
      confirmMessage,
      [
        {
          text: tHomeScreen('buttons.yes', 'Да') || 'Да',
          style: 'destructive',
          onPress: confirmDelete,
        },
        { text: tHomeScreen('buttons.no', 'Нет') || 'Нет', style: 'cancel' },
      ],
      { cancelable: false }
    );
  };


  const handleDownload = async (character) => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      Alert.alert(
        tHomeScreen('title', 'Менеджер персонажей'),
        tHomeScreen('download.unsupported', 'Загрузка/сохранение файлов поддерживается только в web-версии.')
      );
      return;
    }

    const row = await db.loadCharacterById(character.id);
    if (!row) {
      Alert.alert(tHomeScreen('title', 'Менеджер персонажей'), tHomeScreen('download.errors.notFound', 'Персонаж не найден.'));
      return;
    }

    const payload = createCharacterExportPayload(row);
    downloadCharacterPayloadWeb(payload, row.name);
  };

  const handleUpload = async () => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      Alert.alert(
        tHomeScreen('title', 'Менеджер персонажей'),
        tHomeScreen('upload.unsupported', 'Загрузка файлов поддерживается только в web-версии.')
      );
      return;
    }

    const rawText = await pickCharacterFileWeb();
    if (!rawText) return;

    const parsed = parseCharacterImportPayload(rawText);
    if (parsed.error) {
      Alert.alert(
        tHomeScreen('title', 'Менеджер персонажей'),
        tHomeScreen(IMPORT_ERRORS[parsed.error], tHomeScreen('upload.errors.default', 'Не удалось импортировать персонажа.'))
      );
      return;
    }

    const importedCharacter = parsed.character;
    const existing = characters.find((item) => item.name === importedCharacter.name);

    const persistImport = async () => {
      const id = existing?.id || importedCharacter.id || `char_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      await db.saveCharacter(
        id,
        importedCharacter.name,
        importedCharacter.level ?? 1,
        importedCharacter.originName ?? null,
        importedCharacter.data
      );
      await loadList();
    };

    if (!existing) {
      await persistImport();
      return;
    }

    const overwriteMessage = tHomeScreen('upload.overwriteConfirm', 'Персонаж с таким именем уже существует. Перезаписать его?');

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const confirmed = window.confirm(overwriteMessage);
      if (confirmed) {
        await persistImport();
      }
      return;
    }

    Alert.alert(
      tHomeScreen('title', 'Менеджер персонажей'),
      overwriteMessage,
      [
        { text: tHomeScreen('buttons.no', 'Нет') || 'Нет', style: 'cancel' },
        {
          text: tHomeScreen('buttons.yes', 'Да') || 'Да',
          style: 'destructive',
          onPress: persistImport,
        },
      ],
      { cancelable: true }
    );
  };

  const allItems = [
    { type: 'create' },
    { type: 'upload' },
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
      <View style={styles.languageRow}>
        <View style={styles.languageContainer}>
          {languageOptions.map((lang, index) => {
            const isFirst = index === 0;
            const isLast = index === languageOptions.length - 1;
            return (
              <Pressable
                key={lang.code}
                style={[
                  styles.langSegment,
                  isFirst && styles.langSegmentLeft,
                  isLast && styles.langSegmentRight,
                  locale === lang.code && styles.langSegmentActive,
                ]}
                onPress={() => setCurrentLocale(lang.code)}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              >
                <Text style={[styles.langSegmentText, locale === lang.code && styles.langSegmentTextActive]}>
                  {lang.code === 'ru-RU' ? 'ru' : 'en'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>{tHomeScreen("title", "Менеджер персонажей")}</Text>
        <Text style={styles.subtitle}>{tHomeScreen("subtitle", "Ролевая игра Fallout (2d20)")}</Text>
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
                  return (
                    <ActionCell
                      key="create"
                      icon={tHomeScreen('createButton.plus', '+')}
                      label={tHomeScreen('createButton.text', 'Создать\nперсонажа')}
                      onPress={handleCreate}
                    />
                  );
                }
                if (item.type === 'upload') {
                  return (
                    <ActionCell
                      key="upload"
                      icon={tHomeScreen('upload.icon', '⇪')}
                      label={tHomeScreen('upload.button', 'Загрузить\nперсонажа')}
                      onPress={handleUpload}
                    />
                  );
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
                    onDownload={() => handleDownload(item)}
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
  languageRow: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 6,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderBottomWidth: 1,
    borderBottomColor: '#d4af37',
    alignItems: 'flex-end',
  },
  languageContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#6b7280',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(17,24,39,0.85)',
  },
  langSegment: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 34,
    borderRightWidth: 1,
    borderRightColor: '#6b7280',
    justifyContent: 'center',
    alignItems: 'center',
  },
  langSegmentText: {
    color: '#9ca3af',
    fontSize: 13,
    textTransform: 'uppercase',
  },
  langSegmentLeft: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  langSegmentRight: {
    borderRightWidth: 0,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  langSegmentActive: {
    backgroundColor: '#f0e68c',
  },
  langSegmentTextActive: {
    color: '#111827',
    fontWeight: '700',
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
  downloadButton: {
    position: 'absolute',
    right: 5,
    bottom: 5,
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
  downloadIcon: {
    fontSize: 16,
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
