import { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Dropzone } from './components/Dropzone';
import { GuideModal } from './components/GuideModal';
import { Language } from './types';
import { getTranslation } from './i18n/translations';
import { sliceSpriteSheet, SlicedSprite } from './services/spriteCutter';
import { playCompletionSound } from './services/notificationService';
import { Download, Sparkles, CheckCircle2, RefreshCw, Layers } from 'lucide-react';
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

  useEffect(() => {
    localStorage.setItem('autowebp_lang', lang);
  }, [lang]);

  const t = getTranslation(lang);

  // Fungsi muat turun ZIP secara automatik
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

  // Terima fail dari Dropzone dan terus potong auto
  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      if (files.length === 0 || isProcessing) return;

      const targetFile = files[0]; // Ambil imej sprite sheet grid
      setIsProcessing(true);
      setStatusMessage('Memadam latar belakang putih & memotong grid 3x3...');

      try {
        const results = await sliceSpriteSheet(targetFile, {
          rows: 3,
          cols: 3,
          threshold: 240, // Sensitiviti warna putih
          quality: 0.9,
          baseName: 'kenderaan',
        });

        setSlicedSprites(results);
        setStatusMessage(`Selesai! 9 kenderaan berjaya dipotong dan ditukar ke WebP telus.`);
        playCompletionSound();

        // Muat turun automatik terus ke komputer
        await downloadZip(results);
      } catch (err: unknown) {
        console.error('Gagal memproses sprite sheet:', err);
        setStatusMessage('Ralat semasa memproses imej. Pastikan format imej disokong.');
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, downloadZip]
  );

  const handleReset = () => {
    setSlicedSprites([]);
    setStatusMessage('');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-blue-500 selection:text-white">
      {/* Top Navbar ringkas tanpa pertukaran tab */}
      <Navbar
        currentTab="converter"
        onSelectTab={() => {}}
        lang={lang}
        onToggleLang={() => setLang(lang === 'ms' ? 'en' : 'ms')}
        onOpenGuide={() => setIsGuideModalOpen(true)}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Tajuk Utama */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
              <Layers className="w-7 h-7 text-blue-600 dark:text-blue-400" />
              <span>Pemotong Sprite & Penukar WebP Auto</span>
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Lepas gambar grid di bawah — sistem automatik buang latar putih, hiris 3x3, dan muat turun ZIP WebP telus.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-900 w-fit">
            <Sparkles className="w-4 h-4" />
            <span>100% Pemprosesan Tempatan (Browser Offline)</span>
          </div>
        </div>

        {/* Dropzone Utama */}
        <Dropzone onFilesSelected={handleFilesSelected} lang={lang} />

        {/* Status Memproses */}
        {isProcessing && (
          <div className="flex items-center justify-center gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span className="text-sm font-semibold">{statusMessage}</span>
          </div>
        )}

        {/* Paparan Hasil Keratan Grid (Jika Siap) */}
        {slicedSprites.length > 0 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Hasil 9 Kenderaan WebP (Latar Belakang Telus)
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadZip(slicedSprites)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Muat Turun Semula ZIP</span>
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer transition-colors"
                >
                  Padam Paparan
                </button>
              </div>
            </div>

            {/* Grid 3x3 Paparan Sprite dengan Latar Berkotak Lutsinar */}
            <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              {slicedSprites.map((sprite, idx) => (
                <div
                  key={idx}
                  className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-200/50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-800 text-center"
                >
                  <div className="w-full h-28 flex items-center justify-center overflow-hidden rounded bg-[linear-gradient(45deg,#f0f0f0_25%,transparent_25%),linear-gradient(-45deg,#f0f0f0_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f0f0f0_75%),linear-gradient(-45deg,transparent_75%,#f0f0f0_75%)] dark:bg-[linear-gradient(45deg,#1e293b_25%,transparent_25%),linear-gradient(-45deg,#1e293b_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#1e293b_75%),linear-gradient(-45deg,transparent_75%,#1e293b_75%)] bg-[size:16px_16px]">
                    <img
                      src={sprite.dataUrl}
                      alt={sprite.name}
                      className="max-h-24 max-w-full object-contain filter drop-shadow-sm"
                    />
                  </div>
                  <span className="text-xs font-mono font-medium text-slate-600 dark:text-slate-400 mt-2 truncate w-full">
                    {sprite.name}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {sprite.width} × {sprite.height} px
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer Ringkas */}
      <footer className="w-full border-t border-slate-200 dark:border-slate-800 py-4 mt-8 bg-white dark:bg-slate-950">
        <div className="max-w-5xl mx-auto px-4 text-center text-xs text-slate-400">
          AutoWebP Pro · Pemotong Grid Sprite Automatik (Offline)
        </div>
      </footer>

      {/* Guide Modal */}
      <GuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        lang={lang}
      />
    </div>
  );
}
