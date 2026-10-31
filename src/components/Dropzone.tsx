/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { 
  UploadCloud, 
  FolderUp, 
  Sparkles, 
  Image as ImageIcon, 
  Clipboard, 
  Scissors, 
  Users, 
  Car, 
  Layers 
} from 'lucide-react';
import { Language } from '../types';
import { getTranslation } from '../i18n/translations';
import { createSampleImage, sliceSpriteSheet } from '../services/imageConverter';

interface DropzoneProps {
  onFilesSelected: (files: File[]) => void;
  lang: Language;
}

export const Dropzone: React.FC<DropzoneProps> = ({ onFilesSelected, lang }) => {
  const t = getTranslation(lang);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isGeneratingSample, setIsGeneratingSample] = useState(false);
  const [isSlicing, setIsSlicing] = useState(false);
  const [sliceProgress, setSliceProgress] = useState(0);

  // Mod Pemotong Sprite (Avatar 48 atau Kenderaan 9)
  const [isSpriteMode, setIsSpriteMode] = useState(true);
  const [presetType, setPresetType] = useState<'avatar48' | 'vehicle9'>('avatar48');

  // Senarai nama lalai
  const defaultAvatarNames = Array.from({ length: 48 }, (_, i) => 
    `student_boy_${String(i + 1).padStart(2, '0')}`
  ).join('\n');

  const defaultVehicleNames = [
    'kancil_660', 'myvi_king', 'saga_vvt',
    'axia_av', 'wira_sedan', 'bezza_x',
    'iswara_aeroback', 'vios_g', 'city_rs'
  ].join('\n');

  const [namesText, setNamesText] = useState<string>(defaultAvatarNames);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Tukar preset nama fail secara automatik
  const handlePresetChange = (type: 'avatar48' | 'vehicle9') => {
    setPresetType(type);
    setNamesText(type === 'avatar48' ? defaultAvatarNames : defaultVehicleNames);
  };

  // Proses utama pemotongan sprite sheet kepada senarai fail WebP
  const processSpriteSheet = async (file: File) => {
    try {
      setIsSlicing(true);
      setSliceProgress(5);

      const parsedNames = namesText
        .split('\n')
        .map((n) => n.trim())
        .filter((n) => n.length > 0);

      const cols = presetType === 'avatar48' ? 8 : 3;
      const rows = presetType === 'avatar48' ? 6 : 3;

      // Panggil fungsi pemotong dari imageConverter.ts
      const results = await sliceSpriteSheet(
        file,
        cols,
        rows,
        parsedNames,
        90,
        (pct) => setSliceProgress(pct)
      );

      // Tukar hasil blob kepada File objects supaya diterima oleh QueueItem sedia ada
      const slicedFiles: File[] = results.map((res) => {
        return new File([res.blob], res.fileName, { type: 'image/webp' });
      });

      onFilesSelected(slicedFiles);
    } catch (err: any) {
      alert(err.message || 'Ralat semasa memotong sprite.');
    } finally {
      setIsSlicing(false);
      setSliceProgress(0);
    }
  };

  // Pengendali pemilihan fail
  const handleIncomingFiles = (files: File[]) => {
    if (files.length === 0) return;

    if (isSpriteMode) {
      // Ambil fail imej pertama untuk dipotong
      const spriteFile = files.find(
        (f) => f.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(f.name)
      );
      if (spriteFile) {
        processSpriteSheet(spriteFile);
      }
    } else {
      // Mod biasa (tukar pukal satu persatu tanpa potong)
      onFilesSelected(files);
    }
  };

  // Global clipboard paste listener (Ctrl+V / Cmd+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            pastedFiles.push(file);
          }
        }
      }

      if (pastedFiles.length > 0) {
        handleIncomingFiles(pastedFiles);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [onFilesSelected, isSpriteMode, presetType, namesText]);

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
      file.type.startsWith('image/') || /\.(png|jpe?g|gif|avif|bmp|svg|webp|tiff)$/i.test(file.name)
    );

    if (files.length > 0) {
      handleIncomingFiles(files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      handleIncomingFiles(files);
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
    <div className="w-full space-y-4">
      {/* Bar Kawalan Mod: Penukar Biasa vs Pemotong Sprite */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsSpriteMode(false)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              !isSpriteMode
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Penukar WebP Biasa
          </button>
          <button
            type="button"
            onClick={() => setIsSpriteMode(true)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isSpriteMode
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            Pemotong Sprite Grid Auto
          </button>
        </div>

        {isSpriteMode && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handlePresetChange('avatar48')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                presetType === 'avatar48'
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Avatar 48 (8×6)
            </button>
            <button
              type="button"
              onClick={() => handlePresetChange('vehicle9')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                presetType === 'vehicle9'
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              Kenderaan 9 (3×3)
            </button>
          </div>
        )}
      </div>

      {/* Kotak Textarea Penamaan Pukal (Hanya aktif dalam mod pemotong sprite) */}
      {isSpriteMode && (
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-500" />
              Senarai {presetType === 'avatar48' ? '48' : '9'} Nama Fail Pukal (1 baris setiap kotak grid):
            </span>
            <span className="text-slate-400 font-mono">
              {namesText.split('\n').filter((n) => n.trim().length > 0).length} baris
            </span>
          </div>
          <textarea
            rows={4}
            value={namesText}
            onChange={(e) => setNamesText(e.target.value)}
            className="w-full p-2.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed"
            placeholder="Masukkan senarai nama mengikut susunan kotak..."
          />
        </div>
      )}

      {/* Ruang Seret-Lepas (Dropzone) */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative group rounded-2xl border-2 border-dashed transition-all duration-200 p-8 sm:p-12 text-center cursor-pointer ${
          isDragOver
            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 shadow-lg scale-[1.005]'
            : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 bg-white dark:bg-slate-900/60'
        } ${isSlicing ? 'pointer-events-none opacity-80' : ''}`}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={!isSpriteMode}
          accept="image/*,.png,.jpg,.jpeg,.gif,.avif,.bmp,.svg,.webp,.tiff"
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
          {isSlicing ? (
            <div className="w-full max-w-xs space-y-3 py-4">
              <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Sedang memotong {presetType === 'avatar48' ? '48' : '9'} imej WebP... ({sliceProgress}%)
              </p>
              <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-150"
                  style={{ width: `${sliceProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 group-hover:scale-105 transition-transform duration-200">
                <UploadCloud className="w-8 h-8" />
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2">
                {isSpriteMode
                  ? `Lepaskan Sprite Sheet ${presetType === 'avatar48' ? '48 Avatar (8×6)' : '9 Kenderaan (3×3)'}`
                  : t.dropzoneTitle}
              </h2>

              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                {isSpriteMode
                  ? 'Imej akan dipotong secara automatik kepada potongan WebP dan dimasukkan ke barisan muat turun.'
                  : t.dropzoneSubtitle}
              </p>

              {/* Butang Interaksi */}
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
                  <span>{isSpriteMode ? 'Pilih Imej Sprite' : t.chooseFilesBtn}</span>
                </button>

                {!isSpriteMode && (
                  <button
                    type="button"
                    onClick={() => folderInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium text-sm transition-colors cursor-pointer"
                  >
                    <FolderUp className="w-4 h-4 text-slate-500" />
                    <span>{t.chooseFolderBtn}</span>
                  </button>
                )}

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

              {/* Info Format & Petunjuk Paste */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                <span>{t.dropzoneSupport}</span>
                <span className="hidden sm:inline" aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <Clipboard className="w-3.5 h-3.5 text-blue-500" />
                  {t.dropzonePasteHint}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
