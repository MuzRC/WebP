export interface SliceOptions {
  rows?: number;
  cols?: number;
  threshold?: number;
  quality?: number;
  baseName?: string;
  customNames?: string[];
}

export interface SlicedSprite {
  name: string;
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
}

// 1. Buang latar belakang putih secara pintar guna algoritma Flood Fill (hanya buang putih luar, lindungi kereta putih)
export function removeBackground(canvas: HTMLCanvasElement, threshold = 240): HTMLCanvasElement {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const { width, height } = canvas;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Queue untuk carian BFS (Breadth-First Search)
  const queue: [number, number][] = [];
  const visited = new Uint8Array(width * height);

  // Semak sama ada piksel hampir putih
  const isBackgroundWhite = (r: number, g: number, b: number) => {
    return r >= threshold && g >= threshold && b >= threshold;
  };

  // Masukkan piksel yang sah dari sempadan luar ke dalam queue
  const pushIfBorderWhite = (x: number, y: number) => {
    const idx = y * width + x;
    if (visited[idx]) return;
    visited[idx] = 1;
    const pIdx = idx * 4;
    if (isBackgroundWhite(data[pIdx], data[pIdx + 1], data[pIdx + 2])) {
      queue.push([x, y]);
    }
  };

  // 1. Tandakan semua bucu sekeliling kanvas (Atas, Bawah, Kiri, Kanan) sebagai 'seeding start'
  for (let x = 0; x < width; x++) {
    pushIfBorderWhite(x, 0); // baris atas
    pushIfBorderWhite(x, height - 1); // baris bawah
  }
  for (let y = 0; y < height; y++) {
    pushIfBorderWhite(0, y); // lajur kiri
    pushIfBorderWhite(width - 1, y); // lajur kanan
  }

  // 2. BFS Flood Fill: Banjiri dan padam hanya kawasan putih yang bersambung dari luar
  while (queue.length > 0) {
    const [cx, cy] = queue.shift()!;
    const idx = cy * width + cx;
    const pIdx = idx * 4;

    // Tukar piksel luar yang bersambung kepada telus (Alpha = 0)
    data[pIdx + 3] = 0;

    // Periksa 4 arah jiran (Atas, Bawah, Kiri, Kanan)
    const neighbors = [
      [cx + 1, cy],
      [cx - 1, cy],
      [cx, cy + 1],
      [cx, cy - 1]
    ];

    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nIdx = ny * width + nx;
        if (!visited[nIdx]) {
          visited[nIdx] = 1;
          const npIdx = nIdx * 4;
          // Hanya teruskan banjiran jika ia adalah warna putih latar belakang
          if (isBackgroundWhite(data[npIdx], data[npIdx + 1], data[npIdx + 2])) {
            queue.push([nx, ny]);
          }
        }
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

// 3. Hiris imej grid dan hasilkan senarai WebP Blob mengikut nama kustom
export async function sliceSpriteSheet(imageFile: File, options: SliceOptions = {}): Promise<SlicedSprite[]> {
  const {
    rows = 3,
    cols = 3,
    threshold = 240,
    quality = 0.9,
    baseName = 'kenderaan',
    customNames = []
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

          // Tentukan sama ada guna nama dari senarai custom atau nombor siri
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

    img.onerror = reject;
    img.src = URL.createObjectURL(imageFile);
  });
}
