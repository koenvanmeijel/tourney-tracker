import { useState } from 'react';
import { FlatList, Image, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SymbolView } from 'expo-symbols';

import { MUTED_TEXT_OPACITY } from '@/constants/Colors';
import { useAppAlert } from '@/context/AppAlertContext';
import { useEvents } from '@/context/EventsContext';
import { useTheme } from '@/context/ThemeContext';
import type { EventPhotoRecord } from '@/models/types';
import { photoFileUri } from '@/utils/eventPhotoStorage';

const THUMBNAIL_SIZE = 84;

interface EventPhotosProps {
  eventId: number;
  photos: EventPhotoRecord[];
}

export function EventPhotos({ eventId, photos }: EventPhotosProps) {
  const { palette } = useTheme();
  const { addPhoto, removePhoto, reorderPhotos } = useEvents();
  const { alert, confirm } = useAppAlert();
  const { width } = useWindowDimensions();
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  async function addPhotos(uris: string[]) {
    setBusy(true);
    try {
      for (const uri of uris) {
        await addPhoto(eventId, uri);
      }
    } catch (err) {
      await alert('Error', err instanceof Error ? err.message : 'Failed to save photo.');
    } finally {
      setBusy(false);
    }
  }

  async function pickFromCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      await alert('Camera access needed', 'Allow camera access for Tourney Tracker in your device settings.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 0.7 });
    if (!result.canceled) {
      await addPhotos(result.assets.map((asset) => asset.uri));
    }
  }

  async function pickFromLibrary() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      await alert('Photo access needed', 'Allow photo library access for Tourney Tracker in your device settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.7,
      allowsMultipleSelection: true,
    });
    if (!result.canceled) {
      await addPhotos(result.assets.map((asset) => asset.uri));
    }
  }

  async function handleDelete(photo: EventPhotoRecord) {
    const confirmed = await confirm('Delete photo?', "This can't be undone.", {
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (confirmed) {
      setViewingIndex(null);
      await removePhoto(photo.id);
    }
  }

  async function handleSetThumbnail(photo: EventPhotoRecord) {
    setViewingIndex(null);
    const reordered = [photo, ...photos.filter((candidate) => candidate.id !== photo.id)];
    await reorderPhotos(
      eventId,
      reordered.map((candidate) => candidate.id)
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.sectionLabel, { color: palette.text }]}>Photos</Text>
        <View style={styles.addButtons}>
          <Pressable
            style={[styles.addButton, { backgroundColor: palette.accentTint }]}
            onPress={pickFromCamera}
            disabled={busy}>
            <SymbolView name={{ android: 'photo_camera' }} tintColor={palette.accent} size={16} />
            <Text style={[styles.addButtonText, { color: palette.accent }]}>Camera</Text>
          </Pressable>
          <Pressable
            style={[styles.addButton, { backgroundColor: palette.accentTint }]}
            onPress={pickFromLibrary}
            disabled={busy}>
            <SymbolView name={{ android: 'photo_library' }} tintColor={palette.accent} size={16} />
            <Text style={[styles.addButtonText, { color: palette.accent }]}>Library</Text>
          </Pressable>
        </View>
      </View>

      {photos.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnailRow}>
          {photos.map((photo, index) => (
            <Pressable key={photo.id} onPress={() => setViewingIndex(index)}>
              <Image source={{ uri: photoFileUri(photo.filename) }} style={styles.thumbnail} />
              {index === 0 ? (
                <View style={styles.thumbnailBadge}>
                  <SymbolView name={{ android: 'star' }} tintColor="#FFFFFF" size={13} style={styles.thumbnailBadgeIcon} />
                </View>
              ) : null}
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <Text style={[styles.emptyText, { color: palette.onSurfaceText }]}>No photos yet.</Text>
      )}

      <Modal
        visible={viewingIndex != null}
        transparent
        animationType="fade"
        onRequestClose={() => setViewingIndex(null)}>
        {viewingIndex != null ? (
          <View style={styles.viewerBackdrop}>
            <FlatList
              data={photos}
              keyExtractor={(photo) => String(photo.id)}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={viewingIndex}
              getItemLayout={(_data, index) => ({ length: width, offset: width * index, index })}
              onMomentumScrollEnd={(event) => {
                const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
                setViewingIndex(Math.max(0, Math.min(nextIndex, photos.length - 1)));
              }}
              renderItem={({ item }) => (
                <Pressable style={[styles.viewerPage, { width }]} onPress={() => setViewingIndex(null)}>
                  <Image source={{ uri: photoFileUri(item.filename) }} style={styles.viewerImage} resizeMode="contain" />
                </Pressable>
              )}
            />
            {photos.length > 1 ? (
              <Text style={styles.viewerCounter}>
                {viewingIndex + 1} / {photos.length}
              </Text>
            ) : null}
            <Pressable style={styles.viewerCloseButton} onPress={() => setViewingIndex(null)} hitSlop={12}>
              <SymbolView name={{ android: 'close' }} tintColor="#FFFFFF" size={22} />
            </Pressable>
            <View style={styles.viewerActions}>
              {viewingIndex > 0 ? (
                <Pressable style={styles.viewerActionButton} onPress={() => handleSetThumbnail(photos[viewingIndex])}>
                  <SymbolView name={{ android: 'star_border' }} tintColor="#FFFFFF" size={18} />
                  <Text style={styles.viewerActionText}>Set as thumbnail</Text>
                </Pressable>
              ) : null}
              <Pressable style={styles.viewerActionButton} onPress={() => handleDelete(photos[viewingIndex])}>
                <SymbolView name={{ android: 'delete' }} tintColor="#FFFFFF" size={18} />
                <Text style={styles.viewerActionText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    opacity: MUTED_TEXT_OPACITY,
    textTransform: 'uppercase',
  },
  addButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    opacity: MUTED_TEXT_OPACITY,
  },
  thumbnailRow: {
    gap: 8,
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: 10,
  },
  thumbnailBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailBadgeIcon: {
    transform: [{ translateX: 1 }, { translateY: 1 }],
  },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerPage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerImage: {
    width: '100%',
    height: '80%',
  },
  viewerCounter: {
    position: 'absolute',
    top: 52,
    alignSelf: 'center',
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  viewerCloseButton: {
    position: 'absolute',
    top: 48,
    right: 20,
  },
  viewerActions: {
    position: 'absolute',
    bottom: 48,
    flexDirection: 'row',
    gap: 12,
  },
  viewerActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  viewerActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
