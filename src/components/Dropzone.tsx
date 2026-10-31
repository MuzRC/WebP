/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { UploadCloud, FolderUp, Sparkles, Image as ImageIcon, Clipboard } from 'lucide-react';
import { Language } from '../types';
import { getTranslation } from '../i18n/translations';
import { createSampleImage } from '../services/imageConverter';

interface DropzoneProps {
  onFilesSelected: (files: File[]) => void;
  lang: Language;
}

export const Dropzone: React.FC<DropzoneProps> = ({ onFilesSelected, lang }) => {
  const t = getTranslation(lang);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isGeneratingSample, setIsGeneratingSample] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Global clipboard paste listener (Ctrl+V / Cmd+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) pastedFiles.push(file);
        }
      }

      if (pastedFiles.length > 0) {
        onFilesSelected(pastedFiles);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [onFilesSelected]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith('image/') || /\.(png|jpe?g|gif|avif|bmp|svg|webp|tiff|jfif)$/i.test(file.name)
    );

    if (files.length > 0) {
      onFilesSelected(files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      onFilesSelected(files);
      e.target.value = '';
    }
  };

  const handleLoadSamples = async () => {
    try {
      setIsGeneratingSample(true);
      const [f1, f2, f3] = await Promise.all([
        createSampleImage('landscape'),
        createSampleImage('product'),
        createSampleImage('graphic'),
      ]);
      onFilesSelected([f1, f2, f3]);
    } catch (err) {
      console.error('Failed to create sample images:', err);
    } finally {
      setIsGeneratingSample(false);
    }
  };

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative group rounded-2xl border-2 border-dashed transition-all duration-200 p-8 sm:p-12 text-center cursor-pointer ${
          isDragOver
            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 shadow-lg scale-[1.005]'
            : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 bg-white dark:bg-slate-900/60'
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.png,.jpg,.jpeg,.gif,.avif,.bmp,.svg,.webp,.tiff,.jfif"
          className="hidden"
          onChange={handleFileInputChange}
        />
        <input
          ref={folderInputRef}
          type="file"
          // @ts-expect-error webkitdirectory folder upload attribute
          webkitdirectory="true"
          directory="true"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
        />

        <div className="max-w-xl mx-auto flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 group-hover:scale-105 transition-transform duration-200">
            <UploadCloud className="w-8 h-8" />
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Lepaskan Imej Sprite Sheet di Sini
          </h2>

          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Format disokong: PNG, JPG, JFIF, WebP (Potongan automatik mengikut mod yang dipilih di atas).
          </p>

          <div
            className="flex flex-wrap items-center justify-center gap-3 mb-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-sm transition-colors cursor-pointer"
            >
              <ImageIcon className="w-4 h-4" />
              <span>{t.chooseFilesBtn}</span>
            </button>

            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium text-sm transition-colors cursor-pointer"
            >
              <FolderUp className="w-4 h-4 text-slate-500" />
              <span>{t.chooseFolderBtn}</span>
            </button>

            <button
              type="button"
              onClick={handleLoadSamples}
              disabled={isGeneratingSample}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-medium text-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>{isGeneratingSample ? 'Menjana contoh...' : t.trySampleBtn}</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
            <span>PNG, JPG, JFIF, WebP</span>
            <span className="hidden sm:inline" aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <Clipboard className="w-3.5 h-3.5 text-blue-500" />
              {t.dropzonePasteHint}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
