// services.js
import { translate } from '@vitalets/google-translate-api';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();


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

  const fromLang = sourceLang;
  const toLang = targetLang;

  try 
  {
    console.log(`Translating from ${fromLang} to ${toLang} using Google Translate...`);
    
    const result = await translate(text, { from: fromLang, to: toLang });
    
    console.log(`Translation successful: "${result.text}"`);
    return result.text;

  } 
  catch (error) 
  {
    console.error('Google Translate error:', error);
    // On error, return the original text to prevent the app from crashing
    return text;
  }
}


const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

/**
 * Gets a detailed medical analysis from the Perplexity API.
 * @param {string} userQuery The user's health query, translated to English.
 * @param {object} userProfile The user's profile data from Supabase.
 * @returns {Promise<string>} The AI-generated analysis.
 */
export async function getPerplexityAnalysis(userQuery, userProfile) 
{
  const API_URL = "https://api.perplexity.ai/chat/completions";

  const systemPrompt = `
You are SwasthyaSathi, an expert AI medical analysis assistant. Your role is to analyze a user's health query based on their provided profile and give a structured, safe, and helpful response.

**User Profile for Context:**
- **Name:** ${userProfile.full_name || 'Not provided'}
- **Age:** ${userProfile.age || 'Not provided'}
- **Gender:** ${userProfile.gender || 'Not provided'}
- **Location:** ${userProfile.city || ''}, ${userProfile.state || ''}
- **Chronic Conditions:** ${userProfile.chronic_conditions?.join(', ') || 'None'}

**Your Task:**
Based on the user's query, you MUST provide an analysis in the following strict format. Do not add any extra conversational text before or after this structure.

**Severity Flag:** [Provide one: Low, Medium, High, or Critical]
**Potential Issue:** [Describe the possible medical issue(s) concisely. Use simple terms.]
**Recommended Actions:** [Provide a clear, numbered list of safe, next steps. Always prioritize when to consult a doctor.]
**First-Aid / Home Remedies:** [Suggest ONLY safe, common, and widely accepted remedies if applicable. If none are safe or appropriate, state "Please consult a doctor for treatment advice."]

**Crucial Final Instruction:**
You MUST end your entire response with the following disclaimer, exactly as written:
"Disclaimer: This is AI-generated advice and not a substitute for professional medical consultation. Please see a doctor for an accurate diagnosis."
  `;

  const payload = 
  {
    model: "sonar",
    messages: [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: userQuery 
      }
    ],
    max_tokens: 1024,
    temperature: 0.4 
  };

  const headers = 
  {
    Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
    'Content-Type': 'application/json',
  };

  try 
  {
    console.log("Querying Perplexity API...");
    const response = await axios.post(API_URL, payload, { headers });
    const analysis = response.data.choices[0].message.content;
    console.log("Perplexity analysis received successfully.");
    return analysis;
  } catch (error) {
    console.error('Perplexity API error:', error.response?.data || error.message);
    return "I'm sorry, I am unable to process your medical query at this moment. Please try again later or consult a doctor directly if your condition is serious.";
  }
}