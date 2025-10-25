import React, { createContext, useContext, ReactNode } from 'react';
import { useDisplaySettings } from './useTheme';
import { translations, languageOptions } from '../locales';
import { Language } from '../types';

// The type for the 't' function's keys should be based on a single language's keys, e.g., 'en'.
// This assumes all language files have the same keys.
type TranslationKey = keyof typeof translations.en;

interface LocalizationContextType {
    t: (key: TranslationKey) => string;
    language: Language;
    setLanguage: (lang: Language) => void;
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

export const LocalizationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { settings, setSettings } = useDisplaySettings();

    const setLanguage = (lang: Language) => {
        const option = languageOptions.find(opt => opt.value === lang);
        if (option) {
            setSettings({
                ...settings,
                language: option.value,
                translationIdentifier: option.translationId,
            });
        }
    };

    const t = (key: TranslationKey): string => {
        return translations[settings.language][key] || translations.en[key];
    };

    return (
        <LocalizationContext.Provider value={{ t, language: settings.language, setLanguage }}>
            {children}
        </LocalizationContext.Provider>
    );
};

export const useLocalization = (): LocalizationContextType => {
    const context = useContext(LocalizationContext);
    if (!context) {
        throw new Error('useLocalization must be used within a LocalizationProvider');
    }
    return context;
};
