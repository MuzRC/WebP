import { HistoryRecord, ConversionSummary } from '../types';

const STORAGE_KEY = 'autowebp_conversion_history_v1';

export function loadHistory(): HistoryRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load history from localStorage:', err);
    return [];
  }
}

export function saveHistoryRecord(record: HistoryRecord) {
  try {
    const list = loadHistory();
    // Keep up to 200 recent records
    const updated = [record, ...list].slice(0, 200);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save history record:', err);
  }
}

export function saveBatchHistoryRecords(records: HistoryRecord[]) {
  try {
    const list = loadHistory();
    const updated = [...records, ...list].slice(0, 200);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save batch history:', err);
  }
}

export function clearHistory() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear history:', err);
  }
}

export function deleteHistoryItem(id: string) {
  try {
    const list = loadHistory();
    const updated = list.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to delete history item:', err);
  }
}

export function computeSummary(records: HistoryRecord[]): ConversionSummary {
  if (records.length === 0) {
    return {
      totalFiles: 0,
      totalOriginalBytes: 0,
      totalConvertedBytes: 0,
      totalSavedBytes: 0,
      averageSavingsPercent: 0,
    };
  }

  let totalOriginal = 0;
  let totalConverted = 0;

  for (const r of records) {
    totalOriginal += r.originalSize;
    totalConverted += r.convertedSize;
  }

  const totalSaved = Math.max(0, totalOriginal - totalConverted);
  const avgPercent = totalOriginal > 0 ? Math.round((totalSaved / totalOriginal) * 100) : 0;

  return {
    totalFiles: records.length,
    totalOriginalBytes: totalOriginal,
    totalConvertedBytes: totalConverted,
    totalSavedBytes: totalSaved,
    averageSavingsPercent: avgPercent,
  };
}
