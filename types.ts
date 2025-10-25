export type Language = 'en' | 'id' | 'es';

export interface Surah {
  number: number;
  name: string;
  englishName: string;
  numberOfAyahs: number;
}

export interface Ayah {
  number: number; // numberInSurah
  numberInQuran: number;
  surah: {
    number: number;
    name: string; // Arabic name
    englishName: string;
  };
  text: string;
  translation: string;
  transliteration: string;
  audio: string;
}

export interface DisplaySettings {
    showTransliteration: boolean;
    showTranslation: boolean;
    arabicFontSize: number; // Scale 0-5
    translationFontSize: number; // Scale 0-5
    transliterationFontSize: number; // Scale 0-5
    reciter: string; // e.g. 'ar.alafasy'
    language: Language;
    translationIdentifier: string;
}

export interface Mistake {
  ayahIndex: number;
  wordIndex: number;
  type: 'forgot' | 'tajwid';
}

export interface MemorizationStats {
    totalWords: number;
    forgotCount: number;
    tajwidCount: number;
    accuracy: number;
    mistakes: Mistake[];
}

export interface Juz {
  number: number;
  name: string;
}