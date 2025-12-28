import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Surah, Ayah, MemorizationStats, Mistake } from '../types';
import { BackIcon, ReadIcon, SettingsIcon, SpeakerIcon, PauseIcon } from './icons';
import MemorizationSummaryModal from './MemorizationSummaryModal';
import DisplaySettingsModal from './DisplaySettingsModal';
import { useDisplaySettings } from '../hooks/useTheme';
import { useLocalization } from '../hooks/useLocalization';

const ARABIC_FONT_SIZES = ['text-xl md:text-2xl', 'text-2xl md:text-3xl', 'text-3xl md:text-4xl', 'text-4xl md:text-5xl', 'text-5xl md:text-6xl', 'text-6xl md:text-7xl'];
const TRANSLATION_FONT_SIZES = ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl'];
const TRANSLITERATION_FONT_SIZES = ['text-[10px]', 'text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl'];


// Function to remove Arabic waqf (pause) marks and other annotations, including lam-alif ligatures
const cleanArabicText = (text: string) => text.replace(/[\u0610-\u061A\u06d6-\u06dc\u06de-\u06e8\uFEF5-\uFEFC]/g, '');

interface MemorizationViewProps {
  ayahs: Ayah[];
  startAyah: number;
  juzNumber?: number;
  isJuzMode: boolean;
  onBack: () => void;
  onSwitchToReading: () => void;
  onStartAnalysis: (stats: MemorizationStats) => void;
}

const toArabicNumeral = (n: number): string => {
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return String(n).split('').map(digit => arabicNumerals[parseInt(digit)]).join('');
};

const getWordsForAyah = (ayah: Ayah): string[] => {
    if (!ayah?.text) return [];
    const marksRegex = /([\u0610-\u061A\u06d6-\u06dc\u06de-\u06e8\uFEF5-\uFEFC])/g;
    const textWithSpaces = ayah.text.replace(marksRegex, ' $1 ');
    const originalWords = textWithSpaces.split(' ').filter(Boolean);
    return originalWords.filter(word => cleanArabicText(word).trim().length > 0);
};

const MemorizationView: React.FC<MemorizationViewProps> = ({ ayahs, startAyah, juzNumber, isJuzMode, onBack, onSwitchToReading, onStartAnalysis }) => {
  const { t } = useLocalization();
  
  const getInitialIndex = useMemo(() => () => {
      // In Juz mode, always start from the beginning of the passed ayahs.
      if (isJuzMode) return 0;
      
      // In Surah mode, if there's a preamble, always start the view there.
      const hasPreamble = ayahs[0]?.number === 0;
      if (hasPreamble) return 0;
      
      // If no preamble (Al-Fatihah, At-Tawbah), start at the requested verse.
      const initialIndex = ayahs.findIndex(a => a.number === startAyah);
      return initialIndex !== -1 ? initialIndex : 0;
  }, [ayahs, isJuzMode, startAyah]);

  const [currentAyahIndex, setCurrentAyahIndex] = useState(getInitialIndex());
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [totalWordsInSession, setTotalWordsInSession] = useState(0);

  const [furthestAyahIndex, setFurthestAyahIndex] = useState(getInitialIndex());
  const [furthestWordIndex, setFurthestWordIndex] = useState(0);
  const [sessionStartIndex, setSessionStartIndex] = useState(getInitialIndex());
  
  const [showSummary, setShowSummary] = useState(false);
  const [sessionStats, setSessionStats] = useState<MemorizationStats | null>(null);

  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
  const { settings } = useDisplaySettings();
  
  const [sessionStarted, setSessionStarted] = useState(false);

  const audioPlayer = useRef<HTMLAudioElement | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  useEffect(() => {
    const initialIndex = getInitialIndex();
    setCurrentAyahIndex(initialIndex);
    
    const hasPreamble = ayahs[0]?.number === 0;
    // The start screen should be shown if the session begins with a preamble.
    const shouldShowStartScreen = initialIndex === 0 && hasPreamble;

    setSessionStarted(!shouldShowStartScreen);
    setCurrentWordIndex(0);
    setMistakes([]);
    setShowSummary(false);
    setSessionStats(null);
    setFurthestAyahIndex(initialIndex);
    setFurthestWordIndex(0);
    setSessionStartIndex(initialIndex);
    setTotalWordsInSession(shouldShowStartScreen ? 0 : 1);
  }, [ayahs, isJuzMode, startAyah, getInitialIndex]);

  useEffect(() => {
    audioPlayer.current = new Audio();
    const player = audioPlayer.current;
    const onEnded = () => setIsAudioPlaying(false);
    player.addEventListener('ended', onEnded);
    return () => {
        player.pause();
        player.removeEventListener('ended', onEnded);
    };
  }, []);

  // Effect to stop audio when ayah changes
  useEffect(() => {
    audioPlayer.current?.pause();
    setIsAudioPlaying(false);
  }, [currentAyahIndex]);


  const forgotCount = useMemo(() => mistakes.filter(m => m.type === 'forgot').length, [mistakes]);
  const tajwidCount = useMemo(() => mistakes.filter(m => m.type === 'tajwid').length, [mistakes]);
  const mistakeMarkedForWord = useMemo(() => 
      mistakes.some(m => m.ayahIndex === currentAyahIndex && m.wordIndex === currentWordIndex), 
  [mistakes, currentAyahIndex, currentWordIndex]);

  const currentAyah = ayahs[currentAyahIndex];
  
  const { displayStructure, logicWords } = useMemo(() => {
    if (!currentAyah?.text) return { displayStructure: [], logicWords: [] };
    
    const marksRegex = /([\u0610-\u061A\u06d6-\u06dc\u06de-\u06e8\uFEF5-\uFEFC])/g;
    const textWithSpaces = currentAyah.text.replace(marksRegex, ' $1 ');
    const originalWords = textWithSpaces.split(' ').filter(Boolean);

    const logicWords: string[] = [];
    const displayStructure: { type: 'word' | 'waqf'; text: string; logicIndex: number }[] = [];
    let currentLogicIndex = -1; // Starts at -1 so first word is 0, and any preceding waqf is visible with it.

    for (const word of originalWords) {
        const cleanedWord = cleanArabicText(word);
        if (cleanedWord.trim().length === 0) {
            // It's a waqf mark, associate with the logic index of the preceding word.
            displayStructure.push({ type: 'waqf', text: word, logicIndex: currentLogicIndex });
        } else {
            // It's a word.
            currentLogicIndex++;
            logicWords.push(cleanedWord);
            displayStructure.push({ type: 'word', text: word, logicIndex: currentLogicIndex });
        }
    }
    return { displayStructure, logicWords };
  }, [currentAyah]);

  const currentAyahWords = logicWords;
  const displayedAyahNumber = currentAyah.number;
  const verseEndSymbol = (displayedAyahNumber > 0) ? `\u06dd${toArabicNumeral(displayedAyahNumber)}` : '';

  const currentAyahTransliterationWords = currentAyah.transliteration.split(' ');
  const currentAyahTranslationWords = currentAyah.translation.split(' ');
  const isLastWord = currentAyahIndex === ayahs.length - 1 && currentWordIndex === currentAyahWords.length - 1;

  const translationWordsToShow = currentAyahWords.length > 0 ? Math.ceil(((currentWordIndex + 1) / currentAyahWords.length) * currentAyahTranslationWords.length) : 0;
  const transliterationWordsToShow = currentAyahWords.length > 0 ? Math.ceil(((currentWordIndex + 1) / currentAyahWords.length) * currentAyahTransliterationWords.length) : 0;

  const handleStartMemorization = () => {
    // If session has started and we are on a preamble screen, advance to the next verse.
    if (sessionStarted) {
        const nextAyahIndex = currentAyahIndex + 1;
        if (nextAyahIndex < ayahs.length) {
            setCurrentAyahIndex(nextAyahIndex);
            setCurrentWordIndex(0);
            setTotalWordsInSession(prev => prev + 1);
            setFurthestAyahIndex(nextAyahIndex);
            setFurthestWordIndex(0);
        } else {
            endMemorizationSession();
        }
        return;
    }

    // Original logic for the very first start.
    const firstRealVerseIndex = ayahs.findIndex(a => a.number > 0);
    let verseToStartIndex = firstRealVerseIndex !== -1 ? firstRealVerseIndex : 0;

    if (!isJuzMode) {
        const requestedStartIndex = ayahs.findIndex(a => a.number === startAyah);
        if (requestedStartIndex !== -1) {
            verseToStartIndex = requestedStartIndex;
        }
    }
    
    setCurrentAyahIndex(verseToStartIndex);
    setCurrentWordIndex(0);
    setMistakes([]);
    setTotalWordsInSession(1);
    setSessionStarted(true);
    setFurthestAyahIndex(verseToStartIndex);
    setFurthestWordIndex(0);
    setSessionStartIndex(verseToStartIndex);
  };

  const handleNextWord = () => {
    const isAtFurthestProgress = currentAyahIndex === furthestAyahIndex && currentWordIndex === furthestWordIndex;
    const isLastWordInAyah = currentWordIndex >= currentAyahWords.length - 1;

    if (!isLastWordInAyah) {
        const nextWordIndex = currentWordIndex + 1;
        setCurrentWordIndex(nextWordIndex);
        if (isAtFurthestProgress) {
            setFurthestWordIndex(nextWordIndex);
            setTotalWordsInSession(prev => prev + 1);
        }
    } else {
        const nextAyahIndex = currentAyahIndex + 1;
        if (nextAyahIndex < ayahs.length) {
            setCurrentAyahIndex(nextAyahIndex);
            setCurrentWordIndex(0);
            if (isAtFurthestProgress) {
                setFurthestAyahIndex(nextAyahIndex);
                setFurthestWordIndex(0);
                if (ayahs[nextAyahIndex].number !== 0) {
                    setTotalWordsInSession(prev => prev + 1);
                }
            }
        } else {
            endMemorizationSession();
        }
    }
  };
  
  const handlePreviousWord = () => {
    if (currentAyahIndex === sessionStartIndex && currentWordIndex === 0) {
        return;
    }

    if (currentWordIndex > 0) {
        setCurrentWordIndex(prev => prev - 1);
    } else {
        const prevAyahIndex = currentAyahIndex - 1;
        if (prevAyahIndex >= 0) {
            const prevAyahWords = getWordsForAyah(ayahs[prevAyahIndex]);
            setCurrentAyahIndex(prevAyahIndex);
            setCurrentWordIndex(prevAyahWords.length - 1);
        }
    }
  };

  const addMistake = (type: 'forgot' | 'tajwid') => {
    if (mistakeMarkedForWord) return;

    const newMistake: Mistake = {
      ayahIndex: currentAyahIndex,
      wordIndex: currentWordIndex,
      type: type,
    };
    setMistakes(prev => [...prev, newMistake]);
  };

  const endMemorizationSession = () => {
    audioPlayer.current?.pause();
    const totalWords = totalWordsInSession;
    if (totalWords === 0) return;

    const totalMistakes = forgotCount + (tajwidCount * 0.5);
    const accuracy = Math.max(0, ((totalWords - totalMistakes) / totalWords) * 100);
    
    const stats: MemorizationStats = {
        totalWords: totalWords,
        forgotCount: forgotCount,
        tajwidCount: tajwidCount,
        accuracy: parseFloat(accuracy.toFixed(2)),
        mistakes: mistakes,
    };
    setSessionStats(stats);
    setShowSummary(true);
  };
  
  const resetSession = () => {
    setShowSummary(false);
    setSessionStats(null);
    const initialIndex = getInitialIndex();
    const hasPreamble = ayahs[0]?.number === 0;
    setCurrentAyahIndex(initialIndex);
    setCurrentWordIndex(0);
    setMistakes([]);
    const shouldShowStartScreen = initialIndex === 0 && hasPreamble;
    setSessionStarted(!shouldShowStartScreen);
    setFurthestAyahIndex(initialIndex);
    setFurthestWordIndex(0);
    setSessionStartIndex(initialIndex);
    setTotalWordsInSession(shouldShowStartScreen ? 0 : 1);
  };

  const toggleCurrentAyahAudio = () => {
    const player = audioPlayer.current;
    if (!player || !currentAyah?.audio) return;

    if (isAudioPlaying) {
        player.pause();
        setIsAudioPlaying(false);
    } else {
        player.src = currentAyah.audio;
        player.play().catch(e => console.error("Audio play failed", e));
        setIsAudioPlaying(true);
    }
  };

  const isPreambleScreen = !sessionStarted || (currentAyah && currentAyah.number === 0);
  const sessionTitle = isJuzMode ? `Juz ${juzNumber}` : ayahs.find(a => a.number !== 0)?.surah.englishName;
  
  const canMarkMistake = !mistakeMarkedForWord;
  const isAtSessionStart = currentAyahIndex === sessionStartIndex && currentWordIndex === 0;

  return (
    <div className="flex flex-col h-screen">
      <header className="flex-shrink-0 p-4 flex items-center justify-between border-b-2 border-gray-200 dark:border-gray-800 bg-gradient-to-b from-white/80 to-gray-100/80 dark:from-dark-surface/80 dark:to-dark-bg/80 backdrop-blur-sm shadow-retro-md z-10">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-dark-surface">
              <BackIcon className="w-6 h-6"/>
          </button>
          <div className="text-center">
              <h1 className="text-xl font-bold">{currentAyah.surah.englishName}</h1>
              <p className="text-gray-500 dark:text-gray-400">
                {isJuzMode ? `Juz ${juzNumber} | ` : ''}
                {currentAyah.number === 0 ? t('opening') : `${t('verse')} ${displayedAyahNumber}`}
              </p>
          </div>
          <div className="flex items-center space-x-2">
            <button 
                onClick={toggleCurrentAyahAudio} 
                disabled={!currentAyah?.audio}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-dark-surface disabled:opacity-50 disabled:cursor-not-allowed" 
                title={isAudioPlaying ? "Pause audio" : "Play audio"}
            >
                {isAudioPlaying ? <PauseIcon className="w-6 h-6 text-blue-500" /> : <SpeakerIcon className="w-6 h-6" />}
            </button>
            <button onClick={() => setSettingsModalOpen(true)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-dark-surface" title={t('settingsTitle')}>
                <SettingsIcon className="w-6 h-6"/>
            </button>
            <button onClick={onSwitchToReading} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-dark-surface" title={t('switchToReading')}>
                <ReadIcon className="w-6 h-6"/>
            </button>
          </div>
      </header>
      
      {sessionStarted && currentAyah.number !== 0 && (
        <div className="flex-shrink-0 p-2 flex justify-around text-center border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-dark-surface shadow-retro-inner">
            <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">🔴 {t('forgot')}</p>
                <p className="text-xl font-bold">{forgotCount}</p>
            </div>
            <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">🟡 {t('mistake')}</p>
                <p className="text-xl font-bold">{tajwidCount}</p>
            </div>
        </div>
      )}

      <div className="flex-grow flex flex-col items-center justify-start p-4 md:p-6 overflow-y-auto">
        {isPreambleScreen ? (
            <div className="text-center p-4 pt-8 md:pt-16">
                <p dir="rtl" className={`font-arabic mb-8 ${ARABIC_FONT_SIZES[settings.arabicFontSize]}`} style={{ lineHeight: 2.0 }}>
                    {currentAyah.text}
                </p>
                {settings.showTransliteration && <p className={`mt-4 font-mono text-gray-600 dark:text-gray-300 ${TRANSLITERATION_FONT_SIZES[settings.transliterationFontSize]}`}>{currentAyah.transliteration}</p>}
                {settings.showTranslation && <p className={`text-gray-700 dark:text-gray-200 mt-8 ${TRANSLATION_FONT_SIZES[settings.translationFontSize]}`}>"{currentAyah.translation}"</p>}
            </div>
        ) : (
             <div className="text-center pt-4 md:pt-8">
                <div dir="rtl" className={`font-arabic flex flex-wrap justify-center items-center gap-x-4 ${ARABIC_FONT_SIZES[settings.arabicFontSize]}`} style={{ lineHeight: 2.0 }}>
                {displayStructure.map((item, index) => {
                    const isVisible = item.logicIndex <= currentWordIndex;
                    
                    let mistakeClass = '';
                    if (item.type === 'word') {
                        const mistake = mistakes.find(m => m.ayahIndex === currentAyahIndex && m.wordIndex === item.logicIndex);
                        if (mistake) {
                            mistakeClass = mistake.type === 'forgot'
                                ? 'bg-red-200 text-red-900 dark:bg-red-800/50 dark:text-red-200 rounded px-1'
                                : 'bg-yellow-200 text-yellow-900 dark:bg-yellow-700/50 dark:text-yellow-200 rounded px-1';
                        }
                    }

                    return (
                        <span key={`${item.type}-${index}`} className={`${isVisible ? 'opacity-100' : 'opacity-10 blur'} transition-all duration-300 ${mistakeClass}`}>
                            {item.text}
                        </span>
                    );
                })}
                {currentWordIndex >= currentAyahWords.length - 1 && (
                     <span className="text-2xl text-brand-green mx-2 opacity-100">{verseEndSymbol}</span>
                )}
                </div>
                 {settings.showTransliteration && (
                    <p className={`mt-8 font-mono text-gray-500 dark:text-gray-400 ${TRANSLITERATION_FONT_SIZES[settings.transliterationFontSize]}`}>
                       {currentAyahTransliterationWords.slice(0, transliterationWordsToShow).join(' ')}
                    </p>
                )}
                 {settings.showTranslation && (
                    <p className={`mt-4 text-gray-600 dark:text-gray-300 ${TRANSLATION_FONT_SIZES[settings.translationFontSize]}`}>
                       "{currentAyahTranslationWords.slice(0, translationWordsToShow).join(' ')}..."
                    </p>
                )}
             </div>
        )}
      </div>

      <footer className="flex-shrink-0">
         {isPreambleScreen ? (
             <div className="p-4 bg-gray-100 dark:bg-dark-bg border-t-2 border-gray-200 dark:border-gray-800">
                  <button onClick={handleStartMemorization} className="w-full p-4 text-lg font-bold rounded-xl border border-green-700 bg-gradient-to-b from-green-400 to-green-600 text-white shadow-retro-lg hover:shadow-retro-xl transition-all transform hover:scale-[1.02]">
                    {t('startPractice')}
                </button>
             </div>
         ) : (
            <>
                <div className="flex-shrink-0 grid grid-cols-4 gap-2 md:gap-4 p-4 bg-gray-100 dark:bg-dark-bg border-t-2 border-gray-200 dark:border-gray-800 shadow-retro-inner">
                     <button 
                        onClick={handlePreviousWord}
                        disabled={isAtSessionStart}
                        className="p-3 text-base font-semibold rounded-lg border border-gray-400 bg-gradient-to-b from-gray-100 to-gray-200 text-gray-700 dark:from-gray-600 dark:to-gray-700 dark:text-gray-200 dark:border-gray-500 shadow-retro-md hover:shadow-retro-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                    >
                        {t('previousWord')}
                    </button>
                    <button 
                        onClick={() => addMistake('forgot')}
                        disabled={!canMarkMistake}
                        className="p-3 text-base font-semibold rounded-lg border border-red-700 bg-gradient-to-b from-red-300 to-red-500 text-white shadow-retro-md hover:shadow-retro-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                    >
                        🔴 {t('forgot')}
                    </button>
                    <button 
                        onClick={() => addMistake('tajwid')}
                        disabled={!canMarkMistake}
                        className="p-3 text-base font-semibold rounded-lg border border-yellow-600 bg-gradient-to-b from-yellow-300 to-yellow-500 text-white shadow-retro-md hover:shadow-retro-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                    >
                        🟡 {t('mistake')}
                    </button>
                    <button 
                        onClick={handleNextWord}
                        className="p-3 text-base font-semibold rounded-lg border border-blue-700 bg-gradient-to-b from-blue-400 to-blue-600 text-white shadow-retro-md hover:shadow-retro-lg transition-all transform hover:scale-105"
                    >
                        {isLastWord ? t('finish') : t('nextWord')}
                    </button>
                </div>
                <div className="text-center py-2 bg-gray-100 dark:bg-dark-bg">
                    <button onClick={endMemorizationSession} className="text-gray-500 dark:text-gray-400 hover:underline">
                        {t('endSessionEarly')}
                    </button>
                </div>
            </>
         )}
      </footer>

      {showSummary && sessionStats && (
        <MemorizationSummaryModal 
            stats={sessionStats}
            ayahs={ayahs}
            sessionTitle={sessionTitle ?? ''}
            isJuzMode={isJuzMode}
            startAyahNumber={startAyah}
            onRetry={resetSession}
            onAnalyze={() => onStartAnalysis(sessionStats)}
        />
      )}

      {isSettingsModalOpen && (
        <DisplaySettingsModal 
            onClose={() => setSettingsModalOpen(false)}
        />
      )}
    </div>
  );
};

export default MemorizationView;
