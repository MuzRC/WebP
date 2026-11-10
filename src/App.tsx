/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Dropzone } from './components/Dropzone';
import { GuideModal } from './components/GuideModal';
import { ExportModal } from './components/ExportModal';
import { Language, ImageItem } from './types';
import { getTranslation } from './i18n/translations';
import { sliceSpriteSheet, SlicedSprite } from './services/spriteCutter';
import { playCompletionSound } from './services/notificationService';
import { downloadAndroidIconsZip } from './services/exportService';
import { 
  Download, 
  Sparkles, 
  CheckCircle2, 
  RefreshCw, 
  Layers, 
  Edit3, 
  FileText, 
  Users, 
  Car,
  Smartphone,
  FolderArchive,
  ExternalLink
} from 'lucide-react';
import JSZip from 'jszip';

// Pilihan Mod Aplikasi
type AppMode = 'avatar48' | 'vehicle9' | 'iconApk';

// Senarai nama lalai mengikut mod
const DEFAULT_AVATAR_NAMES = Array.from({ length: 48 }, (_, i) => 
  `student_boy_${String(i + 1).padStart(2, '0')}`
).join('\n');

const DEFAULT_VEHICLE_NAMES = [
  'kancil_660', 'myvi_king', 'saga_vvt',
  'axia_av', 'bezza_av', 'iriz_active',
  'ysuku_y15zr', 'kriss_110', 'adv_160'
].join('\n');

export default function App() {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('autowebp_lang');
    return saved === 'en' || saved === 'ms' ? saved : 'ms';
  });

  // Pilihan Mod: 'avatar48' | 'vehicle9' | 'iconApk'
  const [gridMode, setGridMode] = useState<AppMode>('avatar48');

  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [slicedSprites, setSlicedSprites] = useState<SlicedSprite[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>('');
  
  // Kotak teks senarai nama pukal
  const [batchNamesText, setBatchNamesText] = useState<string>(DEFAULT_AVATAR_NAMES);

  // Simpanan fail dan pratonton untuk mod Ikon APK
  const [lastUploadedIconFile, setLastUploadedIconFile] = useState<File | null>(null);
  const [iconPreviewUrl, setIconPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('autowebp_lang', lang);
  }, [lang]);

  const t = getTranslation(lang);

  // Tukar mod potong / jana ikon
  const handleModeChange = (mode: AppMode) => {
    setGridMode(mode);
    setSlicedSprites([]);
    setStatusMessage('');
    if (mode === 'avatar48') {
      setBatchNamesText(DEFAULT_AVATAR_NAMES);
    } else if (mode === 'vehicle9') {
      setBatchNamesText(DEFAULT_VEHICLE_NAMES);
    }
  };

  // Muat turun fail ZIP untuk mod sprite (Avatar & Kenderaan)
  const downloadZip = useCallback(async (sprites: SlicedSprite[]) => {
    if (sprites.length === 0) return;
    try {
      const zip = new JSZip();
      const folderName = gridMode === 'avatar48' ? 'AutoWebP_Avatars' : 'AutoWebP_Kenderaan';
      const folder = zip.folder(folderName) || zip;

      sprites.forEach((item) => {
        folder.file(item.name, item.blob);
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;

      const prefix = gridMode === 'avatar48' ? 'avatars_pelajar_48' : 'sprites_kenderaan_9';
      link.download = `${prefix}_${Date.now()}.zip`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Ralat menjana fail ZIP:', err);
    }
  }, [gridMode]);

  // Pengendali muat naik fail
  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      if (files.length === 0 || isProcessing) return;

      const targetFile = files[0];
      setIsProcessing(true);

      // ==========================================================
      // KES 1: MOD IKON APK ANDROID (Auto-Res & Folder res/ & icon.png)
      // ==========================================================
      if (gridMode === 'iconApk') {
        setStatusMessage('Menjana pakej ikon APK (icon.png & folder res/mipmap)...');
        setLastUploadedIconFile(targetFile);

        if (iconPreviewUrl) {
          URL.revokeObjectURL(iconPreviewUrl);
        }
        const preview = URL.createObjectURL(targetFile);
        setIconPreviewUrl(preview);

        try {
          await downloadAndroidIconsZip(targetFile);
          setStatusMessage('Selesai! Fail android_mipmap_icons.zip berjaya dimuat turun.');
          playCompletionSound();
        } catch (err) {
          console.error('Ralat menjana pakej ikon APK:', err);
          setStatusMessage('Ralat semasa menjana ikon APK. Sila pastikan imej sah.');
        } finally {
          setIsProcessing(false);
        }
        return;
      }

      // ==========================================================
      // KES 2: MOD SPRITE SHEET (Avatar 48 atau Kenderaan 9)
      // ==========================================================
      const isAvatar = gridMode === 'avatar48';
      const rows = isAvatar ? 6 : 3;
      const cols = isAvatar ? 8 : 3;
      const totalItems = rows * cols;
      const baseName = isAvatar ? 'student_boy' : 'kenderaan';

      setStatusMessage(`Memadam latar putih & memotong grid ${cols}x${rows} (${totalItems} imej)...`);

      const customNames = batchNamesText
        .split(/[\n,]/)
        .map((s) => s.trim().toLowerCase().replace(/\s+/g, '_'))
        .filter(Boolean);

      try {
        const results = await sliceSpriteSheet(targetFile, {
          rows,
          cols,
          threshold: 240,
          quality: 0.9,
          baseName,
          customNames: customNames.length > 0 ? customNames : undefined,
        });

        setSlicedSprites(results);
        setStatusMessage(`Selesai! ${results.length} imej WebP berjaya dipotong dan sedia dimuat turun.`);
        playCompletionSound();

        await downloadZip(results);
      } catch (err: unknown) {
        console.error('Gagal memproses sprite sheet:', err);
        setStatusMessage('Ralat semasa memproses imej. Pastikan fail adalah imej sah.');
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, batchNamesText, gridMode, downloadZip, iconPreviewUrl]
  );

  // Ubah nama satu demi satu secara manual
  const handleSingleRename = (index: number, newName: string) => {
    const formatted = newName.trim().toLowerCase().replace(/\s+/g, '_');
    const finalName = formatted.endsWith('.webp') ? formatted : `${formatted}.webp`;

    setSlicedSprites((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, name: finalName } : item))
    );
  };

  // Terapkan senarai teks pukal kepada gambar yang sudah dipotong
  const applyBatchNamesToCurrent = () => {
    const names = batchNamesText
      .split(/[\n,]/)
      .map((s) => s.trim().toLowerCase().replace(/\s+/g, '_'))
      .filter(Boolean);

    if (names.length === 0) return;

    setSlicedSprites((prev) =>
      prev.map((item, idx) => {
        if (names[idx]) {
          const finalName = names[idx].endsWith('.webp') ? names[idx] : `${names[idx]}.webp`;
          return { ...item, name: finalName };
        }
        return item;
      })
    );
  };

  // Ubah SlicedSprite atau fail ikon menjadi format ImageItem untuk ExportModal
  const exportItems: ImageItem[] = gridMode === 'iconApk' && lastUploadedIconFile
    ? [
        {
          id: 'icon-master',
          file: lastUploadedIconFile,
          name: lastUploadedIconFile.name,
          originalSize: lastUploadedIconFile.size,
          originalWidth: 1024,
          originalHeight: 1024,
          originalFormat: 'png',
          originalPreviewUrl: iconPreviewUrl || '',
          convertedBlob: lastUploadedIconFile,
          convertedUrl: iconPreviewUrl,
          convertedSize: lastUploadedIconFile.size,
          convertedWidth: 1024,
          convertedHeight: 1024,
          status: 'completed',
          progress: 100,
          timestamp: Date.now(),
        },
      ]
    : slicedSprites.map((s, idx) => ({
        id: String(idx),
        file: new File([s.blob], s.name, { type: 'image/webp' }),
        name: s.name,
        originalSize: s.blob.size,
        originalWidth: s.width,
        originalHeight: s.height,
        originalFormat: 'webp',
        originalPreviewUrl: s.dataUrl,
        convertedBlob: s.blob,
        convertedUrl: s.dataUrl,
        convertedSize: s.blob.size,
        convertedWidth: s.width,
        convertedHeight: s.height,
        status: 'completed',
        progress: 100,
        timestamp: Date.now(),
      }));

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      <Navbar
        currentTab="converter"
        onSelectTab={() => {}}
        lang={lang}
        onToggleLang={() => setLang(lang === 'ms' ? 'en' : 'ms')}
        onOpenGuide={() => setIsGuideModalOpen(true)}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header Utama & Pilihan Mod Suis */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
              <Layers className="w-7 h-7 text-blue-600 dark:text-blue-400" />
              <span>Pemotong Sprite & Ikon APK Auto</span>
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {gridMode === 'avatar48' && 'Potong lembaran 48 avatar pelajar (8 lajur × 6 baris) secara auto ke format WebP.'}
              {gridMode === 'vehicle9' && 'Buang latar putih, potong 9 kenderaan secara auto, dan namakan fail ikut format game anda.'}
              {gridMode === 'iconApk' && 'Jana pakej ikon APK Android (icon.png 1024px & susunan folder res/mipmap) sekali klik.'}
            </p>
          </div>

          {/* 3 Butang Suis Mod */}
          <div className="flex items-center gap-1.5 bg-slate-200/70 dark:bg-slate-900 p-1 rounded-2xl border border-slate-300 dark:border-slate-800">
            <button
              type="button"
              onClick={() => handleModeChange('avatar48')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                gridMode === 'avatar48'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Avatar 48</span>
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('vehicle9')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                gridMode === 'vehicle9'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>Kenderaan 9</span>
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('iconApk')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                gridMode === 'iconApk'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Ikon APK</span>
            </button>
          </div>
        </div>

        {/* Bahagian Input Nama Pukal (Hanya untuk Sprite Avatar/Kenderaan) */}
        {gridMode !== 'iconApk' ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                <span>
                  Senarai {gridMode === 'avatar48' ? '48' : '9'} Nama Fail Pukal (1 baris setiap petak):
                </span>
              </label>
              {slicedSprites.length > 0 && (
                <button
                  type="button"
                  onClick={applyBatchNamesToCurrent}
                  className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                >
                  Kemas Kini Nama Gambar di Bawah
                </button>
              )}
            </div>
            <textarea
              value={batchNamesText}
              onChange={(e) => setBatchNamesText(e.target.value)}
              rows={gridMode === 'avatar48' ? 6 : 3}
              placeholder="Masukkan senarai nama fail baris demi baris..."
              className="w-full text-xs font-mono p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
            />
          </div>
        ) : (
          /* Info Kotak Penjelasan Struktur Folder Android */
          <div className="bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-indigo-900 dark:text-indigo-200">
            <div className="space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300">
                <FolderArchive className="w-4 h-4" />
                <span>Struktur Automatik Binaan APK (Sedia Diekstrak):</span>
              </span>
              <p className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                android_mipmap_icons/ ➔ <b>icon.png</b> (1024px) + <b>res/</b> (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)
              </p>
            </div>
            {lastUploadedIconFile && (
              <button
                type="button"
                onClick={() => setIsExportModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs cursor-pointer transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Pilihan Eksport</span>
              </button>
            )}
          </div>
        )}

        {/* Dropzone */}
        <Dropzone onFilesSelected={handleFilesSelected} lang={lang} />

        {isProcessing && (
          <div className="flex items-center justify-center gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span className="text-sm font-semibold">{statusMessage}</span>
          </div>
        )}

        {/* Paparan Pratonton Mod Ikon APK */}
        {gridMode === 'iconApk' && iconPreviewUrl && !isProcessing && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Pakej Ikon APK Sedia Digunakan
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => lastUploadedIconFile && downloadAndroidIconsZip(lastUploadedIconFile)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Muat Turun Semula ZIP Ikon</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {/* Petak Standard */}
              <div className="flex flex-col items-center p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-500 mb-3">ic_launcher (Square)</span>
                <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-md border border-slate-200 dark:border-slate-700">
                  <img src={iconPreviewUrl} alt="Square Icon" className="w-full h-full object-cover" />
                </div>
                <span className="text-[11px] font-mono text-slate-400 mt-2">192×192 / 144×144</span>
              </div>

              {/* Bulat Round Launcher */}
              <div className="flex flex-col items-center p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-500 mb-3">ic_launcher_round (Bulat)</span>
                <div className="w-24 h-24 rounded-full overflow-hidden shadow-md border border-slate-200 dark:border-slate-700">
                  <img src={iconPreviewUrl} alt="Round Icon" className="w-full h-full object-cover" />
                </div>
                <span className="text-[11px] font-mono text-slate-400 mt-2">Bulat Automatik</span>
              </div>

              {/* Master Root Icon */}
              <div className="flex flex-col items-center p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 sm:col-span-2 md:col-span-1">
                <span className="text-xs font-semibold text-slate-500 mb-3">icon.png (Root Master)</span>
                <div className="w-24 h-24 rounded-xl overflow-hidden shadow-md border border-slate-200 dark:border-slate-700">
                  <img src={iconPreviewUrl} alt="Master Icon" className="w-full h-full object-cover" />
                </div>
                <span className="text-[11px] font-mono text-slate-400 mt-2">1024×1024 px</span>
              </div>
            </div>
          </div>
        )}

        {/* Paparan Sprite Siap Potong (Avatar & Kenderaan) */}
        {gridMode !== 'iconApk' && slicedSprites.length > 0 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {slicedSprites.length} Sprite WebP Siap Dipotong
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Pilihan Storan</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadZip(slicedSprites)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Muat Turun ZIP Terkini</span>
                </button>
              </div>
            </div>

            {/* Grid Paparan Dinamik */}
            <div className={`p-4 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 grid ${
              gridMode === 'avatar48' 
                ? 'grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5' 
                : 'grid-cols-1 sm:grid-cols-3 gap-4'
            }`}>
              {slicedSprites.map((sprite, idx) => (
                <div
                  key={idx}
                  className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs group"
                >
                  <div className={`w-full flex items-center justify-center overflow-hidden rounded-lg bg-[linear-gradient(45deg,#f0f0f0_25%,transparent_25%),linear-gradient(-45deg,#f0f0f0_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f0f0f0_75%),linear-gradient(-45deg,transparent_75%,#f0f0f0_75%)] dark:bg-[linear-gradient(45deg,#1e293b_25%,transparent_25%),linear-gradient(-45deg,#1e293b_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#1e293b_75%),linear-gradient(-45deg,transparent_75%,#1e293b_75%)] bg-[size:12px_12px] ${
                    gridMode === 'avatar48' ? 'h-20' : 'h-28'
                  }`}>
                    <img
                      src={sprite.dataUrl}
                      alt={sprite.name}
                      className="max-h-full max-w-full object-contain filter drop-shadow-sm"
                    />
                  </div>

                  <div className="w-full mt-2 relative">
                    <input
                      type="text"
                      value={sprite.name.replace(/\.webp$/, '')}
                      onChange={(e) => handleSingleRename(idx, e.target.value)}
                      title="Klik untuk ubah nama fail"
                      className="w-full text-[11px] font-mono font-bold text-center px-1.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-blue-500 focus:outline-none truncate"
                    />
                    <Edit3 className="w-2.5 h-2.5 text-slate-400 absolute right-1.5 top-2 pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity" />
                  </div>

                  <span className="text-[9px] text-slate-400 mt-1 font-mono">
                    {sprite.width}×{sprite.height}px
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="w-full border-t border-slate-200 dark:border-slate-800 py-4 mt-8 bg-white dark:bg-slate-950 text-center text-xs text-slate-400">
        AutoWebP Pro · Sprite Cutter, Auto Renamer & APK Icon Generator
      </footer>

      {/* Modal Panduan & Modal Eksport */}
      <GuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        lang={lang}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        items={exportItems}
        lang={lang}
      />
    </div>
  );
}