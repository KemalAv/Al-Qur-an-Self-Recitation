import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Ayah, Mistake, MemorizationStats } from '../types';
import { BackIcon, PlayIcon, PauseIcon, DownloadIcon } from './icons';
import { useDisplaySettings, useTheme } from '../hooks/useTheme';
import { useLocalization } from '../hooks/useLocalization';

interface AnalysisViewProps {
  title: string;
  ayahs: Ayah[];
  stats: MemorizationStats;
  onBack: () => void;
  isJuzMode: boolean;
  startAyahNumber: number;
}

const ARABIC_FONT_SIZES = ['text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl'];
const TRANSLITERATION_FONT_SIZES = ['text-[10px]', 'text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl'];
const TRANSLATION_FONT_SIZES = ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl'];


const toArabicNumeral = (n: number): string => {
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return String(n).split('').map(digit => arabicNumerals[parseInt(digit)]).join('');
};

// Function to remove Arabic waqf (pause) marks and other annotations, including lam-alif ligatures
const cleanArabicText = (text: string) => text.replace(/[\u0610-\u061A\u06d6-\u06dc\u06de-\u06e8\uFEF5-\uFEFC]/g, '');


const AnalysisView: React.FC<AnalysisViewProps> = ({ title, ayahs, stats, onBack, isJuzMode, startAyahNumber }) => {
    const { settings } = useDisplaySettings();
    const { theme } = useTheme();
    const [playingAyahKey, setPlayingAyahKey] = useState<number | null>(null);
    const audioPlayer = useRef<HTMLAudioElement | null>(null);
    const { t } = useLocalization();
    const [showToast, setShowToast] = useState(false);
    const { mistakes } = stats;

    const calculateScore = (stats: MemorizationStats): number => {
      const N = stats.totalWords;
      if (N === 0) return 0;
  
      const S = stats.tajwidCount; // Tajwid Mistake count
      const L = stats.forgotCount; // Forgot Mistake count
  
      const forgotWeight = 1.0;
      const tajwidWeight = 0.6;
  
      const weightedMistakes = (L * forgotWeight) + (S * tajwidWeight);
  
      if (weightedMistakes === 0) {
        return N;
      }
  
      const mistakeRatio = weightedMistakes / N;
      const brutalityFactor = 50;
      const scoreMultiplier = Math.exp(-brutalityFactor * mistakeRatio);
      const rawScore = N * scoreMultiplier;
      
      return Math.round(rawScore);
    };

    const getRank = (accuracy: number) => {
        if (accuracy === 100) return 'X';
        if (accuracy >= 99.5) return 'SSS';
        if (accuracy >= 99) return 'SS';
        if (accuracy >= 98) return 'S';
        if (accuracy >= 95) return 'A';
        if (accuracy >= 90) return 'B';
        if (accuracy >= 82.5) return 'C';
        if (accuracy >= 75) return 'D';
        return 'F';
    };

    const score = useMemo(() => calculateScore(stats), [stats]);
  
    useEffect(() => {
        audioPlayer.current = new Audio();
        const player = audioPlayer.current;

        const onEnded = () => setPlayingAyahKey(null);
        const onPause = () => {
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
    
    const handleSaveAndDownload = () => {
        const canvas = document.createElement('canvas');
        const scale = 2;
        const canvasWidth = 500;
        const padding = 40;
        const contentWidth = canvasWidth - (padding * 2);
        let currentY = 0;
        const marksRegex = /([\u0610-\u061A\u06d6-\u06dc\u06de-\u06e8\uFEF5-\uFEFC])/g;

        const tempCtx = canvas.getContext('2d')!;
        if (!tempCtx) return;

        let mistakesHeight = 0;
        const mistakesByAyah = stats.mistakes.reduce((acc, mistake) => {
          const ayahWithMistake = ayahs[mistake.ayahIndex];
          if (ayahWithMistake && ayahWithMistake.number !== 0) {
             if (!acc[mistake.ayahIndex]) {
                acc[mistake.ayahIndex] = [];
            }
            acc[mistake.ayahIndex].push(mistake);
          }
          return acc;
        }, {} as Record<number, Mistake[]>);

        const hasMistakes = Object.keys(mistakesByAyah).length > 0;
        if (hasMistakes) {
          mistakesHeight += 70;
        }

        for (const ayahIndexStr in mistakesByAyah) {
          const ayahIndex = parseInt(ayahIndexStr, 10);
          const ayah = ayahs[ayahIndex];
          if (!ayah) continue;

          mistakesHeight += 40; 
          
          tempCtx.font = `22px Amiri, serif`;
          const textWithSpaces = ayah.text.replace(marksRegex, ' $1 ');
          const words = textWithSpaces.split(' ').filter(w => cleanArabicText(w).trim().length > 0);

          if (words.length === 0) {
            mistakesHeight += 20;
            continue;
          }
          
          let lines = 1;
          let currentLineWidth = 0;
          const spaceWidth = tempCtx.measureText(' ').width;

          for (const word of words) {
            const wordWidth = tempCtx.measureText(word).width;
            if (currentLineWidth + wordWidth + (currentLineWidth > 0 ? spaceWidth : 0) > contentWidth) {
              lines++;
              currentLineWidth = wordWidth;
            } else {
              currentLineWidth += wordWidth + (currentLineWidth > 0 ? spaceWidth : 0);
            }
          }

          mistakesHeight += (lines * 35) + 20;
        }

        const baseHeight = 720; // Increased to accommodate Rank
        const totalHeight = baseHeight + mistakesHeight;

        canvas.width = canvasWidth * scale;
        canvas.height = totalHeight * scale;
        const ctx = canvas.getContext('2d')!;
        ctx.scale(scale, scale);

        const isDark = theme === 'dark';
        ctx.fillStyle = isDark ? '#2A2A2A' : '#FFFFFF';
        ctx.fillRect(0, 0, canvasWidth, totalHeight);
        
        currentY = 60;
        ctx.font = 'bold 28px Inter, sans-serif';
        ctx.fillStyle = isDark ? '#E0E0E0' : '#1F2937';
        ctx.textAlign = 'center';
        ctx.fillText(t('summaryTitle'), canvasWidth / 2, currentY);
        
        currentY += 40;
        let sessionDetails = '';
        const sessionAyahs = ayahs.filter(a => a.number !== 0);
        if (isJuzMode) {
            const firstAyah = sessionAyahs[0];
            const lastAyah = sessionAyahs[sessionAyahs.length - 1];
            if(firstAyah && lastAyah) {
                sessionDetails = `From ${firstAyah.surah.englishName} ${firstAyah.number} to ${lastAyah.surah.englishName} ${lastAyah.number}`;
            }
        } else {
            const lastAyahNumber = sessionAyahs[sessionAyahs.length - 1]?.number;
            if (lastAyahNumber) {
                sessionDetails = `${t('verse')} ${startAyahNumber} - ${lastAyahNumber}`;
            }
        }
        ctx.font = 'bold 20px Inter, sans-serif';
        ctx.fillText(title, canvasWidth / 2, currentY);
        currentY += 25;
        ctx.font = '16px Inter, sans-serif';
        ctx.fillStyle = isDark ? '#9CA3AF' : '#6B7280';
        ctx.fillText(sessionDetails, canvasWidth / 2, currentY);

        currentY += 50;
        ctx.font = '18px Inter, sans-serif';
        ctx.fillText(t('scoreLabel'), canvasWidth/2, currentY);
        currentY += 80;
        ctx.font = 'bold 80px Inter, sans-serif';
        ctx.fillStyle = '#3B82F6';
        ctx.fillText(score.toString(), canvasWidth/2, currentY);

        // Draw Rank
        currentY += 30;
        const rank = getRank(stats.accuracy);
        let rankColor = '#6B7280'; // Default gray
        if (rank === 'X') rankColor = '#9333EA'; // Purple
        else if (rank.includes('S')) rankColor = '#F59E0B'; // Yellow/Gold
        else if (rank === 'A') rankColor = '#22C55E'; // Green
        else if (rank === 'B') rankColor = '#3B82F6'; // Blue
        else if (rank === 'C') rankColor = '#F97316'; // Orange
        else if (rank === 'D') rankColor = '#EF4444'; // Red

        ctx.font = 'bold 16px Inter, sans-serif';
        ctx.fillStyle = isDark ? '#9CA3AF' : '#6B7280';
        ctx.fillText(t('rankLabel').toUpperCase(), canvasWidth / 2, currentY);
        currentY += 50;
        ctx.font = 'bold 50px Inter, sans-serif';
        ctx.fillStyle = rankColor;
        ctx.fillText(rank, canvasWidth / 2, currentY);

        currentY += 50;
        ctx.font = 'bold 22px Inter, sans-serif';
        ctx.fillStyle = stats.accuracy > 80 ? '#22C55E' : '#F59E0B';
        ctx.fillText(`${stats.accuracy}% ${t('accuracyLabel')}`, canvasWidth / 2, currentY);

        currentY += 80;
        const col1X = 130, col2X = 250, col3X = 370;
        ctx.font = '16px Inter, sans-serif';
        ctx.fillStyle = isDark ? '#9CA3AF' : '#6B7280';
        ctx.fillText(t('totalWordsLabel'), col1X, currentY);
        ctx.fillText(`🔴 ${t('forgot')}`, col2X, currentY);
        ctx.fillText(`🟡 ${t('mistake')}`, col3X, currentY);
        currentY += 40;
        ctx.font = 'bold 36px Inter, sans-serif';
        ctx.fillStyle = isDark ? '#E0E0E0' : '#1F2937';
        ctx.fillText(stats.totalWords.toString(), col1X, currentY);
        ctx.fillStyle = '#EF4444';
        ctx.fillText(stats.forgotCount.toString(), col2X, currentY);
        ctx.fillStyle = '#F59E0B';
        ctx.fillText(stats.tajwidCount.toString(), col3X, currentY);
        currentY += 60;
        
        if (hasMistakes) {
            ctx.beginPath();
            ctx.moveTo(padding, currentY);
            ctx.lineTo(canvasWidth - padding, currentY);
            ctx.strokeStyle = isDark ? '#4B5563' : '#E5E7EB';
            ctx.lineWidth = 1;
            ctx.stroke();
            currentY += 40;
            ctx.font = 'bold 20px Inter, sans-serif';
            ctx.fillStyle = isDark ? '#E0E0E0' : '#1F2937';
            ctx.fillText(t('analysisTitle'), canvasWidth / 2, currentY);
            currentY += 40;

            for (const ayahIndexStr in mistakesByAyah) {
                const ayahIndex = parseInt(ayahIndexStr, 10);
                const ayah = ayahs[ayahIndex];
                const mistakesForThisAyah = mistakesByAyah[ayahIndex];
                
                ctx.font = 'bold 16px Inter, sans-serif';
                ctx.fillStyle = isDark ? '#E0E0E0' : '#1F2937';
                ctx.textAlign = 'left';
                ctx.fillText(`${ayah.surah.englishName}, ${t('verse')} ${ayah.number}`, padding, currentY);
                currentY += 30;

                const textWithSpacesForRendering = ayah.text.replace(marksRegex, ' $1 ');
                const originalWords = textWithSpacesForRendering.split(' ').filter(Boolean);

                const itemsToRender: { text: string; mistake?: Mistake }[] = [];
                let currentLogicIndex = 0;
                for (const word of originalWords) {
                    const cleanedWord = cleanArabicText(word).trim();
                    let mistake;
                    if (cleanedWord.length > 0) {
                        mistake = mistakesForThisAyah.find(m => m.wordIndex === currentLogicIndex);
                        itemsToRender.push({ text: word, mistake });
                        currentLogicIndex++;
                    } else {
                        itemsToRender.push({ text: word });
                    }
                }

                ctx.font = '22px Amiri, serif';
                ctx.textAlign = 'right';
                const spaceWidth = ctx.measureText(' ').width;

                const linesOfItems: (typeof itemsToRender)[] = [];
                let currentLine: typeof itemsToRender = [];
                let currentLineWidth = 0;

                for (const item of itemsToRender) {
                    const wordWidth = ctx.measureText(item.text).width;
                    if (currentLineWidth + wordWidth + (currentLine.length > 0 ? spaceWidth : 0) > contentWidth) {
                        linesOfItems.push(currentLine);
                        currentLine = [item];
                        currentLineWidth = wordWidth;
                    } else {
                        currentLine.push(item);
                        currentLineWidth += wordWidth + (currentLine.length > 1 ? spaceWidth : 0);
                    }
                }
                if (currentLine.length > 0) {
                    linesOfItems.push(currentLine);
                }

                for (const line of linesOfItems) {
                    let currentX = canvasWidth - padding;
                    for (const wordToDraw of line) {
                        const width = ctx.measureText(wordToDraw.text).width;
                        
                        if (wordToDraw.mistake) {
                            ctx.fillStyle = wordToDraw.mistake.type === 'forgot' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)';
                            ctx.fillRect(currentX - width, currentY - 22, width, 28);
                        }

                        ctx.fillStyle = isDark ? '#E0E0E0' : '#1F2937';
                        ctx.fillText(wordToDraw.text, currentX, currentY);
                        currentX -= (width + spaceWidth);
                    }
                    currentY += 35;
                }
                currentY += 20;
            }
        }

        ctx.font = '12px Inter, sans-serif';
        ctx.fillStyle = isDark ? '#6B7280' : '#9CA3AF';
        ctx.textAlign = 'center';
        ctx.fillText(t('appName'), canvasWidth / 2, totalHeight - 30);
        
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, -5);
        link.download = `quran-summary-${timestamp}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.9);
        link.click();
        
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      };
    
    return (
        <div className="flex flex-col h-screen">
            <header className="flex-shrink-0 p-4 flex items-center justify-between border-b-2 border-gray-200 dark:border-gray-800 bg-gradient-to-b from-white/80 to-gray-100/80 dark:from-dark-surface/80 dark:to-dark-bg/80 backdrop-blur-sm shadow-retro-md z-10 sticky top-0">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-dark-surface" aria-label={t('back')}>
                    <BackIcon className="w-6 h-6"/>
                </button>
                <div className="text-center">
                    <h1 className="text-xl font-bold">{title}</h1>
                    <p className="text-gray-500 dark:text-gray-400">{t('analysisTitle')}</p>
                </div>
                <div className="w-10" />
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
                            const marksRegex = /([\u0610-\u061A\u06d6-\u06dc\u06de-\u06e8\uFEF5-\uFEFC])/g;
                            const textWithSpaces = ayah.text.replace(marksRegex, ' $1 ');
                            const originalWords = textWithSpaces.split(' ').filter(Boolean);

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

            <footer className="flex-shrink-0 p-4 bg-gray-100 dark:bg-dark-bg border-t-2 border-gray-200 dark:border-gray-800 shadow-retro-inner">
                <button
                    onClick={handleSaveAndDownload}
                    className="w-full flex items-center justify-center p-4 text-lg font-semibold rounded-lg border border-blue-700 bg-gradient-to-b from-blue-400 to-blue-600 text-white shadow-retro-md hover:shadow-retro-lg transition-transform transform hover:scale-105"
                >
                    <DownloadIcon className="w-6 h-6 mr-3" />
                    {t('saveAndDownload')}
                </button>
            </footer>

            {showToast && (
                <div className="fixed bottom-28 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-full shadow-lg transition-opacity duration-300 animate-pulse">
                    {t('summaryDownloaded')}
                </div>
            )}
        </div>
    );
};

export default AnalysisView;
