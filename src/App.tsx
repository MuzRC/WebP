import { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Dropzone } from './components/Dropzone';
import { GuideModal } from './components/GuideModal';
import { Language } from './types';
import { getTranslation } from './i18n/translations';
import { sliceSpriteSheet, SlicedSprite } from './services/spriteCutter';
import { playCompletionSound } from './services/notificationService';
import { Download, Sparkles, CheckCircle2, RefreshCw, Layers, Edit3, FileText } from 'lucide-react';
import JSZip from 'jszip';

export default function App() {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('autowebp_lang');
    return saved === 'en' || saved === 'ms' ? saved : 'ms';
  });

  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [slicedSprites, setSlicedSprites] = useState<SlicedSprite[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>('');
  
  // Kotak teks untuk 9 nama pukal
  const [batchNamesText, setBatchNamesText] = useState<string>('');

  useEffect(() => {
    localStorage.setItem('autowebp_lang', lang);
  }, [lang]);

  const t = getTranslation(lang);

  // Fungsi muat turun fail ZIP
  const downloadZip = useCallback(async (sprites: SlicedSprite[]) => {
    if (sprites.length === 0) return;
    try {
      const zip = new JSZip();
      sprites.forEach((item) => {
        zip.file(item.name, item.blob);
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `sprites_kenderaan_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Ralat menjana fail ZIP:', err);
    }
  }, []);

  // Pengendali muat naik dan pemprosesan
  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      if (files.length === 0 || isProcessing) return;

      const targetFile = files[0];
      setIsProcessing(true);
      setStatusMessage('Memadam latar belakang putih & memotong grid 3x3...');

      // Pecahkan nama daripada teks pukal mengikut baris atau koma
      const customNames = batchNamesText
        .split(/[\n,]/)
        .map((s) => s.trim().toLowerCase().replace(/\s+/g, '_'))
        .filter(Boolean);

      try {
        const results = await sliceSpriteSheet(targetFile, {
          rows: 3,
          cols: 3,
          threshold: 240,
          quality: 0.9,
          baseName: 'kenderaan',
          customNames: customNames.length > 0 ? customNames : undefined,
        });

        setSlicedSprites(results);
        setStatusMessage('Selesai! 9 kenderaan berjaya dipotong dan ditukar ke WebP.');
        playCompletionSound();

        await downloadZip(results);
      } catch (err: unknown) {
        console.error('Gagal memproses sprite sheet:', err);
        setStatusMessage('Ralat semasa memproses imej.');
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, batchNamesText, downloadZip]
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
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
              <Layers className="w-7 h-7 text-blue-600 dark:text-blue-400" />
              <span>Pemotong Sprite & Penukar WebP Auto</span>
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Buang latar putih, potong 9 kenderaan secara auto, dan namakan fail ikut format game anda.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-900 w-fit">
            <Sparkles className="w-4 h-4" />
            <span>Auto Batch Rename Sedia</span>
          </div>
        </div>

        {/* Bahagian Input Batch Rename (Pilihan Pukal) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" />
              <span>Senarai 9 Nama Fail Pukal (Pilihan - 1 nama setiap baris mengikut susunan grid):</span>
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
            rows={3}
            placeholder={'kancil_660\nmyvi_king\nsaga_vvt\naxia_av\nbezza_av\niriz_active\nysuku_y15zr\nkriss_110\nadv_160'}
            className="w-full text-xs font-mono p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Dropzone */}
        <Dropzone onFilesSelected={handleFilesSelected} lang={lang} />

        {isProcessing && (
          <div className="flex items-center justify-center gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span className="text-sm font-semibold">{statusMessage}</span>
          </div>
        )}

        {/* Hasil Keratan & Paparan Rename Interaktif */}
        {slicedSprites.length > 0 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  9 Sprite WebP Siap (Boleh Ubah Nama Terus Pada Kotak)
                </h2>
              </div>
              <div className="flex items-center gap-2">
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

            {/* Grid 3x3 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              {slicedSprites.map((sprite, idx) => (
                <div
                  key={idx}
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs"
                >
                  {/* Kanvas telus berpetak */}
                  <div className="w-full h-28 flex items-center justify-center overflow-hidden rounded-lg bg-[linear-gradient(45deg,#f0f0f0_25%,transparent_25%),linear-gradient(-45deg,#f0f0f0_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f0f0f0_75%),linear-gradient(-45deg,transparent_75%,#f0f0f0_75%)] dark:bg-[linear-gradient(45deg,#1e293b_25%,transparent_25%),linear-gradient(-45deg,#1e293b_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#1e293b_75%),linear-gradient(-45deg,transparent_75%,#1e293b_75%)] bg-[size:14px_14px]">
                    <img
                      src={sprite.dataUrl}
                      alt={sprite.name}
                      className="max-h-24 max-w-full object-contain filter drop-shadow-sm"
                    />
                  </div>

                  {/* Input Kotak Rename Individu */}
                  <div className="w-full mt-2.5 relative">
                    <input
                      type="text"
                      value={sprite.name.replace(/\.webp$/, '')}
                      onChange={(e) => handleSingleRename(idx, e.target.value)}
                      title="Klik untuk ubah nama fail"
                      className="w-full text-xs font-mono font-bold text-center px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <Edit3 className="w-3 h-3 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
                  </div>

                  <span className="text-[10px] text-slate-400 mt-1">
                    {sprite.width} × {sprite.height} px
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="w-full border-t border-slate-200 dark:border-slate-800 py-4 mt-8 bg-white dark:bg-slate-950 text-center text-xs text-slate-400">
        AutoWebP Pro · Sprite Cutter & Smart Batch Renamer
      </footer>

      <GuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        lang={lang}
      />
    </div>
  );
}
