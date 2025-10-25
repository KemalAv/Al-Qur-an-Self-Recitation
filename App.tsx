import React, { useState, useEffect } from 'react';
import { Surah, Ayah, Mistake, Juz, MemorizationStats } from './types';
import { SURAHS } from './data/quranData';
import { JUZS } from './data/juzData';
import SurahList from './components/SurahList';
import ReadingView from './components/ReadingView';
import MemorizationView from './components/MemorizationView';
import AnalysisView from './components/AnalysisView';
import { ThemeProvider, useTheme, DisplaySettingsProvider, useDisplaySettings } from './hooks/useTheme';
import { Logo } from './components/Logo';

type View = 'LIST_VIEW' | 'READING' | 'MEMORIZING' | 'ANALYSIS';

const LoadingIndicator: React.FC = () => (
    <div className="flex flex-col items-center justify-center h-screen" aria-live="polite" aria-busy="true">
        <Logo className="w-20 h-20 text-blue-500 mb-6 animate-pulse" />
        <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-blue-500" role="status">
            <span className="sr-only">Loading...</span>
        </div>
        <p className="mt-4 text-lg font-semibold">Loading data...</p>
    </div>
);

const ErrorDisplay: React.FC<{ message: string, onRetry: () => void }> = ({ message, onRetry }) => (
    <div className="flex flex-col items-center justify-center h-screen text-center p-4">
        <Logo className="w-24 h-24 text-red-400 mb-4" />
        <h2 className="text-2xl font-bold text-red-500 mb-2">An Error Occurred</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md">{message}</p>
        <button onClick={onRetry} className="px-8 py-3 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold border border-blue-700 bg-gradient-to-b from-blue-400 to-blue-600 shadow-retro-md hover:shadow-retro-lg">
            Try Again
        </button>
    </div>
);

const AppContent: React.FC = () => {
    const [view, setView] = useState<View>('LIST_VIEW');
    const [selectedSurah, setSelectedSurah] = useState<Surah | null>(null);
    const [selectedJuz, setSelectedJuz] = useState<Juz | null>(null);
    const [ayahsData, setAyahsData] = useState<Ayah[] | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [startAyah, setStartAyah] = useState(1);
    const [analysisStats, setAnalysisStats] = useState<MemorizationStats | null>(null);
    const { theme, toggleTheme } = useTheme();
    const { settings } = useDisplaySettings();
    
    const isListView = view === 'LIST_VIEW';

    const BISMILLAH_ARABIC = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';
    const bismillahPreambleTemplate: Omit<Ayah, 'surah' | 'numberInQuran'> = {
        number: 0,
        text: BISMILLAH_ARABIC,
        translation: "In the name of Allah, the Entirely Merciful, the Especially Merciful.",
        transliteration: "Bismillāhir-raḥmānir-raḥīm",
        audio: ""
    };

    const fetchSurahData = async (surah: Surah) => {
        setIsLoading(true);
        setError(null);
        setAyahsData(null);
    
        try {
            const response = await fetch(`https://api.alquran.cloud/v1/surah/${surah.number}/editions/quran-uthmani,en.sahih,en.transliteration,${settings.reciter}`);
            if (!response.ok) throw new Error(`Failed to load data from the server. Status: ${response.status}`);
            const apiResponse = await response.json();
    
            if (apiResponse.code !== 200 || !apiResponse.data) throw new Error('Invalid API response format.');

            const uthmaniEdition = apiResponse.data.find((e: any) => e.edition.identifier === 'quran-uthmani');
            const translationEdition = apiResponse.data.find((e: any) => e.edition.identifier === 'en.sahih');
            const transliterationEdition = apiResponse.data.find((e: any) => e.edition.identifier === 'en.transliteration');
            const audioEdition = apiResponse.data.find((e: any) => e.edition.identifier === settings.reciter);
        
            if (!uthmaniEdition || !translationEdition || !transliterationEdition) throw new Error('API response does not contain the required text editions.');

            let arabicAyahs = uthmaniEdition.ayahs;
            const needsBismillahPreamble = surah.number !== 1 && surah.number !== 9;
            const finalAyahs: Ayah[] = [];
            
            if (needsBismillahPreamble) {
                const bismillahAyah: Ayah = {
                    ...bismillahPreambleTemplate,
                    numberInQuran: 0,
                    surah: { number: surah.number, name: surah.name, englishName: surah.englishName }
                };
                if (arabicAyahs.length > surah.numberOfAyahs || arabicAyahs[0]?.text.startsWith(BISMILLAH_ARABIC)) {
                    finalAyahs.push(bismillahAyah);
                    if (arabicAyahs.length > surah.numberOfAyahs) {
                        arabicAyahs = arabicAyahs.slice(1);
                    } else {
                         const correctedFirstAyah = { ...arabicAyahs[0] };
                         correctedFirstAyah.text = correctedFirstAyah.text.substring(BISMILLAH_ARABIC.length).trim();
                         arabicAyahs = [correctedFirstAyah, ...arabicAyahs.slice(1)];
                    }
                }
            }

            const surahAyahs = arabicAyahs.map((ayah: any, index: number) => ({
                number: ayah.numberInSurah,
                numberInQuran: ayah.number,
                surah: { number: surah.number, name: surah.name, englishName: surah.englishName },
                text: ayah.text,
                translation: translationEdition.ayahs[index]?.text ?? '',
                transliteration: transliterationEdition.ayahs[index]?.text ?? '',
                audio: audioEdition?.ayahs[index]?.audio ?? '',
            }));
            
            finalAyahs.push(...surahAyahs);
            setAyahsData(finalAyahs);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchJuzData = async (juz: Juz) => {
        setIsLoading(true);
        setError(null);
        setAyahsData(null);
        try {
            const editions = ['quran-uthmani', 'en.sahih', 'en.transliteration', settings.reciter];
            const responses = await Promise.all(
                editions.map(edition => fetch(`https://api.alquran.cloud/v1/juz/${juz.number}/${edition}`))
            );

            for (const response of responses) {
                if (!response.ok) {
                    throw new Error(`Failed to load data from the server. Status: ${response.status}`);
                }
            }

            const apiResponses = await Promise.all(responses.map(res => res.json()));

            for (const apiResponse of apiResponses) {
                 if (apiResponse.code !== 200 || !apiResponse.data || !apiResponse.data.ayahs) {
                    throw new Error('Invalid API response format.');
                }
            }
            
            const [uthmaniResponse, translationResponse, transliterationResponse, audioResponse] = apiResponses;

            const uthmaniAyahs = uthmaniResponse.data.ayahs;
            const translationAyahs = translationResponse.data.ayahs;
            const transliterationAyahs = transliterationResponse.data.ayahs;
            const audioAyahs = audioResponse.data.ayahs;

            if (uthmaniAyahs.length !== translationAyahs.length || uthmaniAyahs.length !== transliterationAyahs.length || uthmaniAyahs.length !== audioAyahs.length) {
                console.warn('Edition data is not synchronized. Audio may be affected.');
            }

            const finalAyahs: Ayah[] = [];
            let lastSurahNumber: number | null = null;

            for (let i = 0; i < uthmaniAyahs.length; i++) {
                const uthmaniAyah = uthmaniAyahs[i];
                const currentSurahNumber = uthmaniAyah.surah.number;
                let textForAyah = uthmaniAyah.text;

                if (currentSurahNumber !== lastSurahNumber) {
                    if (uthmaniAyah.numberInSurah === 1 && currentSurahNumber !== 1 && currentSurahNumber !== 9) {
                        finalAyahs.push({
                            ...bismillahPreambleTemplate,
                            numberInQuran: uthmaniAyah.number - 0.5, // Unique key for preamble
                            surah: {
                                number: currentSurahNumber,
                                name: uthmaniAyah.surah.name,
                                englishName: uthmaniAyah.surah.englishName,
                            }
                        });
                        
                        if (textForAyah.startsWith(BISMILLAH_ARABIC)) {
                           textForAyah = textForAyah.substring(BISMILLAH_ARABIC.length).trim();
                        }
                    }
                    lastSurahNumber = currentSurahNumber;
                }

                const combinedAyah: Ayah = {
                    number: uthmaniAyah.numberInSurah,
                    numberInQuran: uthmaniAyah.number,
                    surah: {
                        number: uthmaniAyah.surah.number,
                        name: uthmaniAyah.surah.name,
                        englishName: uthmaniAyah.surah.englishName,
                    },
                    text: textForAyah,
                    translation: translationAyahs[i]?.text ?? '',
                    transliteration: transliterationAyahs[i]?.text ?? '',
                    audio: audioAyahs[i]?.audio ?? '',
                };
                finalAyahs.push(combinedAyah);
            }
            setAyahsData(finalAyahs);
        } catch (err) {
             setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectSurah = (surah: Surah, mode: 'read' | 'memorize', startAyahNum: number = 1) => {
        setSelectedSurah(surah);
        setSelectedJuz(null);
        setView(mode === 'read' ? 'READING' : 'MEMORIZING');
        setStartAyah(startAyahNum);
        fetchSurahData(surah);
    };

    const handleSelectJuz = (juz: Juz, mode: 'read' | 'memorize') => {
        setSelectedJuz(juz);
        setSelectedSurah(null);
        setView(mode === 'memorize' ? 'MEMORIZING' : 'READING');
        fetchJuzData(juz);
    };

    const handleBackToMenu = () => {
        setView('LIST_VIEW');
        setSelectedSurah(null);
        setSelectedJuz(null);
        setAyahsData(null);
        setError(null);
        setAnalysisStats(null);
    };
    
    const handleSwitchToMemorization = () => {
        if (selectedSurah || selectedJuz) setView('MEMORIZING');
    };
    
    const handleSwitchToReading = () => {
        if (selectedSurah || selectedJuz) setView('READING');
    };

    const handleStartAnalysis = (stats: MemorizationStats) => {
        setAnalysisStats(stats);
        setView('ANALYSIS');
    };
    
    const renderView = () => {
        if (isLoading) return <LoadingIndicator />;
        if (error) {
            const retryAction = selectedSurah 
                ? () => fetchSurahData(selectedSurah)
                : selectedJuz 
                ? () => fetchJuzData(selectedJuz)
                : () => { setError(null); handleBackToMenu(); };
            return <ErrorDisplay message={error} onRetry={retryAction} />;
        }

        switch (view) {
            case 'READING':
                return (selectedSurah || selectedJuz) && ayahsData && (
                    <ReadingView 
                        title={selectedSurah ? selectedSurah.englishName : `Juz ${selectedJuz!.number}`}
                        isJuzMode={!!selectedJuz}
                        ayahs={ayahsData}
                        onBack={handleBackToMenu}
                        onSwitchToMemorization={handleSwitchToMemorization}
                    />
                );
            case 'MEMORIZING':
                return (selectedSurah || selectedJuz) && ayahsData && (
                     <MemorizationView
                        ayahs={ayahsData}
                        startAyah={selectedSurah ? startAyah : 1}
                        juzNumber={selectedJuz?.number}
                        onBack={handleBackToMenu}
                        onSwitchToReading={handleSwitchToReading}
                        onStartAnalysis={handleStartAnalysis}
                        isJuzMode={!!selectedJuz}
                    />
                );
            case 'ANALYSIS':
                return analysisStats && ayahsData && (
                    <AnalysisView
                        title={selectedSurah ? selectedSurah.englishName : `Juz ${selectedJuz!.number}`}
                        ayahs={ayahsData}
                        mistakes={analysisStats.mistakes}
                        onBack={handleBackToMenu}
                    />
                );
            case 'LIST_VIEW':
            default:
                return <SurahList surahs={SURAHS} juzs={JUZS} onSelectSurah={handleSelectSurah} onSelectJuz={handleSelectJuz} />;
        }
    };

    return (
        <div className={`min-h-screen transition-colors duration-300 ${theme === 'dark' ? 'retro-bg-dark text-dark-text' : 'retro-bg-light text-gray-800'}`}>
             <div className="absolute top-4 right-4 z-50">
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-md border border-gray-400 dark:border-gray-500 bg-gradient-to-b from-white to-gray-200 dark:from-dark-surface dark:to-dark-bg shadow-retro-md hover:shadow-retro-lg transition-all"
                    aria-label="Toggle theme"
                >
                    {theme === 'dark' ? '☀️' : '🌙'}
                </button>
            </div>
            <main className={isListView ? "container mx-auto px-4 pt-8 pb-20" : ""}>
                {renderView()}
            </main>
            {isListView && (
                <footer className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-sm text-center text-sm text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
                    InshaAllah, your support helps more people memorize the Qur’an 📖 → <a href="https://ko-fi.com/kemalavicennafaza" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-500 hover:underline">ko-fi.com/kemalavicennafaza</a>
                </footer>
            )}
        </div>
    );
};

const App: React.FC = () => (
    <ThemeProvider>
        <DisplaySettingsProvider>
            <AppContent />
        </DisplaySettingsProvider>
    </ThemeProvider>
);

export default App;
