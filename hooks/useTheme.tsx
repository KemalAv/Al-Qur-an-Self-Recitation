import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { DisplaySettings } from '../types';

// --- Theme Context ---
type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>(() => {
        if (typeof window !== 'undefined') {
            const savedTheme = localStorage.getItem('theme') as Theme;
            return savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        }
        return 'light';
    });

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove(theme === 'light' ? 'dark' : 'light');
        root.classList.add(theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

// --- Display Settings Context ---
interface DisplaySettingsContextType {
    settings: DisplaySettings;
    setSettings: (settings: DisplaySettings) => void;
}

const DisplaySettingsContext = createContext<DisplaySettingsContextType | undefined>(undefined);

const defaultSettings: DisplaySettings = {
    showTransliteration: false,
    showTranslation: true,
    arabicFontSize: 2, // 0-5 scale, 2 is S
    translationFontSize: 2, // 0-5 scale, 2 is S
    transliterationFontSize: 2, // 0-5 scale, 2 is S
    reciter: 'ar.alafasy', // Default reciter
};


export const DisplaySettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<DisplaySettings>(() => {
         if (typeof window !== 'undefined') {
            try {
                const savedSettings = localStorage.getItem('displaySettings');
                // Merge saved settings with defaults to ensure new settings are applied
                const parsedSettings = savedSettings ? JSON.parse(savedSettings) : {};
                return { ...defaultSettings, ...parsedSettings };
            } catch (error) {
                console.error("Failed to parse display settings from localStorage", error);
                return defaultSettings;
            }
        }
        return defaultSettings;
    });

    const handleSetSettings = (newSettings: DisplaySettings) => {
        setSettings(newSettings);
        localStorage.setItem('displaySettings', JSON.stringify(newSettings));
    };

    return (
        <DisplaySettingsContext.Provider value={{ settings, setSettings: handleSetSettings }}>
            {children}
        </DisplaySettingsContext.Provider>
    );
};

export const useDisplaySettings = (): DisplaySettingsContextType => {
    const context = useContext(DisplaySettingsContext);
    if (!context) {
        throw new Error('useDisplaySettings must be used within a DisplaySettingsProvider');
    }
    return context;
};