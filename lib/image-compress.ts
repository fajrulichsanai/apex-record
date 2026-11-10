/**
 * Kompresi foto di client sebelum diunggah: resize ke lebar maksimum dan
 * re-encode sebagai JPEG kualitas tinggi. Tetap tajam untuk dibandingkan
 * progres/konten, tapi jauh lebih kecil dari foto kamera asli.
 */
export interface CompressedImage {
  file: File;
  originalSizeBytes: number;
  compressedSizeBytes: number;
}

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

export async function compressImage(file: File): Promise<CompressedImage> {
  const originalSizeBytes = file.size;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas unavailable');
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    );
    if (!blob || blob.size >= originalSizeBytes) {
      // Kompresi tidak menghemat apa-apa (foto sudah kecil) — pakai aslinya.
      return { file, originalSizeBytes, compressedSizeBytes: originalSizeBytes };
    }
    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    const compressed = new File([blob], name, { type: 'image/jpeg' });
    return { file: compressed, originalSizeBytes, compressedSizeBytes: blob.size };
  } catch {
    // Browser lama/gagal decode — unggah file aslinya, tanpa kompresi.
    return { file, originalSizeBytes, compressedSizeBytes: originalSizeBytes };
  }
}

export function formatBytesShort(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function savingsPct(originalBytes: number, compressedBytes: number): number {
  if (originalBytes <= 0) return 0;
  return Math.max(0, Math.round((1 - compressedBytes / originalBytes) * 100));
}
