import { AndroidIconFile, SliceOptions, SlicedSprite } from '../types';

// Eksport semula types sekiranya ada komponen lama yang masih import dari fail ini
export type { AndroidIconFile, SliceOptions, SlicedSprite };

// 1. Buang latar belakang putih pintar & pantas (O(1) BFS Queue elak browser lag)
export function removeBackground(canvas: HTMLCanvasElement, threshold = 240): HTMLCanvasElement {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const { width, height } = canvas;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const totalPixels = width * height;

  const visited = new Uint8Array(totalPixels);
  const queue = new Int32Array(totalPixels);
  let head = 0;
  let tail = 0;

  const isBackgroundWhite = (pIdx: number) => {
    return (
      data[pIdx] >= threshold &&
      data[pIdx + 1] >= threshold &&
      data[pIdx + 2] >= threshold
    );
  };

  const pushIfBorderWhite = (x: number, y: number) => {
    const idx = y * width + x;
    if (visited[idx]) return;
    visited[idx] = 1;
    if (isBackgroundWhite(idx * 4)) {
      queue[tail++] = idx;
    }
  };

  // Seeding dari 4 sempadan luar kanvas
  for (let x = 0; x < width; x++) {
    pushIfBorderWhite(x, 0);
    pushIfBorderWhite(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    pushIfBorderWhite(0, y);
    pushIfBorderWhite(width - 1, y);
  }

  // BFS Flood Fill tanpa overhead memory
  while (head < tail) {
    const idx = queue[head++];
    const pIdx = idx * 4;
    data[pIdx + 3] = 0; // Set Alpha = 0 (Transparent)

    const cx = idx % width;
    const cy = Math.floor(idx / width);

    if (cx + 1 < width) checkNeighbor(idx + 1);
    if (cx - 1 >= 0) checkNeighbor(idx - 1);
    if (cy + 1 < height) checkNeighbor(idx + width);
    if (cy - 1 >= 0) checkNeighbor(idx - width);
  }

  function checkNeighbor(nIdx: number) {
    if (!visited[nIdx]) {
      visited[nIdx] = 1;
      if (isBackgroundWhite(nIdx * 4)) {
        queue[tail++] = nIdx;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

// 2. Kemaskan sempadan (auto-trim)
export function trimCanvas(canvas: HTMLCanvasElement, padding = 8): HTMLCanvasElement {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const { width, height } = canvas;
  const imgData = ctx.getImageData(0, 0, width, height).data;

  let minX = width, minY = height, maxX = 0, maxY = 0;
  let found = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = imgData[(y * width + x) * 4 + 3];
      if (alpha > 15) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        found = true;
      }
    }
  }

  if (!found) return canvas;

  const cropX = Math.max(0, minX - padding);
  const cropY = Math.max(0, minY - padding);
  const cropW = Math.min(width - cropX, (maxX - minX) + padding * 2);
  const cropH = Math.min(height - cropY, (maxY - minY) + padding * 2);

  const trimmedCanvas = document.createElement('canvas');
  trimmedCanvas.width = cropW;
  trimmedCanvas.height = cropH;

  const trimmedCtx = trimmedCanvas.getContext('2d');
  trimmedCtx?.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

  return trimmedCanvas;
}

// 3. Hiris imej grid sprite sheet
export async function sliceSpriteSheet(imageFile: File, options: SliceOptions = {}): Promise<SlicedSprite[]> {
  const {
    rows = 3,
    cols = 3,
    threshold = 240,
    quality = 0.9,
    baseName = 'kenderaan',
    customNames = [],
    removeBgPerCell = true
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = async () => {
      URL.revokeObjectURL(img.src);

      const mainCanvas = document.createElement('canvas');
      mainCanvas.width = img.width;
      mainCanvas.height = img.height;
      const mainCtx = mainCanvas.getContext('2d');
      if (!mainCtx) return reject(new Error('Canvas context gagal dicipta'));

      mainCtx.drawImage(img, 0, 0);
      removeBackground(mainCanvas, threshold);

      const cellW = Math.floor(img.width / cols);
      const cellH = Math.floor(img.height / rows);
      const results: SlicedSprite[] = [];

      let index = 1;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cellCanvas = document.createElement('canvas');
          cellCanvas.width = cellW;
          cellCanvas.height = cellH;
          const cellCtx = cellCanvas.getContext('2d');

          cellCtx?.drawImage(
            mainCanvas,
            c * cellW, r * cellH, cellW, cellH,
            0, 0, cellW, cellH
          );

          if (removeBgPerCell) {
            removeBackground(cellCanvas, threshold);
          }

          const finalCanvas = trimCanvas(cellCanvas, 8);

          const blob = await new Promise<Blob | null>(res => {
            finalCanvas.toBlob(res, 'image/webp', quality);
          });

          const rawCustomName = customNames[index - 1]?.trim();
          const cleanName = rawCustomName
            ? (rawCustomName.endsWith('.webp') ? rawCustomName : `${rawCustomName}.webp`)
            : `${baseName}_${index}.webp`;

          if (blob) {
            results.push({
              name: cleanName,
              blob,
              dataUrl: finalCanvas.toDataURL('image/webp', quality),
              width: finalCanvas.width,
              height: finalCanvas.height
            });
          }

          index++;
        }
      }

      resolve(results);
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(img.src);
      reject(err);
    };

    img.src = URL.createObjectURL(imageFile);
  });
}

// 4. Jana semua saiz fail ikon Android mengikut struktur folder APK / Capacitor
export async function generateAndroidIconFiles(
  source: File | HTMLCanvasElement
): Promise<AndroidIconFile[]> {
  let sourceCanvas: HTMLCanvasElement;

  if (source instanceof HTMLCanvasElement) {
    sourceCanvas = source;
  } else {
    sourceCanvas = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        resolve(c);
      };
      img.onerror = (err) => {
        URL.revokeObjectURL(img.src);
        reject(err);
      };
      img.src = URL.createObjectURL(source);
    });
  }

  const renderCanvas = (size: number, isRound = false): Promise<Blob> => {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d');
    if (!ctx) throw new Error('Context canvas gagal dicipta');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (isRound) {
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
    }

    ctx.drawImage(sourceCanvas, 0, 0, size, size);

    return new Promise((res, rej) => {
      c.toBlob((b) => (b ? res(b) : rej(new Error('Gagal jana blob'))), 'image/png', 1.0);
    });
  };

  const files: AndroidIconFile[] = [];

  // A. Master icon.png di root (1024x1024)
  const masterBlob = await renderCanvas(1024, false);
  files.push({ relativePath: 'icon.png', blob: masterBlob });

  // B. Konfigurasi 5 folder density rasmi Android di bawah folder 'res/'
  const densities = [
    { name: 'mipmap-mdpi', icon: 48, fg: 108 },
    { name: 'mipmap-hdpi', icon: 72, fg: 162 },
    { name: 'mipmap-xhdpi', icon: 96, fg: 216 },
    { name: 'mipmap-xxhdpi', icon: 144, fg: 324 },
    { name: 'mipmap-xxxhdpi', icon: 192, fg: 432 },
  ];

  for (const d of densities) {
    // 1. ic_launcher.png (Standard)
    files.push({
      relativePath: `res/${d.name}/ic_launcher.png`,
      blob: await renderCanvas(d.icon, false),
    });

    // 2. ic_launcher_round.png (Bulat)
    files.push({
      relativePath: `res/${d.name}/ic_launcher_round.png`,
      blob: await renderCanvas(d.icon, true),
    });

    // 3. ic_launcher_foreground.png (Adaptive Foreground)
    files.push({
      relativePath: `res/${d.name}/ic_launcher_foreground.png`,
      blob: await renderCanvas(d.fg, false),
    });
  }

  return files;
}
