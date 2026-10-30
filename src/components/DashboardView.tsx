import React, { useState } from 'react';
import { HistoryRecord, Language } from '../types';
import { getTranslation } from '../i18n/translations';
import { formatBytes } from '../services/imageConverter';
import { clearHistory, deleteHistoryItem, computeSummary } from '../services/historyStorage';
import { Zap, HardDrive, FileCheck, TrendingDown, Search, Trash2, Clock, Inbox } from 'lucide-react';

interface DashboardViewProps {
  historyRecords: HistoryRecord[];
  onRefreshHistory: () => void;
  lang: Language;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  historyRecords,
  onRefreshHistory,
  lang,
}) => {
  const t = getTranslation(lang);
  const [searchQuery, setSearchQuery] = useState('');

  const summary = computeSummary(historyRecords);

  const filtered = historyRecords.filter(
    (r) =>
      r.originalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.convertedName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleClearAll = () => {
    if (window.confirm(t.confirmClearHistory)) {
      clearHistory();
      onRefreshHistory();
    }
  };

  const handleDeleteItem = (id: string) => {
    deleteHistoryItem(id);
    onRefreshHistory();
  };

  // Estimate page speed improvement based on MB saved:
  // Roughly 1MB less data saved across mobile 3G/4G network saves ~0.6-1.2 seconds of load time
  const estimatedSecondsSaved = (summary.totalSavedBytes / (1024 * 1024)) * 0.8;
  const speedBoostDisplay =
    estimatedSecondsSaved > 60
      ? `${(estimatedSecondsSaved / 60).toFixed(1)}m`
      : `${estimatedSecondsSaved.toFixed(1)}s`;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Title & Subtitle */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t.dashboardTitle}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t.dashboardSubtitle}
        </p>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Files */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t.kpiTotalFiles}
            </span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
              {summary.totalFiles}
            </span>
            <span className="text-xs text-slate-400 ml-2">fail</span>
          </div>
        </div>

        {/* KPI 2: Total Storage Saved */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t.kpiTotalSaved}
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
              {formatBytes(summary.totalSavedBytes)}
            </span>
          </div>
        </div>

        {/* KPI 3: Average Compression */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t.kpiAvgSavings}
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
              {summary.averageSavingsPercent}%
            </span>
            <span className="text-xs text-emerald-500 font-semibold ml-2">lebih ringan</span>
          </div>
        </div>

        {/* KPI 4: Speed Boost */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t.kpiSpeedBoost}
            </span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
              ~{speedBoostDisplay}
            </span>
            <span className="text-xs text-slate-400 ml-2">masa muatan dijimatkan</span>
          </div>
        </div>
      </div>

      {/* History Table Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
        {/* Table Toolbar */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {t.historyTableTitle}
            </h3>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              ({historyRecords.length})
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Search filter input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t.historySearchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {historyRecords.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t.clearHistoryBtn}</span>
              </button>
            )}
          </div>
        </div>

        {/* History Table */}
        {filtered.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
            <Inbox className="w-12 h-12 stroke-[1.25] mb-3 text-slate-300 dark:text-slate-700" />
            <p className="text-sm">{t.historyEmpty}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                <tr>
                  <th className="py-3 px-4">{t.historyColOriginal}</th>
                  <th className="py-3 px-4">{t.historyColConverted}</th>
                  <th className="py-3 px-4 text-right">{t.historyColOriginalSize}</th>
                  <th className="py-3 px-4 text-right">{t.historyColConvertedSize}</th>
                  <th className="py-3 px-4 text-right">{t.historyColSavings}</th>
                  <th className="py-3 px-4 text-right">{t.historyColDate}</th>
                  <th className="py-3 px-4 text-center">{t.historyColActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white max-w-[200px] truncate" title={r.originalName}>
                      {r.originalName}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-[200px] truncate" title={r.convertedName}>
                      {r.convertedName}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                      {formatBytes(r.originalSize)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-blue-600 dark:text-blue-400 tabular-nums">
                      {formatBytes(r.convertedSize)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      -{r.savingsPercent}%
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400 whitespace-nowrap">
                      {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                      · {new Date(r.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(r.id)}
                        className="p-1 rounded text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                        title="Padam rekod"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
