import { useState, useEffect, useCallback, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { Dropzone } from './components/Dropzone';
import { SettingsBar } from './components/SettingsBar';
import { QueueItem } from './components/QueueItem';
import { CompareModal } from './components/CompareModal';
import { ExportModal } from './components/ExportModal';
import { DashboardView } from './components/DashboardView';
import { GuideModal } from './components/GuideModal';
import { ConversionSettings, HistoryRecord, ImageItem, Language } from './types';
import { getTranslation } from './i18n/translations';
import { getImageMetadata, convertImageToWebP, formatBytes } from './services/imageConverter';
import { playCompletionSound, sendDesktopNotification } from './services/notificationService';
import { loadHistory, saveBatchHistoryRecords } from './services/historyStorage';
import { downloadBatchAsZip } from './services/exportService';
import { Play, Download, Trash2, Cloud, Sparkles, CheckCircle2 } from 'lucide-react';

const DEFAULT_SETTINGS: ConversionSettings = {
  quality: 80,
  resizeMode: 'none',
  customWidth: 1920,
  customHeight: 1080,
  maintainAspectRatio: true,
  fileNaming: 'default',
  namingCustomText: '',
  autoProcessOnUpload: true,
  enableSoundNotification: true,
  enableDesktopNotification: true,
};

export default function App() {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('autowebp_lang');
    return (saved === 'en' || saved === 'ms') ? saved : 'ms';
  });

  const [currentTab, setCurrentTab] = useState<'converter' | 'dashboard'>('converter');
  const [settings, setSettings] = useState<ConversionSettings>(() => {
    try {
      const saved = localStorage.getItem('autowebp_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [items, setItems] = useState<ImageItem[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [activeCompareItem, setActiveCompareItem] = useState<ImageItem | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>(() => loadHistory());

  // Prevent multiple simultaneous batch runs
  const isConvertingRef = useRef(false);
  isConvertingRef.current = isConverting;

  // Persist language & settings changes
  useEffect(() => {
    localStorage.setItem('autowebp_lang', lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('autowebp_settings', JSON.stringify(settings));
  }, [settings]);

  // Register service worker for offline functionality
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'development') {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('Service worker registration note:', err);
      });
    }
  }, []);

  const t = getTranslation(lang);

  const refreshHistory = useCallback(() => {
    setHistoryRecords(loadHistory());
  }, []);

  // Conversion runner for queued items
  const startConversion = useCallback(async (customItems?: ImageItem[]) => {
    if (isConvertingRef.current) return;
    setIsConverting(true);

    const currentQueue = customItems || items;
    const queuedItems = currentQueue.filter((i) => i.status === 'queued' || i.status === 'error');

    if (queuedItems.length === 0) {
      setIsConverting(false);
      return;
    }

    const newHistoryRecords: HistoryRecord[] = [];
    let completedCount = 0;

    for (const item of queuedItems) {
      // Set to converting
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: 'converting', progress: 10 } : i))
      );

      try {
        const result = await convertImageToWebP(item.file, settings, (pct) => {
          setItems((prev) =>
            prev.map((i) => (i.id === item.id ? { ...i, progress: pct } : i))
          );
        });

        const savingsBytes = Math.max(0, item.originalSize - result.size);
        const savingsPercent =
          item.originalSize > 0
            ? Math.max(0, Math.round((savingsBytes / item.originalSize) * 100))
            : 0;

        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  status: 'completed',
                  progress: 100,
                  convertedBlob: result.blob,
                  convertedUrl: result.url,
                  convertedSize: result.size,
                  convertedWidth: result.width,
                  convertedHeight: result.height,
                }
              : i
          )
        );

        completedCount++;

        newHistoryRecords.push({
          id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          originalName: item.name,
          convertedName: result.fileName,
          originalSize: item.originalSize,
          convertedSize: result.size,
          savingsBytes,
          savingsPercent,
          quality: settings.quality,
          originalDimensions: `${item.originalWidth}×${item.originalHeight}`,
          convertedDimensions: `${result.width}×${result.height}`,
          timestamp: Date.now(),
        });
      } catch (err: unknown) {
        console.error('Failed converting item:', item.name, err);
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  status: 'error',
                  progress: 0,
                  error: (err as Error)?.message || 'Ralat penukaran',
                }
              : i
          )
        );
      }
    }

    // Save batch history
    if (newHistoryRecords.length > 0) {
      saveBatchHistoryRecords(newHistoryRecords);
      refreshHistory();
    }

    setIsConverting(false);

    // Audio & Desktop Notification triggers
    if (completedCount > 0) {
      if (settings.enableSoundNotification) {
        playCompletionSound();
      }
      if (settings.enableDesktopNotification) {
        const notificationBody = t.notificationBody.replace('{count}', String(completedCount));
        sendDesktopNotification(t.notificationTitle, notificationBody);
      }
    }
  }, [items, settings, refreshHistory, t]);

  // Handler for files dropped or selected
  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      const newItems: ImageItem[] = [];

      for (const file of files) {
        try {
          const meta = await getImageMetadata(file);
          const ext = file.name.split('.').pop() || 'IMG';
          newItems.push({
            id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            file,
            name: file.name,
            originalSize: file.size,
            originalWidth: meta.width,
            originalHeight: meta.height,
            originalFormat: ext.toUpperCase(),
            originalPreviewUrl: meta.previewUrl,
            convertedBlob: null,
            convertedUrl: null,
            convertedSize: null,
            convertedWidth: null,
            convertedHeight: null,
            status: 'queued',
            progress: 0,
            timestamp: Date.now(),
          });
        } catch (err) {
          console.error('Failed reading file metadata:', file.name, err);
        }
      }

      if (newItems.length > 0) {
        setItems((prev) => {
          const updated = [...prev, ...newItems];
          // Auto process if enabled
          if (settings.autoProcessOnUpload) {
            setTimeout(() => {
              startConversion(updated);
            }, 100);
          }
          return updated;
        });
      }
    },
    [settings.autoProcessOnUpload, startConversion]
  );

  const handleRemoveItem = (id: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target?.originalPreviewUrl) {
        URL.revokeObjectURL(target.originalPreviewUrl);
      }
      if (target?.convertedUrl) {
        URL.revokeObjectURL(target.convertedUrl);
      }
      return prev.filter((i) => i.id !== id);
    });
  };

  const handleClearCompleted = () => {
    setItems((prev) => {
      const remaining: ImageItem[] = [];
      for (const item of prev) {
        if (item.status === 'completed') {
          if (item.originalPreviewUrl) URL.revokeObjectURL(item.originalPreviewUrl);
          if (item.convertedUrl) URL.revokeObjectURL(item.convertedUrl);
        } else {
          remaining.push(item);
        }
      }
      return remaining;
    });
  };

  const handleClearAll = () => {
    for (const item of items) {
      if (item.originalPreviewUrl) URL.revokeObjectURL(item.originalPreviewUrl);
      if (item.convertedUrl) URL.revokeObjectURL(item.convertedUrl);
    }
    setItems([]);
  };

  const handleDownloadAllZip = async () => {
    await downloadBatchAsZip(items);
  };

  // Queue metrics
  const completedItems = items.filter((i) => i.status === 'completed');
  const queuedCount = items.filter((i) => i.status === 'queued').length;
  const totalOriginalBytes = completedItems.reduce((acc, curr) => acc + curr.originalSize, 0);
  const totalConvertedBytes = completedItems.reduce((acc, curr) => acc + (curr.convertedSize || 0), 0);
  const totalSavedBytes = Math.max(0, totalOriginalBytes - totalConvertedBytes);
  const overallSavingsPercent =
    totalOriginalBytes > 0 ? Math.round((totalSavedBytes / totalOriginalBytes) * 100) : 0;
  const progressPercent = items.length > 0 ? Math.round((completedItems.length / items.length) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-blue-500 selection:text-white">
      {/* 3-Zone Navigation Top Bar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        lang={lang}
        onToggleLang={() => setLang(lang === 'ms' ? 'en' : 'ms')}
        onOpenGuide={() => setIsGuideModalOpen(true)}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentTab === 'converter' ? (
          <div className="space-y-6">
            {/* Hero / Value Proposition Strip */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {lang === 'ms' ? 'Penukar Imej WebP Kelompok' : 'Batch WebP Image Converter'}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
                  {t.appTagline}
                </p>
              </div>

              {/* Quick Status Pill */}
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1.5 font-medium text-blue-600 dark:text-blue-400">
                  <Sparkles className="w-4 h-4" />
                  <span>100% Pemprosesan Tempatan (Offline-Ready)</span>
                </span>
              </div>
            </div>

            {/* Upload Dropzone */}
            <Dropzone onFilesSelected={handleFilesSelected} lang={lang} />

            {/* Batch Compression & Resize Settings */}
            <SettingsBar
              settings={settings}
              onChangeSettings={setSettings}
              lang={lang}
            />

            {/* Queue Management Bar & Actions */}
            {items.length > 0 && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Queue Counters & Summary */}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {t.queueSummary}
                      </h3>
                      <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 tabular-nums">
                        {completedItems.length}/{items.length} {t.completedCount}
                      </span>
                    </div>

                    {completedItems.length > 0 && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Jimat{' '}
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                          {formatBytes(totalSavedBytes)} ({overallSavingsPercent}%)
                        </span>{' '}
                        ruang storan.
                      </p>
                    )}
                  </div>

                  {/* Right: Batch Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    {queuedCount > 0 && (
                      <button
                        type="button"
                        onClick={() => startConversion()}
                        disabled={isConverting}
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{isConverting ? t.convertingBtn : t.convertAllBtn}</span>
                      </button>
                    )}

                    {completedItems.length > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={handleDownloadAllZip}
                          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 shadow-sm transition-colors cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{t.downloadZipBtn}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsExportModalOpen(true)}
                          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                          title="Pilihan Eksport & Storan Awan"
                        >
                          <Cloud className="w-3.5 h-3.5 text-blue-500" />
                          <span>Eksport / Awan</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleClearCompleted}
                          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title={t.clearCompletedBtn}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title={t.clearAllBtn}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Overall Batch Progress Bar */}
                {items.length > 0 && (
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Queue List of Items */}
            {items.length > 0 && (
              <div className="space-y-2.5">
                {items.map((item) => (
                  <QueueItem
                    key={item.id}
                    item={item}
                    onRemove={handleRemoveItem}
                    onCompare={(selected) => setActiveCompareItem(selected)}
                    lang={lang}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Dashboard & History Analytics Tab */
          <DashboardView
            historyRecords={historyRecords}
            onRefreshHistory={refreshHistory}
            lang={lang}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200 dark:border-slate-800 py-6 mt-12 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 dark:text-slate-200">AutoWebP Pro</span>
            <span aria-hidden="true">·</span>
            <span>Pemprosesan imej luar talian dalam pelayar</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsGuideModalOpen(true)}
              className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              {t.navGuide}
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setCurrentTab('dashboard')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              {t.navDashboard}
            </button>
          </div>
        </div>
      </footer>

      {/* Compare Modal */}
      <CompareModal
        item={activeCompareItem}
        onClose={() => setActiveCompareItem(null)}
        lang={lang}
      />

      {/* Export & Cloud Storage Modal */}
      <ExportModal
        items={items}
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        lang={lang}
      />

      {/* WebP Guide Modal */}
      <GuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        lang={lang}
      />
    </div>
  );
}
