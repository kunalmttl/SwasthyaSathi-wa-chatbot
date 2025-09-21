// services.js
import { translate } from '@vitalets/google-translate-api';

/**
 * A mapping from the IndicTrans2 codes (stored in Supabase)
 * to the simple ISO 639-1 codes that Google Translate uses.
 */
const GOOGLE_LANG_CODE_MAP = {
  'hin_Deva': 'hi',
  'eng_Latn': 'en',
  'ory_Orya': 'or',
  'ben_Beng': 'bn'
  // Add any other languages you support here
};

/**
 * Translates text using the Google Translate API.
 * It automatically maps our stored language codes to Google's format.
 * @param {string} text The text to translate.
 * @param {string} sourceLang The source language code from our DB (e.g., 'hin_Deva').
 * @param {string} targetLang The target language code from our DB (e.g., 'eng_Latn').
 * @returns {Promise<string>} The translated text.
 */
export async function translateText(text, sourceLang, targetLang) {
  // If no text or languages are the same, no need to call the API
  if (!text || sourceLang === targetLang) {
    return text;
  }

  // Convert our internal codes to Google's codes
  const fromLang = GOOGLE_LANG_CODE_MAP[sourceLang] || 'auto'; // Default to auto-detect
  const toLang = GOOGLE_LANG_CODE_MAP[targetLang];

  if (!toLang) {
    console.error(`Google Translate code not found for: ${targetLang}`);
    return text; // Return original text if target language is not mapped
  }

  try {
    console.log(`Translating from ${fromLang} to ${toLang} using Google Translate...`);
    
    const result = await translate(text, { from: fromLang, to: toLang });
    
    console.log(`Translation successful: "${result.text}"`);
    return result.text;

  } catch (error) {
    console.error('Google Translate error:', error);
    // On error, return the original text to prevent the app from crashing
    return text;
  }
}