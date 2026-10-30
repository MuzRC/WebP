import JSZip from 'jszip';
import { ImageItem } from '../types';
import { generateOutputFileName } from './imageConverter';

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

export async function downloadBatchAsZip(
  items: ImageItem[],
  onProgress?: (percent: number) => void
): Promise<void> {
  const completed = items.filter((item) => item.status === 'completed' && item.convertedBlob);
  if (completed.length === 0) return;

  const zip = new JSZip();
  const folder = zip.folder('AutoWebP_Export') || zip;

  // Track filenames to avoid duplicates
  const nameCounts: Record<string, number> = {};

  for (const item of completed) {
    let name = generateOutputFileName(item.name, {
      quality: 80,
      resizeMode: 'none',
      customWidth: 0,
      customHeight: 0,
      maintainAspectRatio: true,
      fileNaming: 'default',
      namingCustomText: '',
      autoProcessOnUpload: false,
      enableSoundNotification: false,
      enableDesktopNotification: false,
    });

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
  downloadBlob(content, `AutoWebP_Batch_${timestamp}.zip`);
}

// Modern File System Access API (Direct Directory Save)
export async function saveToDeviceFolder(
  items: ImageItem[],
  onStatusUpdate?: (msg: string) => void
): Promise<{ success: boolean; count: number; message?: string }> {
  const completed = items.filter((item) => item.status === 'completed' && item.convertedBlob);
  if (completed.length === 0) {
    return { success: false, count: 0, message: 'Tiada fail selesai untuk disimpan.' };
  }

  // Check if browser supports showDirectoryPicker
  if ('showDirectoryPicker' in window) {
    try {
      // @ts-expect-error Window directory picker is standard in modern Chromium/Edge
      const dirHandle = await window.showDirectoryPicker();
      let savedCount = 0;

      for (const item of completed) {
        if (!item.convertedBlob) continue;
        const fileName = item.name.replace(/\.[^/.]+$/, '') + '.webp';
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
      // Fallback to ZIP
      await downloadBatchAsZip(items);
      return {
        success: true,
        count: completed.length,
        message: 'Folder access ditolak, fail dimuat turun sebagai fail ZIP.',
      };
    }
  } else {
    // Graceful fallback to ZIP
    await downloadBatchAsZip(items);
    return {
      success: true,
      count: completed.length,
      message: 'Pelayar anda tidak menyokong direct folder pick, fail dimuat turun sebagai ZIP.',
    };
  }
}

// Native Web Share API
export async function shareViaWebShare(items: ImageItem[]): Promise<boolean> {
  const completed = items.filter((item) => item.status === 'completed' && item.convertedBlob);
  if (completed.length === 0) return false;

  if (navigator.share && navigator.canShare) {
    try {
      const files: File[] = completed.slice(0, 10).map((item) => {
        const name = item.name.replace(/\.[^/.]+$/, '') + '.webp';
        return new File([item.convertedBlob!], name, { type: 'image/webp' });
      });

      if (navigator.canShare({ files })) {
        await navigator.share({
          files,
          title: 'AutoWebP Pro Converted Images',
          text: `Berikut adalah fail WebP yang telah dioptimumkan menggunakan AutoWebP Pro.`,
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
