// chat.js
import { getUserByPhone, saveChatLog, deleteUserByPhone, updateUserByPhone } from './db.js';
import { translateText, getPerplexityAnalysis } from './services.js';
import { sendText } from './onboarding.js'; // Reusing the generic text sender
import { getImageAsBase64 } from './services.js';


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

  if (user.pending_media_id) {
    const mediaId = user.pending_media_id;
    console.log(`Processing text as description for pending Media ID: ${mediaId}`);

    // Clear the pending state immediately to prevent race conditions
    await updateUserByPhone(from, { pending_media_id: null });

    // Download the image and get it as Base64
    const imageBase64 = await getImageAsBase64(mediaId);
    if (!imageBase64) {
      await sendText(from, "Sorry, there was an error processing the image you sent. Please try sending it again.");
      return;
    }

    // Now, run the full analysis pipeline with the image
    await runAnalysisPipeline(user, userMessage, imageBase64);

  } else {
    // If no image is pending, run the normal text-only analysis
    await runAnalysisPipeline(user, userMessage, null);
  }
}


/**
 * A new helper function to contain the analysis logic,
 * making it reusable for both text-only and multimodal queries.
 * @param {object} user
 * @param {string} userMessage
 * @param {string|null} imageBase64
 */
async function runAnalysisPipeline(user, userMessage, imageBase64) {
  const from = user.phone_number;
  await sendText(from, "Thank you for your query. I am analyzing it now, please wait a moment...");

  try {
    const userLang = user.native_language;
    const englishLang = 'en';

    const englishMessage = await translateText(userMessage, userLang, englishLang);
    console.log(`[User: ${from}] Translated Query (EN): "${englishMessage}"`);

    // Pass the imageBase64 to the analysis function
    const englishAnalysis = await getPerplexityAnalysis(englishMessage, user, imageBase64);
    console.log(`[User: ${from}] Perplexity Analysis (EN):\n${englishAnalysis}`);

    const nativeLanguageAnalysis = await translateText(englishAnalysis, englishLang, userLang);
    console.log(`[User: ${from}] Final Translated Response (${userLang}):\n${nativeLanguageAnalysis}`);

    await sendText(from, nativeLanguageAnalysis);
    await saveChatLog(user.id, userMessage, nativeLanguageAnalysis);

  } catch (error) {
    console.error(`[${from}] Error in chat processing pipeline:`, error);
    await sendText(from, "Sorry, an unexpected error occurred. Please try asking your question again.");
  }
}