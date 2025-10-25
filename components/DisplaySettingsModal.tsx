import React, { useState, useEffect } from 'react';
import { DisplaySettings } from '../types';
import { useDisplaySettings } from '../hooks/useTheme';

interface DisplaySettingsModalProps {
  onClose: () => void;
}

const FONT_SIZE_LABELS = ['XXS', 'XS', 'S', 'M', 'L', 'XL'];

const RECITER_OPTIONS = [
  { id: 'ar.alafasy', name: 'Mishary Rashid Alafasy' },
  { id: 'ar.mahermuaiqly', name: 'Maher Al Muaiqly' },
];

const FontSizeControl: React.FC<{
  label: string;
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
}> = ({ label, value, onDecrease, onIncrease }) => (
  <div className="flex items-center justify-between">
    <span className="font-medium">{label}</span>
    <div className="flex items-center space-x-3">
      <button onClick={onDecrease} disabled={value === 0} className="w-8 h-8 rounded-full bg-gradient-to-b from-gray-100 to-gray-300 dark:from-gray-600 dark:to-gray-800 border border-gray-400 dark:border-gray-500 flex items-center justify-center font-bold text-lg disabled:opacity-50 shadow-retro-md">-</button>
      <span className="w-12 text-center font-semibold">{FONT_SIZE_LABELS[value]}</span>
      <button onClick={onIncrease} disabled={value === FONT_SIZE_LABELS.length - 1} className="w-8 h-8 rounded-full bg-gradient-to-b from-gray-100 to-gray-300 dark:from-gray-600 dark:to-gray-800 border border-gray-400 dark:border-gray-500 flex items-center justify-center font-bold text-lg disabled:opacity-50 shadow-retro-md">+</button>
    </div>
  </div>
);


const DisplaySettingsModal: React.FC<DisplaySettingsModalProps> = ({ onClose }) => {
  const { settings: currentSettings, setSettings: applySettings } = useDisplaySettings();
  const [settings, setSettings] = useState<DisplaySettings>(currentSettings);
  
  // Effect to handle if the saved reciter is no longer in the options
  useEffect(() => {
    const isReciterValid = RECITER_OPTIONS.some(option => option.id === settings.reciter);
    if (!isReciterValid) {
        setSettings(prev => ({ ...prev, reciter: RECITER_OPTIONS[0].id }));
    }
  }, [settings.reciter]);


  const handleToggle = (key: keyof DisplaySettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleFontSizeChange = (key: 'arabicFontSize' | 'translationFontSize' | 'transliterationFontSize', change: number) => {
    setSettings(prev => {
        const currentValue = prev[key] as number;
        const newValue = Math.max(0, Math.min(FONT_SIZE_LABELS.length - 1, currentValue + change));
        return { ...prev, [key]: newValue };
    });
  };

  const handleReciterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSettings(prev => ({ ...prev, reciter: event.target.value }));
  };

  const handleApply = () => {
    applySettings(settings);
    onClose();
  };

  const settingsOptions: { key: keyof DisplaySettings, label: string, emoji: string }[] = [
    { key: 'showTranslation', label: 'Translation', emoji: '🌍' },
    { key: 'showTransliteration', label: 'Transliteration', emoji: '🔠' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gradient-to-b from-white to-gray-100 dark:from-dark-card dark:to-dark-surface rounded-2xl p-6 shadow-retro-xl w-full max-w-sm border border-gray-300 dark:border-gray-700 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-6 text-center">🌐 Display Settings</h2>
        
        <div className="space-y-4">
          {settingsOptions.map(({ key, label, emoji }) => (
            <label key={key} className="flex items-center justify-between p-4 rounded-lg bg-gray-100 dark:bg-dark-surface cursor-pointer border border-gray-200 dark:border-gray-600 shadow-retro-inner">
              <span className="flex items-center">
                <span className="mr-4 text-2xl">{emoji}</span>
                <span className="font-medium">{label}</span>
              </span>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={!!settings[key]}
                  onChange={() => handleToggle(key as keyof DisplaySettings)}
                  className="sr-only"
                />
                <div className={`w-14 h-8 rounded-full shadow-retro-inner border ${settings[key] ? 'bg-blue-400 border-blue-500' : 'bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-500'}`}></div>
                <div className={`absolute top-1 left-1 w-6 h-6 bg-white border border-gray-300 rounded-full shadow-retro-md transition-transform ${settings[key] ? 'transform translate-x-6' : ''}`}></div>
              </div>
            </label>
          ))}
        </div>

        <hr className="my-6 border-gray-200 dark:border-gray-600" />
        
        <h3 className="text-xl font-bold mb-4 text-center">🎙️ Reciter</h3>
        <div className="p-4 rounded-lg bg-gray-100 dark:bg-dark-surface border border-gray-200 dark:border-gray-600 shadow-retro-inner">
            <select
              value={settings.reciter}
              onChange={handleReciterChange}
              className="w-full p-3 border-2 border-gray-300 dark:border-gray-500 rounded-lg bg-white dark:bg-dark-surface focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {RECITER_OPTIONS.map(option => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
        </div>
        
        <hr className="my-6 border-gray-200 dark:border-gray-600" />

        <h3 className="text-xl font-bold mb-4 text-center">📏 Font Size</h3>
        <div className="space-y-4 p-4 rounded-lg bg-gray-100 dark:bg-dark-surface border border-gray-200 dark:border-gray-600 shadow-retro-inner">
            <FontSizeControl 
                label="Arabic Text"
                value={settings.arabicFontSize}
                onDecrease={() => handleFontSizeChange('arabicFontSize', -1)}
                onIncrease={() => handleFontSizeChange('arabicFontSize', 1)}
            />
            <FontSizeControl 
                label="Translation"
                value={settings.translationFontSize}
                onDecrease={() => handleFontSizeChange('translationFontSize', -1)}
                onIncrease={() => handleFontSizeChange('translationFontSize', 1)}
            />
            <FontSizeControl 
                label="Transliteration"
                value={settings.transliterationFontSize}
                onDecrease={() => handleFontSizeChange('transliterationFontSize', -1)}
                onIncrease={() => handleFontSizeChange('transliterationFontSize', 1)}
            />
        </div>

        <div className="mt-8 flex space-x-4">
          <button onClick={onClose} className="w-full p-3 font-semibold rounded-lg bg-gradient-to-b from-gray-100 to-gray-300 dark:from-gray-600 dark:to-gray-800 border border-gray-400 dark:border-gray-500 shadow-retro-md hover:shadow-retro-lg transition">
            Cancel
          </button>
          <button onClick={handleApply} className="w-full p-3 font-semibold rounded-lg border border-blue-700 bg-gradient-to-b from-blue-400 to-blue-600 text-white shadow-retro-md hover:shadow-retro-lg transition">
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default DisplaySettingsModal;