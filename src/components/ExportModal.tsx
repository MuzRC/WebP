import React, { useState } from 'react';
import { X, Archive, FolderCheck, Cloud, Share2, Check, AlertCircle, Loader2 } from 'lucide-react';
import { ImageItem, Language } from '../types';
import { getTranslation } from '../i18n/translations';
import { downloadBatchAsZip, saveToDeviceFolder, shareViaWebShare } from '../services/exportService';
import { formatBytes } from '../services/imageConverter';

interface ExportModalProps {
  items: ImageItem[];
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  items,
  isOpen,
  onClose,
  lang,
}) => {
  const t = getTranslation(lang);
  const [zipProgress, setZipProgress] = useState<number | null>(null);
  const [folderStatus, setFolderStatus] = useState<string | null>(null);
  const [activeMessage, setActiveMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const completed = items.filter((i) => i.status === 'completed' && i.convertedBlob);
  const totalConvertedSize = completed.reduce((acc, curr) => acc + (curr.convertedSize || 0), 0);
  const totalOriginalSize = completed.reduce((acc, curr) => acc + curr.originalSize, 0);
  const totalSavedSize = Math.max(0, totalOriginalSize - totalConvertedSize);

  const handleDownloadZip = async () => {
    try {
      setZipProgress(10);
      await downloadBatchAsZip(completed, (pct) => setZipProgress(pct));
      setActiveMessage({
        type: 'success',
        text: `Arkib ZIP (${completed.length} fail) berjaya dijana dan dimuat turun!`,
      });
      setTimeout(() => setZipProgress(null), 1000);
    } catch (err) {
      console.error('ZIP failed:', err);
      setZipProgress(null);
      setActiveMessage({ type: 'error', text: 'Gagal menjana arkib ZIP.' });
    }
  };

  const handleSaveToFolder = async () => {
    setFolderStatus('Menyediakan folder...');
    const result = await saveToDeviceFolder(completed, (status) => setFolderStatus(status));
    setFolderStatus(null);
    if (result.success) {
      setActiveMessage({ type: 'success', text: result.message || 'Fail berjaya disimpan ke peranti!' });
    } else if (result.message) {
      setActiveMessage({ type: 'info', text: result.message });
    }
  };

  const handleExportGoogleDrive = () => {
    // 1. First trigger ZIP generation so user has all compressed files
    handleDownloadZip();
    
    // 2. Open Google Drive upload web app in a new tab so user can immediately drop the bundle
    window.open('https://drive.google.com/drive/my-drive', '_blank', 'noopener,noreferrer');
    
    setActiveMessage({
      type: 'success',
      text: 'Arkib ZIP sedang dimuat turun dan Google Drive dibuka. Anda boleh terus melepaskan fail ke dalam folder Google Drive anda!',
    });
  };

  const handleShare = async () => {
    const success = await shareViaWebShare(completed);
    if (success) {
      setActiveMessage({ type: 'success', text: 'Perkongsian fail berjaya!' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {t.exportModalTitle}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {completed.length} fail siap · Saiz WebP: {formatBytes(totalConvertedSize)} (Jimat {formatBytes(totalSavedSize)})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 space-y-4">
          {activeMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                activeMessage.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                  : activeMessage.type === 'error'
                  ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900'
                  : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900'
              }`}
            >
              {activeMessage.type === 'success' ? (
                <Check className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{activeMessage.text}</span>
            </div>
          )}

          {/* Option 1: ZIP Archive */}
          <div className="border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-900 rounded-xl p-4 transition-colors flex items-start gap-3.5 bg-slate-50/50 dark:bg-slate-950/30">
            <div className="p-2.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 shrink-0">
              <Archive className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                {t.exportZipTitle}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t.exportZipDesc}
              </p>
              <button
                type="button"
                onClick={handleDownloadZip}
                disabled={zipProgress !== null}
                className="mt-3 inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                {zipProgress !== null ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menjana ZIP ({zipProgress}%)...</span>
                  </>
                ) : (
                  <span>{t.exportZipAction}</span>
                )}
              </button>
            </div>
          </div>

          {/* Option 2: Direct Device Folder Save */}
          <div className="border border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-900 rounded-xl p-4 transition-colors flex items-start gap-3.5 bg-slate-50/50 dark:bg-slate-950/30">
            <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 shrink-0">
              <FolderCheck className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                {t.exportFolderTitle}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t.exportFolderDesc}
              </p>
              <button
                type="button"
                onClick={handleSaveToFolder}
                disabled={folderStatus !== null}
                className="mt-3 inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                {folderStatus ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{folderStatus}</span>
                  </>
                ) : (
                  <span>{t.exportFolderAction}</span>
                )}
              </button>
            </div>
          </div>

          {/* Option 3: Google Drive Cloud Storage */}
          <div className="border border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-900 rounded-xl p-4 transition-colors flex items-start gap-3.5 bg-slate-50/50 dark:bg-slate-950/30">
            <div className="p-2.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 shrink-0">
              <Cloud className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                {t.exportDriveTitle}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t.exportDriveDesc}
              </p>
              <button
                type="button"
                onClick={handleExportGoogleDrive}
                className="mt-3 inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors cursor-pointer"
              >
                <span>{t.exportDriveAction}</span>
              </button>
            </div>
          </div>

          {/* Option 4: Quick Share (if supported) */}
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <div className="border border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-900 rounded-xl p-4 transition-colors flex items-start gap-3.5 bg-slate-50/50 dark:bg-slate-950/30">
              <div className="p-2.5 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 shrink-0">
                <Share2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {t.exportShareTitle}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {t.exportShareDesc}
                </p>
                <button
                  type="button"
                  onClick={handleShare}
                  className="mt-3 inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors cursor-pointer"
                >
                  <span>{t.exportShareAction}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {t.closeBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
