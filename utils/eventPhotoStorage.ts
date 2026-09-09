import { Directory, File, Paths } from 'expo-file-system';

const PHOTOS_DIR_NAME = 'event-photos';

function getPhotosDirectory(): Directory {
  return new Directory(Paths.document, PHOTOS_DIR_NAME);
}

function generatePhotoFilename(sourceUri: string): string {
  const extensionMatch = /\.[a-zA-Z0-9]+$/.exec(sourceUri);
  const extension = extensionMatch ? extensionMatch[0] : '.jpg';
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extension}`;
}

export async function savePhotoFile(sourceUri: string): Promise<string> {
  const directory = getPhotosDirectory();
  directory.create({ intermediates: true, idempotent: true });

  const filename = generatePhotoFilename(sourceUri);
  const destination = new File(directory, filename);
  await new File(sourceUri).copy(destination);
  return filename;
}

export function photoFileUri(filename: string): string {
  return new File(getPhotosDirectory(), filename).uri;
}

export function deletePhotoFile(filename: string): void {
  const file = new File(getPhotosDirectory(), filename);
  if (file.exists) {
    file.delete();
  }
}
