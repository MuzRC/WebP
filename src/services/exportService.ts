/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import JSZip from 'jszip';
import { ImageItem } from '../types';

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Muat turun semua fail WebP yang siap sebagai arkib ZIP pukal
 */
export async function downloadBatchAsZip(
  items: ImageItem[],
  onProgress?: (percent: number) => void,
  customZipName?: string
): Promise<void> {
  const completed = items.filter((item) => item.status === 'completed' && item.convertedBlob);
  if (completed.length === 0) return;

  const zip = new JSZip();
  // Gunakan nama folder kemas di dalam zip
  const folder = zip.folder('AutoWebP_Avatars') || zip;

  // Pantau nama fail bagi mengelakkan pertindihan nama
  const nameCounts: Record<string, number> = {};

  for (const item of completed) {
    // 1. Utamakan convertedName (nama dari textarea potong sprite)
    // Jika tiada, gunakan nama fail asal dan pastikan ia berformat .webp
    let rawName = (item as any).convertedName || item.name;
    let name = rawName.toLowerCase().endsWith('.webp') 
      ? rawName 
      : `${rawName.replace(/\.[^/.]+$/, '')}.webp`;

    // 2. Elak nama bertindih (contoh: student_boy_01_2.webp)
    if (nameCounts[name]) {
      nameCounts[name]++;
      const dot = name.lastIndexOf('.');
      name = `${name.substring(0, dot)}_${nameCounts[name]}${name.substring(dot)}`;
    } else {
      nameCounts[name] = 1;
    }

    if (item.convertedBlob) {
      folder.file(name, item.convertedBlob);
    }
  }

  // 3. Jana fail ZIP dengan penunjuk peratusan
  const content = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      onProgress?.(Math.round(metadata.percent));
    }
  );

  const timestamp = new Date().toISOString().slice(0, 10);
  const finalZipFileName = customZipName || `AutoWebP_Avatars_48_${timestamp}.zip`;
  downloadBlob(content, finalZipFileName);
}

/**
 * Simpan terus kesemua fail ke folder komputer (Chrome / Edge Chromium)
 */
export async function saveToDeviceFolder(
  items: ImageItem[],
  onStatusUpdate?: (msg: string) => void
): Promise<{ success: boolean; count: number; message?: string }> {
  const completed = items.filter((item) => item.status === 'completed' && item.convertedBlob);
  if (completed.length === 0) {
    return { success: false, count: 0, message: 'Tiada fail selesai untuk disimpan.' };
  }

  if ('showDirectoryPicker' in window) {
    try {
      // @ts-expect-error Window directory picker disokong pada Chromium
      const dirHandle = await window.showDirectoryPicker();
      let savedCount = 0;

      for (const item of completed) {
        if (!item.convertedBlob) continue;

        let rawName = (item as any).convertedName || item.name;
        const fileName = rawName.toLowerCase().endsWith('.webp')
          ? rawName
          : `${rawName.replace(/\.[^/.]+$/, '')}.webp`;

        onStatusUpdate?.(`Menyimpan ${fileName}...`);

        const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(item.convertedBlob);
        await writable.close();
        savedCount++;
      }

      return {
        success: true,
        count: savedCount,
        message: `${savedCount} fail berjaya disimpan terus ke dalam folder pilihan anda!`,
      };
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') {
        return { success: false, count: 0, message: 'Pemilihan folder dibatalkan.' };
      }
      console.error('File System Access API error:', err);
      // Sandaran terus ke ZIP jika ada sekatan folder
      await downloadBatchAsZip(items);
      return {
        success: true,
        count: completed.length,
        message: 'Folder access tidak dibenarkan, fail dimuat turun sebagai ZIP.',
      };
    }
  } else {
    // Sandaran automatik jika guna pelayar selain Chromium
    await downloadBatchAsZip(items);
    return {
      success: true,
      count: completed.length,
      message: 'Pelayar anda tidak menyokong direct folder pick, fail dimuat turun sebagai ZIP.',
    };
  }
}

/**
 * Kongsi fail guna perkongsian natif peranti (Web Share API)
 */
export async function shareViaWebShare(items: ImageItem[]): Promise<boolean> {
  const completed = items.filter((item) => item.status === 'completed' && item.convertedBlob);
  if (completed.length === 0) return false;

  if (navigator.share && navigator.canShare) {
    try {
      // Hadkan kepada 10 fail pertama kerana kekangan OS/browser share sheet
      const files: File[] = completed.slice(0, 10).map((item) => {
        let rawName = (item as any).convertedName || item.name;
        const name = rawName.toLowerCase().endsWith('.webp')
          ? rawName
          : `${rawName.replace(/\.[^/.]+$/, '')}.webp`;
        return new File([item.convertedBlob!], name, { type: 'image/webp' });
      });

      if (navigator.canShare({ files })) {
        await navigator.share({
          files,
          title: 'AutoWebP Pro Avatars',
          text: `Berikut adalah fail avatar WebP yang telah siap dipotong.`,
        });
        return true;
      }
    } catch (err: unknown) {
      if ((err as Error)?.name !== 'AbortError') {
        console.warn('Web share failed:', err);
      }
    }
  }
  return false;
}
