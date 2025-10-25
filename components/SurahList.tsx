import React, { useState, useMemo } from 'react';
import { Surah, Juz } from '../types';
import { SearchIcon, ReadIcon, MemorizeIcon } from './icons';
import { Logo } from './Logo';
import { useLocalization } from '../hooks/useLocalization';

interface SurahListProps {
  surahs: Surah[];
  juzs: Juz[];
  onSelectSurah: (surah: Surah, mode: 'read' | 'memorize', startAyah?: number) => void;
  onSelectJuz: (juz: Juz, mode: 'read' | 'memorize') => void;
}

const SurahListItem: React.FC<{ surah: Surah, onSelect: (surah: Surah) => void }> = ({ surah, onSelect }) => {
    const { t } = useLocalization();
    return (
        <li
          onClick={() => onSelect(surah)}
          className="p-4 bg-white dark:bg-dark-card rounded-lg border border-gray-300 dark:border-gray-700 shadow-retro-md hover:shadow-retro-lg dark:hover:bg-gray-700 transition-all duration-200 cursor-pointer flex items-center space-x-4"
        >
          <div className="flex-shrink-0 w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center font-bold text-base border border-gray-300 dark:border-gray-500">
            {surah.number}
          </div>
          <div className="flex-grow">
            <p className="font-bold text-lg text-gray-800 dark:text-dark-text">{surah.englishName}</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm">{surah.name}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-600 dark:text-gray-300">{surah.numberOfAyahs} {t('verses')}</p>
          </div>
        </li>
    );
};

const JuzListItem: React.FC<{ juz: Juz, onSelect: (juz: Juz) => void }> = ({ juz, onSelect }) => {
    const { t } = useLocalization();
    return (
        <li
          onClick={() => onSelect(juz)}
          className="p-4 bg-white dark:bg-dark-card rounded-lg border border-gray-300 dark:border-gray-700 shadow-retro-md hover:shadow-retro-lg dark:hover:bg-gray-700 transition-all duration-200 cursor-pointer flex items-center space-x-4"
        >
          <div className="flex-shrink-0 w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center font-bold text-base border border-gray-300 dark:border-gray-500">
            {juz.number}
          </div>
          <div className="flex-grow">
            <p className="font-bold text-lg text-gray-800 dark:text-dark-text">{juz.name}</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm">{t('part')} {juz.number}</p>
          </div>
        </li>
    );
};

const SurahList: React.FC<SurahListProps> = ({ surahs, juzs, onSelectSurah, onSelectJuz }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [listMode, setListMode] = useState<'surah' | 'juz'>('surah');
  const [selectedSurah, setSelectedSurah] = useState<Surah | null>(null);
  const [selectedJuz, setSelectedJuz] = useState<Juz | null>(null);
  const [memorizeMode, setMemorizeMode] = useState(false);
  const [startAyah, setStartAyah] = useState('1');
  const { t } = useLocalization();

  const filteredSurahs = useMemo(() => {
    if (!searchTerm) return surahs;
    const lowercasedFilter = searchTerm.toLowerCase();
    return surahs.filter(surah =>
      surah.englishName.toLowerCase().includes(lowercasedFilter) ||
      surah.name.toLowerCase().includes(lowercasedFilter) ||
      surah.number.toString().includes(lowercasedFilter)
    );
  }, [surahs, searchTerm]);

  const filteredJuzs = useMemo(() => {
      if (!searchTerm) return juzs;
      const lowercasedFilter = searchTerm.toLowerCase();
      return juzs.filter(j => 
        j.name.toLowerCase().includes(lowercasedFilter) ||
        j.number.toString().includes(lowercasedFilter)
      );
  }, [juzs, searchTerm]);

  const handleSelectSurah = (surah: Surah) => {
    setSelectedSurah(surah);
    setMemorizeMode(false);
    setStartAyah('1');
  };

  const handleSelectJuz = (juz: Juz) => {
    setSelectedJuz(juz);
  };
  
  const closeModal = () => {
    setSelectedSurah(null);
    setSelectedJuz(null);
  };

  const handleStartMemorization = () => {
      if (!selectedSurah) return;
      const startNum = parseInt(startAyah, 10);
      if (isNaN(startNum) || startNum < 1 || startNum > selectedSurah.numberOfAyahs) {
          alert(`Invalid verse number. Please enter a number between 1 and ${selectedSurah.numberOfAyahs}.`);
          return;
      }
      onSelectSurah(selectedSurah, 'memorize', startNum);
      closeModal();
  };
  
  const renderList = () => {
      if (listMode === 'surah') {
          return filteredSurahs.map(surah => <SurahListItem key={surah.number} surah={surah} onSelect={handleSelectSurah} />);
      }
      return filteredJuzs.map(juz => <JuzListItem key={juz.number} juz={juz} onSelect={handleSelectJuz} />);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <Logo className="w-14 h-14 text-gray-700 dark:text-gray-300 mx-auto mb-4" />
        <h1 className="text-3xl font-bold" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.1)' }}>{t('appName')}</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">{t('listSubtitle')}</p>
      </div>
      
      <div className="flex justify-center mb-8 p-1 rounded-full bg-gray-200 dark:bg-dark-surface border border-gray-300 dark:border-gray-600 shadow-retro-inner">
        <button onClick={() => setListMode('surah')} className={`w-1/2 py-2 px-4 rounded-full text-lg font-semibold transition-colors ${listMode === 'surah' ? 'bg-white dark:bg-dark-card shadow-retro-md text-blue-500' : 'text-gray-500'}`}>
            {t('bySurah')}
        </button>
        <button onClick={() => setListMode('juz')} className={`w-1/2 py-2 px-4 rounded-full text-lg font-semibold transition-colors ${listMode === 'juz' ? 'bg-white dark:bg-dark-card shadow-retro-md text-blue-500' : 'text-gray-500'}`}>
            {t('byJuz')}
        </button>
      </div>

      <div className="relative mb-8">
        <input
          type="text"
          placeholder={listMode === 'surah' ? t('searchSurah') : t('searchJuz')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 pl-10 text-base border-2 border-gray-300 dark:border-gray-600 rounded-full bg-gray-50 dark:bg-dark-surface focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-retro-inner"
        />
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
      </div>

      <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderList()}
      </ul>
      
      {selectedSurah && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={closeModal}>
            <div className="bg-gradient-to-b from-white to-gray-100 dark:from-dark-card dark:to-dark-surface rounded-2xl p-6 shadow-retro-xl text-center w-full max-w-xs border border-gray-300 dark:border-gray-700 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-2">{selectedSurah.englishName}</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">{selectedSurah.name}</p>
                
                {!memorizeMode ? (
                  <div className="space-y-4">
                       <button onClick={() => onSelectSurah(selectedSurah, 'read')} className="w-full flex items-center justify-center p-3 text-base font-semibold rounded-lg border border-blue-700 bg-gradient-to-b from-blue-400 to-blue-600 text-white shadow-retro-md hover:shadow-retro-lg transition-transform transform hover:scale-105">
                          <ReadIcon className="w-6 h-6 mr-3" />
                          {t('readThisSurah')}
                      </button>
                      <button onClick={() => setMemorizeMode(true)} className="w-full flex items-center justify-center p-3 text-base font-semibold rounded-lg border border-green-700 bg-gradient-to-b from-green-400 to-green-600 text-white shadow-retro-md hover:shadow-retro-lg transition-transform transform hover:scale-105">
                          <MemorizeIcon className="w-6 h-6 mr-3" />
                          {t('memorizeThisSurah')}
                      </button>
                  </div>
                ) : (
                  <div className="space-y-4 text-left">
                      <label htmlFor="startAyahInput" className="font-semibold text-gray-700 dark:text-gray-300">
                          {t('startFromVerse')}
                      </label>
                      <input
                          id="startAyahInput"
                          type="number"
                          min="1"
                          max={selectedSurah.numberOfAyahs}
                          value={startAyah}
                          onChange={(e) => setStartAyah(e.target.value)}
                          className="w-full p-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-surface focus:outline-none focus:ring-2 focus:ring-green-500 shadow-retro-inner"
                          autoFocus
                      />
                      <button onClick={handleStartMemorization} className="w-full p-3 text-base font-semibold rounded-lg border border-green-700 bg-gradient-to-b from-green-400 to-green-600 text-white shadow-retro-md hover:shadow-retro-lg transition-transform transform hover:scale-105">
                          {t('startMemorization')}
                      </button>
                      <button onClick={() => setMemorizeMode(false)} className="w-full py-2 text-gray-500 dark:text-gray-400 hover:underline">
                          {t('back')}
                      </button>
                  </div>
                )}
            </div>
        </div>
      )}
      {selectedJuz && (
           <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={closeModal}>
                <div className="bg-gradient-to-b from-white to-gray-100 dark:from-dark-card dark:to-dark-surface rounded-2xl p-6 shadow-retro-xl text-center w-full max-w-xs border border-gray-300 dark:border-gray-700 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                    <h2 className="text-2xl font-bold mb-2">{selectedJuz.name}</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">Select a mode for {t('part')} {selectedJuz.number}.</p>
                    <div className="space-y-4">
                        <button onClick={() => { onSelectJuz(selectedJuz, 'read'); closeModal(); }} className="w-full flex items-center justify-center p-3 text-base font-semibold rounded-lg border border-blue-700 bg-gradient-to-b from-blue-400 to-blue-600 text-white shadow-retro-md hover:shadow-retro-lg transition-transform transform hover:scale-105">
                            <ReadIcon className="w-6 h-6 mr-3" />
                            {t('readThisJuz')}
                        </button>
                        <button onClick={() => { onSelectJuz(selectedJuz, 'memorize'); closeModal(); }} className="w-full flex items-center justify-center p-3 text-base font-semibold rounded-lg border border-green-700 bg-gradient-to-b from-green-400 to-green-600 text-white shadow-retro-md hover:shadow-retro-lg transition-transform transform hover:scale-105">
                            <MemorizeIcon className="w-6 h-6 mr-3" />
                            {t('memorizeThisJuz')}
                        </button>
                    </div>
                </div>
            </div>
      )}
    </div>
  );
};

export default SurahList;