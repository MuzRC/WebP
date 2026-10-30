import { ConversionSettings, ResizeMode } from '../types';

export interface ConvertResult {
  blob: Blob;
  url: string;
  width: number;
  height: number;
  size: number;
  fileName: string;
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function calculateOutputDimensions(
  origW: number,
  origH: number,
  mode: ResizeMode,
  customW: number,
  customH: number,
  maintainAspect: boolean
): { width: number; height: number } {
  if (origW <= 0 || origH <= 0) {
    return { width: Math.max(1, origW), height: Math.max(1, origH) };
  }

  const aspectRatio = origW / origH;

  switch (mode) {
    case 'none':
      return { width: origW, height: origH };

    case '75%':
      return { width: Math.round(origW * 0.75), height: Math.round(origH * 0.75) };

    case '50%':
      return { width: Math.round(origW * 0.50), height: Math.round(origH * 0.50) };

    case '25%':
      return { width: Math.round(origW * 0.25), height: Math.round(origH * 0.25) };

    case '1920w':
      if (origW > 1920) {
        return { width: 1920, height: Math.round(1920 / aspectRatio) };
      }
      return { width: origW, height: origH };

    case '1280w':
      if (origW > 1280) {
        return { width: 1280, height: Math.round(1280 / aspectRatio) };
      }
      return { width: origW, height: origH };

    case '800w':
      if (origW > 800) {
        return { width: 800, height: Math.round(800 / aspectRatio) };
      }
      return { width: origW, height: origH };

    case 'custom':
      if (maintainAspect) {
        if (customW && !customH) {
          return { width: customW, height: Math.round(customW / aspectRatio) };
        } else if (customH && !customW) {
          return { width: Math.round(customH * aspectRatio), height: customH };
        } else if (customW && customH) {
          // Fit within bounding box
          const ratioW = customW / origW;
          const ratioH = customH / origH;
          const ratio = Math.min(ratioW, ratioH);
          return { width: Math.round(origW * ratio), height: Math.round(origH * ratio) };
        }
      }
      return {
        width: customW > 0 ? customW : origW,
        height: customH > 0 ? customH : origH,
      };

    default:
      return { width: origW, height: origH };
  }
}

export function generateOutputFileName(originalName: string, settings: ConversionSettings): string {
  const lastDotIndex = originalName.lastIndexOf('.');
  const baseName = lastDotIndex > 0 ? originalName.substring(0, lastDotIndex) : originalName;

  let finalName = baseName;

  if (settings.fileNaming === 'suffix') {
    const suffix = settings.namingCustomText ? `_${settings.namingCustomText}` : '_min';
    finalName = `${baseName}${suffix}`;
  } else if (settings.fileNaming === 'prefix') {
    const prefix = settings.namingCustomText ? `${settings.namingCustomText}_` : 'webp_';
    finalName = `${prefix}${baseName}`;
  }

  return `${finalName}.webp`;
}

export async function getImageMetadata(file: File): Promise<{ width: number; height: number; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      resolve({
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        previewUrl: objectUrl,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Gagal membaca imej: ${file.name}`));
    };

    img.src = objectUrl;
  });
}

export async function convertImageToWebP(
  file: File,
  settings: ConversionSettings,
  onProgress?: (pct: number) => void
): Promise<ConvertResult> {
  onProgress?.(20);

  // Read file into image element
  const objectUrl = URL.createObjectURL(file);
  const img = new Image();

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Gagal memuat imej: ${file.name}`));
    };
    img.src = objectUrl;
  });

  onProgress?.(50);

  const origWidth = img.naturalWidth || img.width;
  const origHeight = img.naturalHeight || img.height;

  const targetDim = calculateOutputDimensions(
    origWidth,
    origHeight,
    settings.resizeMode,
    settings.customWidth,
    settings.customHeight,
    settings.maintainAspectRatio
  );

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, targetDim.width);
  canvas.height = Math.max(1, targetDim.height);

  const ctx = canvas.getContext('2d', { willReadFrequently: false });
  if (!ctx) {
    URL.revokeObjectURL(objectUrl);
    throw new Error('Canvas 2D context tidak disokong pada pelayar ini.');
  }

  // Set high quality smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Draw image to canvas
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  onProgress?.(75);

  // Convert to WebP blob
  const qualityNormalized = Math.min(Math.max(settings.quality / 100, 0.05), 1.0);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) {
          resolve(b);
        } else {
          reject(new Error('Gagal menghasilkan fail WebP blob.'));
        }
      },
      'image/webp',
      qualityNormalized
    );
  });

  // Clean up original image URL
  URL.revokeObjectURL(objectUrl);

  const convertedUrl = URL.createObjectURL(blob);
  const fileName = generateOutputFileName(file.name, settings);

  onProgress?.(100);

  return {
    blob,
    url: convertedUrl,
    width: canvas.width,
    height: canvas.height,
    size: blob.size,
    fileName,
  };
}

// Generate realistic synthetic sample images for instant demo testing
export async function createSampleImage(type: 'landscape' | 'product' | 'graphic'): Promise<File> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  if (type === 'landscape') {
    canvas.width = 1600;
    canvas.height = 1000;
    // Gradient sky
    const sky = ctx.createLinearGradient(0, 0, 0, 600);
    sky.addColorStop(0, '#0284c7');
    sky.addColorStop(0.6, '#38bdf8');
    sky.addColorStop(1, '#fed7aa');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 1600, 1000);

    // Sun
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(800, 400, 120, 0, Math.PI * 2);
    ctx.fill();

    // Mountains
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(0, 1000);
    ctx.lineTo(400, 450);
    ctx.lineTo(850, 1000);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(600, 1000);
    ctx.lineTo(1100, 520);
    ctx.lineTo(1600, 1000);
    ctx.closePath();
    ctx.fill();

    // Foreground lake
    const water = ctx.createLinearGradient(0, 750, 0, 1000);
    water.addColorStop(0, '#0369a1');
    water.addColorStop(1, '#0c4a6e');
    ctx.fillStyle = water;
    ctx.fillRect(0, 750, 1600, 250);
  } else if (type === 'product') {
    canvas.width = 1200;
    canvas.height = 1200;
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, 1200, 1200);

    // Product shadow
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.beginPath();
    ctx.ellipse(600, 850, 320, 50, 0, 0, Math.PI * 2);
    ctx.fill();

    // Modern ceramic vase product render
    const vaseGrad = ctx.createLinearGradient(400, 300, 800, 800);
    vaseGrad.addColorStop(0, '#e2e8f0');
    vaseGrad.addColorStop(0.5, '#94a3b8');
    vaseGrad.addColorStop(1, '#475569');
    ctx.fillStyle = vaseGrad;

    ctx.beginPath();
    ctx.moveTo(500, 300);
    ctx.bezierCurveTo(450, 500, 350, 700, 450, 820);
    ctx.lineTo(750, 820);
    ctx.bezierCurveTo(850, 700, 750, 500, 700, 300);
    ctx.closePath();
    ctx.fill();
  } else {
    canvas.width = 1000;
    canvas.height = 800;
    const grad = ctx.createLinearGradient(0, 0, 1000, 800);
    grad.addColorStop(0, '#4f46e5');
    grad.addColorStop(0.5, '#7c3aed');
    grad.addColorStop(1, '#db2777');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1000, 800);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 56px Plus Jakarta Sans, sans-serif';
    ctx.fillText('AutoWebP Pro Test Asset', 160, 380);
    ctx.font = '32px DM Sans, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText('High Quality Batch Compression Demo', 200, 450);
  }

  const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'));
  const fileNames = {
    landscape: 'sample-pemandangan-alam.png',
    product: 'sample-produk-seramik.png',
    graphic: 'sample-banner-grafik.png',
  };
  return new File([blob], fileNames[type], { type: 'image/png' });
}
