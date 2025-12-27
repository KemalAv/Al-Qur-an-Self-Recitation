import React, { useMemo } from 'react';
import { MemorizationStats, Ayah } from '../types';
import { useLocalization } from '../hooks/useLocalization';

interface MemorizationSummaryModalProps {
  stats: MemorizationStats;
  onRetry: () => void;
  onAnalyze: () => void;
}

const MemorizationSummaryModal: React.FC<MemorizationSummaryModalProps> = ({ stats, onRetry, onAnalyze }) => {
  const { t } = useLocalization();

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

  const score = useMemo(() => calculateScore(stats), [stats]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-b from-white to-gray-100 dark:from-dark-card dark:to-dark-surface rounded-2xl p-6 shadow-retro-xl w-full max-w-sm text-center transform transition-all scale-100 opacity-100 border border-gray-300 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
          <>
            <h2 className="text-4xl font-bold mb-2">{t('summaryTitle')}</h2>
            <p className="text-2xl font-arabic my-4">صَدَقَ اللهُ اْلعَظِيْمُ</p>

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
                onClick={onAnalyze}
                className="w-full p-4 text-lg font-semibold rounded-lg border border-blue-700 bg-gradient-to-b from-blue-400 to-blue-600 text-white shadow-retro-md hover:shadow-retro-lg transition-transform transform hover:scale-105"
            >
                📊 {t('analyzeRecitation')}
            </button>
             <button
                onClick={onRetry}
                className="mt-4 text-gray-500 dark:text-gray-400 hover:underline"
            >
                {t('practiceAgain')}
            </button>
          </>
      </div>
    </div>
  );
};

export default MemorizationSummaryModal;