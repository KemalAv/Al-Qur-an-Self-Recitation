import React, { useState, useEffect, useRef } from 'react';
import { Ayah } from '../types';
import { BackIcon, SettingsIcon, MemorizeIcon, PlayIcon, PauseIcon } from './icons';
import DisplaySettingsModal from './DisplaySettingsModal';
import { useDisplaySettings } from '../hooks/useTheme';

interface ReadingViewProps {
  title: string;
  isJuzMode: boolean;
  ayahs: Ayah[];
  onBack: () => void;
  onSwitchToMemorization: () => void;
}

const ARABIC_FONT_SIZES = ['text-xl md:text-2xl', 'text-2xl md:text-3xl', 'text-3xl md:text-4xl', 'text-4xl md:text-5xl', 'text-5xl md:text-6xl', 'text-6xl md:text-7xl'];
const TRANSLATION_FONT_SIZES = ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl'];
const TRANSLITERATION_FONT_SIZES = ['text-[10px]', 'text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl'];


const toArabicNumeral = (n: number): string => {
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return String(n).split('').map(digit => arabicNumerals[parseInt(digit)]).join('');
};

const ReadingView: React.FC<ReadingViewProps> = ({ title, isJuzMode, ayahs, onBack, onSwitchToMemorization }) => {
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
  const { settings } = useDisplaySettings();
  const [playingAyahKey, setPlayingAyahKey] = useState<number | null>(null);
  const audioPlayer = useRef<HTMLAudioElement | null>(null);
  
  // Track current surah for display in Juz mode
  let currentSurahName = '';

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
      <header className="flex-shrink-0 p-4 flex items-center justify-between border-b-2 border-gray-200 dark:border-gray-800 bg-gradient-to-b from-white/80 to-gray-100/80 dark:from-dark-surface/80 dark:to-dark-bg/80 backdrop-blur-sm shadow-retro-md z-10 sticky top-0">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-dark-surface" aria-label="Back to menu">
              <BackIcon className="w-6 h-6"/>
          </button>
          <div className="text-center">
              <h1 className="text-xl font-bold">{title}</h1>
              <p className="text-gray-500 dark:text-gray-400">Reading Mode</p>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={() => setSettingsModalOpen(true)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-dark-surface" title="Display Settings">
                <SettingsIcon className="w-6 h-6"/>
            </button>
            <button onClick={onSwitchToMemorization} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-dark-surface" title="Switch to Memorization Mode">
                <MemorizeIcon className="w-6 h-6"/>
            </button>
          </div>
      </header>

      <main className="flex-grow p-4 md:p-8 overflow-y-auto bg-white dark:bg-dark-surface">
        <div className="max-w-4xl mx-auto space-y-6">
            {ayahs.map((ayah) => {
                const isPreamble = ayah.number === 0;
                const verseEndSymbol = !isPreamble ? `\u06dd${toArabicNumeral(ayah.number)}` : '';
                
                let surahHeader = null;
                if (isJuzMode && ayah.surah.englishName !== currentSurahName) {
                    currentSurahName = ayah.surah.englishName;
                    if (!isPreamble) { // Don't show header if the first verse is part of a preamble
                         surahHeader = (
                            <div className="my-8 text-center p-4 border-y-2 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-dark-card rounded-lg shadow-retro-inner">
                                <h2 className="text-xl font-bold font-arabic">{ayah.surah.name}</h2>
                                <p className="text-base font-semibold">{ayah.surah.englishName}</p>
                            </div>
                        );
                    }
                }

                return (
                    <React.Fragment key={ayah.numberInQuran}>
                      {surahHeader}
                      <div className={`p-4 rounded-lg ${isPreamble ? 'text-center' : 'border-b border-gray-200 dark:border-gray-700'}`}>
                          <p dir="rtl" className={`font-arabic ${ARABIC_FONT_SIZES[settings.arabicFontSize]}`} style={{ lineHeight: 2.0 }}>
                              {ayah.text}
                              {!isPreamble && <span className="text-2xl text-brand-green mx-2">{verseEndSymbol}</span>}
                          </p>
                          {settings.showTransliteration && (
                              <p className={`mt-3 font-mono text-gray-500 dark:text-gray-400 ${TRANSLITERATION_FONT_SIZES[settings.transliterationFontSize]}`}>
                                  {ayah.transliteration}
                              </p>
                          )}
                          <div className="flex justify-between items-center mt-4">
                            {settings.showTranslation && (
                                <p className={`text-gray-600 dark:text-gray-300 ${TRANSLATION_FONT_SIZES[settings.translationFontSize]}`}>
                                    {!isPreamble ? `${ayah.number}. ${ayah.translation}`: ayah.translation}
                                </p>
                            )}
                            {!isPreamble && ayah.audio && (
                                <button
                                    onClick={() => togglePlay(ayah)}
                                    className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-surface transition-colors"
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
                    </React.Fragment>
                );
            })}
        </div>
      </main>

       {isSettingsModalOpen && (
        <DisplaySettingsModal 
            onClose={() => setSettingsModalOpen(false)}
        />
      )}
    </div>
  );
};

export default ReadingView;