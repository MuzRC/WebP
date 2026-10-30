export type Language = 'ms' | 'en';

export type ResizeMode = 'none' | '75%' | '50%' | '25%' | '1920w' | '1280w' | '800w' | 'custom';

export interface ConversionSettings {
  quality: number; // 1 to 100
  resizeMode: ResizeMode;
  customWidth: number;
  customHeight: number;
  maintainAspectRatio: boolean;
  fileNaming: 'default' | 'suffix' | 'prefix';
  namingCustomText: string;
  autoProcessOnUpload: boolean;
  enableSoundNotification: boolean;
  enableDesktopNotification: boolean;
}

export interface ImageItem {
  id: string;
  file: File;
  name: string;
  originalSize: number;
  originalWidth: number;
  originalHeight: number;
  originalFormat: string;
  originalPreviewUrl: string;
  convertedBlob: Blob | null;
  convertedUrl: string | null;
  convertedSize: number | null;
  convertedWidth: number | null;
  convertedHeight: number | null;
  status: 'queued' | 'converting' | 'completed' | 'error';
  progress: number;
  error?: string;
  timestamp: number;
}

export interface HistoryRecord {
  id: string;
  originalName: string;
  convertedName: string;
  originalSize: number;
  convertedSize: number;
  savingsBytes: number;
  savingsPercent: number;
  quality: number;
  originalDimensions: string;
  convertedDimensions: string;
  timestamp: number;
}

export interface ConversionSummary {
  totalFiles: number;
  totalOriginalBytes: number;
  totalConvertedBytes: number;
  totalSavedBytes: number;
  averageSavingsPercent: number;
}
