import React, { useState, useMemo } from 'react';
import { MemorizationStats, Ayah, Mistake } from '../types';
import { useTheme } from '../hooks/useTheme';
import { useLocalization } from '../hooks/useLocalization';

interface MemorizationSummaryModalProps {
  stats: MemorizationStats;
  ayahs: Ayah[];
  sessionTitle: string;
  isJuzMode: boolean;
  startAyahNumber: number;
  onRetry: () => void;
  onAnalyze: () => void;
}

const cleanArabicText = (text: string) => text.replace(/[\u06d6-\u06dc\u06de]/g, '');

const MemorizationSummaryModal: React.FC<MemorizationSummaryModalProps> = ({ stats, ayahs, sessionTitle, isJuzMode, startAyahNumber, onRetry, onAnalyze }) => {
  const [isSaved, setIsSaved] = useState(false);
  const { theme } = useTheme();
  const { t } = useLocalization();

  const calculateScore = (stats: MemorizationStats): number => {
    const N = stats.totalWords;
    if (N === 0) return 0;

    const S = stats.tajwidCount; // Tajwid Mistake count
    const L = stats.forgotCount; // Forgot Mistake count

    // Define weights for different mistake types. Forgetting a word is more severe.
    const forgotWeight = 1.0;
    const tajwidWeight = 0.6;

    // Calculate a single weighted mistake value.
    const weightedMistakes = (L * forgotWeight) + (S * tajwidWeight);

    // If there are no mistakes, the score is perfect.
    if (weightedMistakes === 0) {
      return N;
    }

    const mistakeRatio = weightedMistakes / N;

    // A "brutality" constant that determines the steepness of the score drop-off.
    // This value is tuned to create a more aggressive penalty curve.
    const brutalityFactor = 50;

    // The score decays exponentially based on the mistake ratio.
    // This creates a "brutal" system where penalties accelerate as mistakes increase.
    const scoreMultiplier = Math.exp(-brutalityFactor * mistakeRatio);
    
    const rawScore = N * scoreMultiplier;
    
    return Math.round(rawScore);
  };

  const score = useMemo(() => calculateScore(stats), [stats]);

  const handleSaveAndDownload = () => {
    const canvas = document.createElement('canvas');
    const scale = 2;
    const canvasWidth = 500;
    const padding = 40;
    const contentWidth = canvasWidth - (padding * 2);
    let currentY = 0;

    const tempCtx = canvas.getContext('2d')!;
    if (!tempCtx) return;

    // --- Pre-calculate dynamic height ---
    let mistakesHeight = 0;
    const mistakesByAyah = stats.mistakes.reduce((acc, mistake) => {
      const ayahWithMistake = ayahs[mistake.ayahIndex];
      if (ayahWithMistake && ayahWithMistake.number !== 0) { // Exclude preambles
         if (!acc[mistake.ayahIndex]) {
            acc[mistake.ayahIndex] = [];
        }
        acc[mistake.ayahIndex].push(mistake);
      }
      return acc;
    }, {} as Record<number, Mistake[]>);

    const hasMistakes = Object.keys(mistakesByAyah).length > 0;
    if (hasMistakes) {
      mistakesHeight += 70; // For "Mistakes Review" title and padding
    }

    for (const ayahIndexStr in mistakesByAyah) {
      const ayahIndex = parseInt(ayahIndexStr, 10);
      const ayah = ayahs[ayahIndex];
      if (!ayah) continue;

      mistakesHeight += 40; // Space for ayah header (Surah X: Ayah Y)
      
      tempCtx.font = `22px Amiri, serif`;
      const words = ayah.text.split(' ').filter(w => cleanArabicText(w).trim().length > 0);
      if (words.length === 0) {
        mistakesHeight += 20; // Margin
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

      mistakesHeight += (lines * 35) + 20; // (lines * line height) + bottom margin
    }

    const baseHeight = 580;
    const totalHeight = baseHeight + mistakesHeight;

    canvas.width = canvasWidth * scale;
    canvas.height = totalHeight * scale;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(scale, scale);

    // --- Drawing ---
    const isDark = theme === 'dark';
    ctx.fillStyle = isDark ? '#2A2A2A' : '#FFFFFF';
    ctx.fillRect(0, 0, canvasWidth, totalHeight);
    
    currentY = 60;
    ctx.font = 'bold 28px Inter, sans-serif';
    ctx.fillStyle = isDark ? '#E0E0E0' : '#1F2937';
    ctx.textAlign = 'center';
    ctx.fillText(`📊 ${t('summaryTitle')}`, canvasWidth / 2, currentY);
    
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
    ctx.fillText(sessionTitle, canvasWidth / 2, currentY);
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
    currentY += 40;
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

            const originalWords = ayah.text.split(' ');
            const logicItems: { text: string; logicIndex: number; mistake?: Mistake }[] = [];
            let logicIndex = 0;
            for(const word of originalWords) {
                if (cleanArabicText(word).trim().length > 0) {
                    const mistake = mistakesForThisAyah.find(m => m.wordIndex === logicIndex);
                    logicItems.push({ text: word, logicIndex, mistake });
                    logicIndex++;
                }
            }
            
            ctx.font = '22px Amiri, serif';
            ctx.textAlign = 'right';
            const spaceWidth = ctx.measureText(' ').width;

            const linesOfItems: (typeof logicItems)[] = [];
            let currentLine: typeof logicItems = [];
            let currentLineWidth = 0;

            for (const item of logicItems) {
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
                currentY += 35; // Move to next line
            }
            currentY += 20; // Space after ayah
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
    
    setIsSaved(true);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-b from-white to-gray-100 dark:from-dark-card dark:to-dark-surface rounded-2xl p-6 shadow-retro-xl w-full max-w-sm text-center transform transition-all scale-100 opacity-100 border border-gray-300 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
        {isSaved ? (
             <div className="p-4">
                <p className="text-5xl mb-4">صَدَقَ اللهُ اْلعَظِيْمُ</p>
                <h2 className="text-2xl font-bold mb-2">{t('scoreSaved')}</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-8">{t('scoreSavedSubtitle')}</p>
                <div className="space-y-4">
                     <button
                        onClick={onAnalyze}
                        className="w-full p-4 text-lg font-semibold rounded-lg border border-green-700 bg-gradient-to-b from-green-400 to-green-600 text-white shadow-retro-md hover:shadow-retro-lg transition-transform transform hover:scale-105"
                    >
                        📊 {t('analyzeRecitation')}
                    </button>
                    <button
                        onClick={onRetry}
                        className="w-full py-3 text-lg font-semibold rounded-lg border border-gray-400 bg-gradient-to-b from-gray-100 to-gray-200 text-gray-700 dark:from-gray-600 dark:to-gray-700 dark:text-gray-200 dark:border-gray-500 shadow-retro-md hover:shadow-retro-lg transition-transform transform hover:scale-105"
                    >
                        {t('retryPractice')}
                    </button>
                </div>
            </div>
        ) : (
          <>
            <h2 className="text-3xl font-bold mb-2">📊 {t('summaryTitle')}</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">{t('summarySubtitle')}</p>

            <div className="my-8 p-6 bg-gray-100 dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-gray-600 shadow-retro-inner">
                <p className="text-lg text-gray-500 dark:text-gray-400">{t('scoreLabel')}</p>
                <p className="text-7xl font-bold text-blue-500 my-2">{score}</p>
                <p className={`text-xl font-semibold ${stats.accuracy > 80 ? 'text-green-500' : 'text-yellow-500'}`}>{stats.accuracy}% {t('accuracyLabel')}</p>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-center my-8">
                <div>
                    <p className="text-gray-500 dark:text-gray-400">{t('totalWordsLabel')}</p>
                    <p className="text-3xl font-bold">{stats.totalWords}</p>
                </div>
                <div>
                    <p className="text-gray-500 dark:text-gray-400">🔴 {t('forgot')}</p>
                    <p className="text-3xl font-bold text-red-500">{stats.forgotCount}</p>
                </div>
                <div>
                    <p className="text-gray-500 dark:text-gray-400">🟡 {t('mistake')}</p>
                    <p className="text-3xl font-bold text-yellow-500">{stats.tajwidCount}</p>
                </div>
            </div>

            <button
                onClick={handleSaveAndDownload}
                className="w-full p-4 text-lg font-semibold rounded-lg border border-blue-700 bg-gradient-to-b from-blue-400 to-blue-600 text-white shadow-retro-md hover:shadow-retro-lg transition-transform transform hover:scale-105"
            >
                💾 {t('saveAndDownload')}
            </button>
             <button
                onClick={onRetry}
                className="mt-4 text-gray-500 dark:text-gray-400 hover:underline"
            >
                {t('practiceAgain')}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default MemorizationSummaryModal;