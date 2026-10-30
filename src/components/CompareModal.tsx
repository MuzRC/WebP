import React, { useState } from 'react';
import { X, Download, ZoomIn, ZoomOut } from 'lucide-react';
import { ImageItem, Language } from '../types';
import { formatBytes } from '../services/imageConverter';
import { downloadBlob } from '../services/exportService';
import { getTranslation } from '../i18n/translations';

interface CompareModalProps {
  item: ImageItem | null;
  onClose: () => void;
  lang: Language;
}

export const CompareModal: React.FC<CompareModalProps> = ({ item, onClose, lang }) => {
  const t = getTranslation(lang);
  const [sliderPos, setSliderPos] = useState(50);
  const [zoom, setZoom] = useState(1);

  if (!item) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {t.compareTitle}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-md">
              {item.name}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Zoom controls */}
            <div className="hidden sm:flex items-center gap-1 border border-slate-200 dark:border-slate-800 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setZoom(Math.max(0.75, zoom - 0.25))}
                className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono px-1 text-slate-600 dark:text-slate-400">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom(Math.min(2.5, zoom + 0.25))}
                className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t.downloadSingle}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Comparison Viewer Area */}
        <div className="relative flex-1 min-h-[380px] bg-slate-950 flex items-center justify-center overflow-hidden p-4">
          <div
            className="relative max-w-full max-h-[60vh] select-none rounded-lg overflow-hidden border border-slate-800"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
          >
            {/* Converted WebP (Base layer) */}
            <img
              src={item.convertedUrl || item.originalPreviewUrl}
              alt="WebP preview"
              className="block max-w-full max-h-[58vh] object-contain pointer-events-none"
              referrerPolicy="no-referrer"
            />

            {/* Original image (Clipped overlay layer) */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${sliderPos}%` }}
            >
              <img
                src={item.originalPreviewUrl}
                alt="Original preview"
                className="block max-w-none max-h-[58vh] object-contain pointer-events-none"
                style={{ width: '100%', height: '100%' }}
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Split divider line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg pointer-events-none"
              style={{ left: `${sliderPos}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white text-slate-800 shadow-md flex items-center justify-center text-[10px] font-bold">
                ⇄
              </div>
            </div>

            {/* Labels on image */}
            <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-black/70 text-[10px] font-semibold text-white tracking-wide">
              {t.compareOriginal}
            </div>
            <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-blue-600/90 text-[10px] font-semibold text-white tracking-wide">
              {t.compareWebP}
            </div>
          </div>
        </div>

        {/* Comparison Slider Bar */}
        <div className="px-6 py-3 bg-slate-900 border-t border-slate-800 flex items-center gap-4">
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
            {t.compareOriginal}
          </span>
          <input
            type="range"
            min="0"
            max="100"
            value={sliderPos}
            onChange={(e) => setSliderPos(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <span className="text-xs text-blue-400 font-medium whitespace-nowrap">
            {t.compareWebP}
          </span>
        </div>

        {/* Bottom Metadata Summary Grid */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <div className="text-slate-400">{t.historyColOriginalSize}</div>
            <div className="font-mono font-medium text-slate-800 dark:text-slate-200 tabular-nums">
              {formatBytes(item.originalSize)} ({item.originalWidth}×{item.originalHeight}px)
            </div>
          </div>

          <div>
            <div className="text-slate-400">{t.historyColConvertedSize}</div>
            <div className="font-mono font-medium text-blue-600 dark:text-blue-400 tabular-nums">
              {item.convertedSize ? formatBytes(item.convertedSize) : '-'} (
              {item.convertedWidth}×{item.convertedHeight}px)
            </div>
          </div>

          <div>
            <div className="text-slate-400">{t.historyColSavings}</div>
            <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              -{savingsPercent}% ({formatBytes(Math.max(0, item.originalSize - (item.convertedSize || 0)))})
            </div>
          </div>

          <div>
            <div className="text-slate-400">Format</div>
            <div className="font-mono text-slate-700 dark:text-slate-300">
              {item.originalFormat.toUpperCase()} → WEBP
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
