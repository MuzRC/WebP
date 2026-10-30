export interface SliceOptions {
  rows?: number;
  cols?: number;
  threshold?: number;
  quality?: number;
  baseName?: string;
}

export interface SlicedSprite {
  name: string;
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
}

// 1. Buang latar belakang putih
export function removeBackground(canvas: HTMLCanvasElement, threshold = 240): HTMLCanvasElement {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    if (r >= threshold && g >= threshold && b >= threshold) {
      data[i + 3] = 0; // Jadikan piksel telus
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

// 3. Hiris imej grid dan hasilkan senarai WebP Blob
export async function sliceSpriteSheet(imageFile: File, options: SliceOptions = {}): Promise<SlicedSprite[]> {
  const {
    rows = 3,
    cols = 3,
    threshold = 240,
    quality = 0.9,
    baseName = 'kenderaan'
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = async () => {
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

          const finalCanvas = trimCanvas(cellCanvas, 8);

          const blob = await new Promise<Blob | null>(res => {
            finalCanvas.toBlob(res, 'image/webp', quality);
          });

          if (blob) {
            results.push({
              name: `${baseName}_${index}.webp`,
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

    img.onerror = reject;
    img.src = URL.createObjectURL(imageFile);
  });
}
