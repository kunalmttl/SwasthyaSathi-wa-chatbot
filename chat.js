// chat.js
import { getUserByPhone } from './db.js';
import { translateText } from './services.js';
import { sendText } from './onboarding.js'; 


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


  // 1. Fetch the user's profile to get their native language
  const user = await getUserByPhone(from);
  if (!user || !user.native_language) 
  {
    console.error(`Could not find user or native_language for ${from}`);
    await sendText(from, "Sorry, I couldn't find your language preference. Please try restarting the conversation.");
    return;
  }

  // 2. Translate their message to English
  const userLang = user.native_language;
  const targetLang = 'eng_Latn'; 
  const englishMessage = await translateText(userMessage, userLang, targetLang);

  // 3. For testing: Log the result and confirm with the user
  console.log(`[User: ${from}] Native (${userLang}): "${userMessage}" -> English (${targetLang}): "${englishMessage}"`);

  // Send a confirmation back to the user to verify the translation worked.
  // In the next step, we will replace this with the call to Perplexity.
  const confirmationText = `(For Testing) I understood your message as: "${englishMessage}"`;
  await sendText(from, confirmationText);
}