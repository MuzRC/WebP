import React, { useState } from 'react';
import { Sliders, Volume2, VolumeX, Bell, BellOff, Lock, Unlock, ChevronDown, ChevronUp } from 'lucide-react';
import { ConversionSettings, Language, ResizeMode } from '../types';
import { getTranslation } from '../i18n/translations';
import { requestNotificationPermission } from '../services/notificationService';

interface SettingsBarProps {
  settings: ConversionSettings;
  onChangeSettings: (settings: ConversionSettings) => void;
  lang: Language;
}

export const SettingsBar: React.FC<SettingsBarProps> = ({
  settings,
  onChangeSettings,
  lang,
}) => {
  const t = getTranslation(lang);
  const [isExpanded, setIsExpanded] = useState(true);

  const handleQualityChange = (val: number) => {
    onChangeSettings({ ...settings, quality: Math.min(Math.max(val, 1), 100) });
  };

  const handleResizeChange = (mode: ResizeMode) => {
    onChangeSettings({ ...settings, resizeMode: mode });
  };

  const handleToggleNotification = async () => {
    if (!settings.enableDesktopNotification) {
      const granted = await requestNotificationPermission();
      onChangeSettings({ ...settings, enableDesktopNotification: granted });
    } else {
      onChangeSettings({ ...settings, enableDesktopNotification: false });
    }
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden transition-all">
      {/* Settings Header bar with collapse toggle */}
      <div className="px-5 py-3.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/30">
        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold text-sm">
          <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>{t.settingsTitle}</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick Audio & Desktop Notification Toggles */}
          <button
            type="button"
            onClick={() =>
              onChangeSettings({
                ...settings,
                enableSoundNotification: !settings.enableSoundNotification,
              })
            }
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              settings.enableSoundNotification
                ? 'border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
                : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600'
            }`}
            title={t.soundNotificationLabel}
          >
            {settings.enableSoundNotification ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={handleToggleNotification}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              settings.enableDesktopNotification
                ? 'border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
                : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600'
            }`}
            title={t.desktopNotificationLabel}
          >
            {settings.enableDesktopNotification ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Column 1: WebP Quality & Presets */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <label htmlFor="quality-slider">{t.qualityLabel}</label>
              <span className="font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded text-xs tabular-nums">
                {settings.quality}%
              </span>
            </div>

            <div className="relative flex items-center">
              <input
                id="quality-slider"
                type="range"
                min="5"
                max="100"
                step="1"
                value={settings.quality}
                onChange={(e) => handleQualityChange(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            {/* Quality Presets Segmented Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
              <button
                type="button"
                onClick={() => handleQualityChange(80)}
                className={`flex-1 py-1 px-2 text-xs font-medium rounded-lg transition-colors cursor-pointer text-center ${
                  settings.quality === 80
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                80% Seimbang
              </button>
              <button
                type="button"
                onClick={() => handleQualityChange(95)}
                className={`flex-1 py-1 px-2 text-xs font-medium rounded-lg transition-colors cursor-pointer text-center ${
                  settings.quality === 95
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                95% Tinggi
              </button>
              <button
                type="button"
                onClick={() => handleQualityChange(65)}
                className={`flex-1 py-1 px-2 text-xs font-medium rounded-lg transition-colors cursor-pointer text-center ${
                  settings.quality === 65
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                65% Web Kecil
              </button>
            </div>
          </div>

          {/* Column 2: Batch Resize Options */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <label htmlFor="resize-mode">{t.resizeLabel}</label>
              <span className="text-[11px] text-slate-400">Pukal / Batch</span>
            </div>

            <select
              id="resize-mode"
              value={settings.resizeMode}
              onChange={(e) => handleResizeChange(e.target.value as ResizeMode)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="none">{t.resizeOriginal}</option>
              <option value="75%">{t.resize75}</option>
              <option value="50%">{t.resize50}</option>
              <option value="25%">{t.resize25}</option>
              <option value="1920w">{t.resize1920}</option>
              <option value="1280w">{t.resize1280}</option>
              <option value="800w">{t.resize800}</option>
              <option value="custom">{t.resizeCustom}</option>
            </select>

            {/* Custom dimensions if chosen */}
            {settings.resizeMode === 'custom' && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  placeholder="Lebar (px)"
                  value={settings.customWidth || ''}
                  onChange={(e) =>
                    onChangeSettings({ ...settings, customWidth: Number(e.target.value) })
                  }
                  className="w-24 px-2.5 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800"
                />
                <span className="text-slate-400 text-xs">×</span>
                <input
                  type="number"
                  placeholder="Tinggi (px)"
                  value={settings.customHeight || ''}
                  onChange={(e) =>
                    onChangeSettings({ ...settings, customHeight: Number(e.target.value) })
                  }
                  className="w-24 px-2.5 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800"
                />
                <button
                  type="button"
                  onClick={() =>
                    onChangeSettings({
                      ...settings,
                      maintainAspectRatio: !settings.maintainAspectRatio,
                    })
                  }
                  className="p-1 rounded text-slate-500 hover:text-slate-800 dark:hover:text-white"
                  title={t.maintainAspect}
                >
                  {settings.maintainAspectRatio ? <Lock className="w-3.5 h-3.5 text-blue-500" /> : <Unlock className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>

          {/* Column 3: Naming & Auto Processing */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <label htmlFor="file-naming">{t.namingLabel}</label>
            </div>

            <select
              id="file-naming"
              value={settings.fileNaming}
              onChange={(e) =>
                onChangeSettings({
                  ...settings,
                  fileNaming: e.target.value as 'default' | 'suffix' | 'prefix',
                })
              }
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="default">{t.namingDefault}</option>
              <option value="suffix">{t.namingSuffix}</option>
              <option value="prefix">{t.namingPrefix}</option>
            </select>

            {/* Auto Convert checkbox */}
            <label className="flex items-center gap-2 pt-1 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={settings.autoProcessOnUpload}
                onChange={(e) =>
                  onChangeSettings({ ...settings, autoProcessOnUpload: e.target.checked })
                }
                className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
              />
              <span>{t.autoProcessLabel}</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
