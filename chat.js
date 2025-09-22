// chat.js
import { getUserByPhone, saveChatLog, deleteUserByPhone } from './db.js';
import { translateText, getPerplexityAnalysis } from './services.js';
import { sendText } from './onboarding.js'; // Reusing the generic text sender


/**
 * Processes messages for users who have completed onboarding.
 * @param {object} rawMessage The full message object from the webhook.
 */
export async function processChatMessage(rawMessage) 
{
  const from = rawMessage.from;
  const userMessage = rawMessage.text?.body;

  if (!userMessage) 
  {
    return;
  }

    // Check for the reset command
  if (userMessage.trim().toLowerCase() === 'reset profile') {
    console.log(`Received reset command from ${from}. Deleting profile.`);
    
    const success = await deleteUserByPhone(from);

    if (success) {
      await sendText(from, "Your profile has been successfully deleted. Send any message to start the setup process again.");
    } else {
      await sendText(from, "Sorry, there was an error trying to delete your profile.");
    }
    return; // Stop the function here
  }

  
  // 1. Fetch the user's profile to get their native language
  const user = await getUserByPhone(from);
  if (!user || !user.native_language) 
  {
    console.error(`Could not find user or native_language for ${from}`);
    await sendText(from, "Sorry, I couldn't find your language preference. Please try restarting the conversation.");
    return;
  }
  await sendText(from, "Thank you for your query. I am analyzing it now, please wait a moment...");

  try 
  {
    const userLang = user.native_language; // e.g., 'hin_Deva'
    const englishLang = 'en';

    // --- Step 1: Translate User's Message to English ---
    const englishMessage = await translateText(userMessage, userLang, englishLang);
    console.log(`[User: ${from}] Translated Query (EN): "${englishMessage}"`);

    // --- Step 2: Get Analysis from Perplexity ---
    // Pass the English query and the full user profile for context
    const englishAnalysis = await getPerplexityAnalysis(englishMessage, user);
    console.log(`[User: ${from}] Perplexity Analysis (EN):\n${englishAnalysis}`);

    // --- Step 3: Translate the Analysis Back to User's Native Language ---
    const nativeLanguageAnalysis = await translateText(englishAnalysis, englishLang, userLang);
    console.log(`[User: ${from}] Final Translated Response (${userLang}):\n${nativeLanguageAnalysis}`);

    // --- Step 4: Send the Final Response and Log ---
    await sendText(from, nativeLanguageAnalysis);
    await saveChatLog(user.id, userMessage, nativeLanguageAnalysis);

  } catch (error) {
    console.error(`[${from}] Error in chat processing pipeline:`, error);
    await sendText(from, "Sorry, an unexpected error occurred. Please try asking your question again.");
  }
}