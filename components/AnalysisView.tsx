import React, { useState, useRef, useEffect } from 'react';
import { Surah, Ayah, Mistake } from '../types';
import { BackIcon, PlayIcon, PauseIcon } from './icons';
import { useDisplaySettings } from '../hooks/useTheme';
import { useLocalization } from '../hooks/useLocalization';

interface AnalysisViewProps {
  title: string;
  ayahs: Ayah[];
  mistakes: Mistake[];
  onBack: () => void;
}

const ARABIC_FONT_SIZES = ['text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl'];
const TRANSLITERATION_FONT_SIZES = ['text-[10px]', 'text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl'];
const TRANSLATION_FONT_SIZES = ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl'];


const toArabicNumeral = (n: number): string => {
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return String(n).split('').map(digit => arabicNumerals[parseInt(digit)]).join('');
};

// Function to remove Arabic waqf (pause) marks
const cleanArabicText = (text: string) => text.replace(/[\u06d6-\u06dc\u06de]/g, '');


const AnalysisView: React.FC<AnalysisViewProps> = ({ title, ayahs, mistakes, onBack }) => {
    const { settings } = useDisplaySettings();
    const [playingAyahKey, setPlayingAyahKey] = useState<number | null>(null);
    const audioPlayer = useRef<HTMLAudioElement | null>(null);
    const { t } = useLocalization();
  
    useEffect(() => {
        audioPlayer.current = new Audio();
        const player = audioPlayer.current;

        const onEnded = () => setPlayingAyahKey(null);
        const onPause = () => {
            // Only nullify if it's not being replaced by another track
            if (player.src === audioPlayer.current?.src) {
                 setPlayingAyahKey(null);
            }
        };
        
        player.addEventListener('ended', onEnded);
        player.addEventListener('pause', onPause);

        return () => {
            player.pause();
            player.removeEventListener('ended', onEnded);
            player.removeEventListener('pause', onPause);
        };
    }, []);

    const togglePlay = (ayah: Ayah) => {
        const player = audioPlayer.current;
        if (!player || !ayah.audio) return;

        if (playingAyahKey === ayah.numberInQuran) {
            player.pause();
        } else {
            player.src = ayah.audio;
            player.play().catch(e => console.error("Audio play failed", e));
            setPlayingAyahKey(ayah.numberInQuran);
        }
    };
    
    return (
        <div className="flex flex-col h-screen">
            <header className="flex-shrink-0 p-4 flex items-center justify-between border-b-2 border-gray-200 dark:border-gray-800 bg-gradient-to-b from-white/80 to-gray-100/80 dark:from-dark-surface/80 dark:to-dark-bg/80 backdrop-blur-sm shadow-retro-md z-10">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-dark-surface">
                    <BackIcon className="w-6 h-6"/>
                </button>
                <div className="text-center">
                    <h1 className="text-xl font-bold">{title}</h1>
                    <p className="text-gray-500 dark:text-gray-400">{t('analysisTitle')}</p>
                </div>
                <div className="w-10"></div>
            </header>

            <main className="flex-grow p-4 md:p-8 overflow-y-auto bg-white dark:bg-dark-surface">
                <div className="max-w-4xl mx-auto space-y-8">
                    <div className="flex justify-center space-x-6 p-4 rounded-lg bg-gray-100 dark:bg-dark-card border border-gray-200 dark:border-gray-700 shadow-retro-inner">
                        <div className="flex items-center space-x-2">
                            <span className="w-5 h-5 rounded-sm bg-red-200 border border-red-300"></span>
                            <span className="font-medium">{t('forgotLabel')}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                             <span className="w-5 h-5 rounded-sm bg-yellow-200 border border-yellow-300"></span>
                            <span className="font-medium">{t('tajwidMistakeLabel')}</span>
                        </div>
                    </div>
                    
                    {ayahs.map((ayah, ayahIndex) => {
                        // Skip rendering the preamble
                        if (ayah.number === 0) return null;

                        const verseEndSymbol = (ayah.number > 0) ? `\u06dd${toArabicNumeral(ayah.number)}` : '';

                        const displayableItems = React.useMemo(() => {
                            const originalWords = ayah.text.split(' ').filter(Boolean);
                            const displayStructure: { type: 'word' | 'waqf'; text: string; logicIndex?: number }[] = [];
                            let logicWordCounter = 0;

                            for (const word of originalWords) {
                                const cleanedWord = cleanArabicText(word);
                                if (cleanedWord.trim().length === 0) {
                                    displayStructure.push({ type: 'waqf', text: word });
                                } else {
                                    displayStructure.push({ type: 'word', text: word, logicIndex: logicWordCounter });
                                    logicWordCounter++;
                                }
                            }
                            
                            return displayStructure.map((item, index) => {
                                if (item.type === 'waqf') {
                                    return <span key={`waqf-${index}`}>{item.text}</span>;
                                }

                                const mistake = mistakes.find(m => m.ayahIndex === ayahIndex && m.wordIndex === item.logicIndex);
                                if (mistake) {
                                    const className = mistake.type === 'forgot'
                                        ? 'bg-red-200 text-red-900 dark:bg-red-800/50 dark:text-red-200 rounded px-1'
                                        : 'bg-yellow-200 text-yellow-900 dark:bg-yellow-700/50 dark:text-yellow-200 rounded px-1';
                                    return <span key={`word-${index}`} className={className}>{item.text}</span>;
                                } else {
                                    return <span key={`word-${index}`}>{item.text}</span>;
                                }
                            });
                        }, [ayah.text, mistakes, ayahIndex]);
                        
                        return (
                            <div key={ayah.numberInQuran} className="p-4 rounded-lg border-b border-gray-200 dark:border-gray-700">
                                <p dir="rtl" className={`font-arabic ${ARABIC_FONT_SIZES[settings.arabicFontSize]}`} style={{ lineHeight: 2.0 }}>
                                    {displayableItems.reduce((prev, curr, i) => [prev, <span key={`space-${i}`}> </span>, curr], [] as React.ReactNode[])}
                                    <span className="text-2xl text-brand-green mx-2">{verseEndSymbol}</span>
                                </p>
                                {settings.showTransliteration && (
                                    <p className={`mt-3 font-mono text-gray-500 dark:text-gray-400 ${TRANSLITERATION_FONT_SIZES[settings.transliterationFontSize]}`}>
                                        {ayah.transliteration}
                                    </p>
                                )}
                                <div className="flex justify-between items-center mt-3">
                                    {settings.showTranslation ? (
                                        <p className={`text-gray-600 dark:text-gray-300 ${TRANSLATION_FONT_SIZES[settings.translationFontSize]} flex-grow pr-4`}>
                                            {ayah.number}. {ayah.translation}
                                        </p>
                                    ) : <div className="flex-grow"></div>}

                                    {ayah.audio && (
                                        <button
                                            onClick={() => togglePlay(ayah)}
                                            className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-surface transition-colors flex-shrink-0"
                                            aria-label={playingAyahKey === ayah.numberInQuran ? 'Pause audio' : 'Play audio'}
                                        >
                                            {playingAyahKey === ayah.numberInQuran ? (
                                                <PauseIcon className="w-6 h-6 text-blue-500" />
                                            ) : (
                                                <PlayIcon className="w-6 h-6" />
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>
        </div>
    );
};

export default AnalysisView;