import React from 'react';
import { Download, Trash2, SplitSquareVertical, CheckCircle2, Clock, Loader2, AlertCircle } from 'lucide-react';
import { ImageItem, Language } from '../types';
import { formatBytes } from '../services/imageConverter';
import { downloadBlob } from '../services/exportService';
import { getTranslation } from '../i18n/translations';

interface QueueItemProps {
  item: ImageItem;
  onRemove: (id: string) => void;
  onCompare: (item: ImageItem) => void;
  lang: Language;
}

export const QueueItem: React.FC<QueueItemProps> = ({
  item,
  onRemove,
  onCompare,
  lang,
}) => {
  const t = getTranslation(lang);

  const savingsPercent =
    item.convertedSize && item.originalSize > 0
      ? Math.max(0, Math.round(((item.originalSize - item.convertedSize) / item.originalSize) * 100))
      : 0;

  const handleDownload = () => {
    if (item.convertedBlob) {
      const outName = item.name.replace(/\.[^/.]+$/, '') + '.webp';
      downloadBlob(item.convertedBlob, outName);
    }
  };

  return (
    <div className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs">
      {/* Left side: Thumbnail & Metadata */}
      <div className="flex items-center gap-3.5 w-full sm:w-auto min-w-0">
        <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200/60 dark:border-slate-800 flex items-center justify-center">
          <img
            src={item.convertedUrl || item.originalPreviewUrl}
            alt={item.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute top-0.5 right-0.5 px-1 rounded bg-black/60 text-[9px] font-mono font-medium text-white uppercase backdrop-blur-xs">
            {item.originalFormat}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4
              className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate"
              title={item.name}
            >
              {item.name}
            </h4>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span className="font-mono tabular-nums">{formatBytes(item.originalSize)}</span>
            <span aria-hidden="true">→</span>
            {item.status === 'completed' && item.convertedSize !== null ? (
              <>
                <span className="font-mono tabular-nums text-slate-900 dark:text-white font-medium">
                  {formatBytes(item.convertedSize)}
                </span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded text-[11px]">
                  -{savingsPercent}%
                </span>
              </>
            ) : (
              <span className="text-slate-400 italic">
                {item.status === 'converting' ? t.statusConverting : t.statusQueued}
              </span>
            )}

            {item.convertedWidth && item.convertedHeight && (
              <>
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                <span className="font-mono text-[11px] text-slate-400">
                  {item.convertedWidth}×{item.convertedHeight}px
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Center status bar if converting */}
      {item.status === 'converting' && (
        <div className="w-full sm:w-36 flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px] text-blue-600 dark:text-blue-400 font-medium">
            <span className="flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              {t.statusConverting}
            </span>
            <span className="font-mono tabular-nums">{item.progress}%</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${item.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Right side: Status icons & Action Buttons */}
      <div className="flex items-center justify-end gap-2 w-full sm:w-auto shrink-0">
        {item.status === 'queued' && (
          <div className="flex items-center gap-1 text-slate-400 text-xs px-2 py-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{t.statusQueued}</span>
          </div>
        )}

        {item.status === 'error' && (
          <div
            className="flex items-center gap-1 text-red-500 text-xs px-2 py-1"
            title={item.error || 'Ralat penukaran'}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{t.statusError}</span>
          </div>
        )}

        {item.status === 'completed' && (
          <>
            <div className="hidden md:flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-medium px-2 py-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>{t.statusCompleted}</span>
            </div>

            <button
              type="button"
              onClick={() => onCompare(item)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              title={t.comparePreview}
            >
              <SplitSquareVertical className="w-3.5 h-3.5 text-slate-500" />
              <span>{t.comparePreview}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
              title={t.downloadSingle}
            >
              <Download className="w-3.5 h-3.5" />
              <span>WebP</span>
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title={t.removeSingle}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
