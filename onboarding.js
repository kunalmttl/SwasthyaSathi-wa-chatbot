// onboarding.js
import axios from 'axios'
import { getUserByPhone, createUserForOnboarding, updateUserByPhone, saveChatLog } from './db.js'
import { processChatMessage } from './chat.js';
import { getAddressFromCoords } from './services.js';

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID
const GRAPH_BASE = `https://graph.facebook.com/v23.0/${PHONE_NUMBER_ID}/messages`

function headers() {
  return {
    Authorization: `Bearer ${WHATSAPP_TOKEN}`,
    'Content-Type': 'application/json'
  }
}

// Generic text sender
export async function sendText(to, text) {
  const payload = {
    messaging_product: 'whatsapp',
    to,
    text: { body: text }
  }
  try {
    const r = await axios.post(GRAPH_BASE, payload, { headers: headers() })
    return r.data
  } catch (e) {
    console.error('sendText error', e?.response?.data || e.message)
  }
}

// Send reply buttons (Start Setup)
export async function sendStartButtons(to) {
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: 'Welcome to SwasthyaSathi! How would you like to start?' },
      action: {
        buttons: [
          { type: 'reply', reply: { id: 'start_setup', title: 'Start Setup' } },
          { type: 'reply', reply: { id: 'ask_question', title: 'Ask a Question' } },
          { type: 'reply', reply: { id: 'later', title: 'Later' } }
        ]
      }
    }
  }
  try {
    return await axios.post(GRAPH_BASE, payload, { headers: headers() })
  } catch (e) { console.error('sendStartButtons error', e?.response?.data || e.message) }
}

export async function sendLanguageListPage1(to) 
{
  const payload = 
  {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: 'Language Preference (1/3)' },
      body: { text: 'Choose your preferred language' },
      action: {
        button: 'Choose Language',
        sections: [{
          title: 'Languages',
          rows: [
            { id: 'as', title: 'অসমীয়া (Assamese)' },
            { id: 'ml', title: 'മലയാളം (Malayalam)' },
            { id: 'doi', title: 'डोगरी (Dogri)' },
            { id: 'mai', title: 'मैथिली (Maithili)' },
            { id: 'kn', title: 'ಕನ್ನಡ (Kannada)' },
            { id: 'sd', title: 'सिन्धी (Sindhi)' },
            { id: 'ks', title: 'कश्मीरी (Kashmiri)' },
            { id: 'bn', title: 'বাংলা (Bengali)' },
            { id: 'te', title: 'తెలుగు (Telugu)' },
            // This ID will trigger the next page
            { id: 'lang_page_2', title: '➡️ More Languages' }
          ]
        }]
      }
    }
  };
  try {
    return await axios.post(GRAPH_BASE, payload, { headers: headers() });
  } catch (e) { console.error('sendLanguageListPage1 error', e?.response?.data || e.message); }
}

// --- PAGE 2 ---
export async function sendLanguageListPage2(to) 
{
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: 'Language Preference (2/3)' },
      body: { text: 'Choose your preferred language' },
      action: {
        button: 'Choose Language',
        sections: [{
          title: 'Languages',
          rows: [
            { id: 'sat', title: 'संताली (Santali)' },
            { id: 'brx', title: 'बोड़ो (Bodo)' },
            { id: 'ta', title: 'தமிழ் (Tamil)' },
            { id: 'en', title: 'English' },
            { id: 'sa', title: 'संस्कृतम् (Sanskrit)' },
            { id: 'or', title: 'ଓଡ଼ିଆ (Odia)' },
            { id: 'gu', title: 'ગુજરાતી (Gujarati)' },
            { id: 'hi', title: 'हिन्दी (Hindi)' },
            { id: 'mni', title: 'মৈতৈ (Manipuri)' },
            { id: 'lang_page_3', title: '➡️ More Languages' }
          ]
        }]
      }
    }
  };
  try {
    return await axios.post(GRAPH_BASE, payload, { headers: headers() });
  } catch (e) { console.error('sendLanguageListPage2 error', e?.response?.data || e.message); }
}

// --- PAGE 3 ---
export async function sendLanguageListPage3(to) {
    // Final page, so we don't need a "More" button
    const payload = {
        messaging_product: 'whatsapp',
        to,
        type: 'interactive',
        interactive: {
            type: 'list',
            header: { type: 'text', text: 'Language Preference (3/3)' },
            body: { text: 'Choose your preferred language' },
            action: {
                button: 'Choose Language',
                sections: [{
                  title: 'Languages',
                  rows: [
                    { id: 'gom', title: 'कोंकणी (Konkani)' },
                    { id: 'ne', title: 'नेपाली (Nepali)' },
                    { id: 'mr', title: 'मराठी (Marathi)' },
                    { id: 'pa', title: 'ਪੰਜਾਬੀ (Punjabi)' },
                    { id: 'ur', title: 'اردو (Urdu)' }
                    ]
                  }]
            }
        }
    };
    try {
        return await axios.post(GRAPH_BASE, payload, { headers: headers() });
    } catch (e) { console.error('sendLanguageListPage3 error', e?.response?.data || e.message); }
}


export async function sendLocationRequest(to) 
{
  const payload = 
  {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: 
    {
      type: 'location_request_message',
      body: 
      {
        text: 'To find nearby vaccination drives, please share your current location.\n\nTap the button below to send your location.'
      },
      action: 
      {
        name: 'send_location'
      }
    }
  };
  try 
  {
    return await axios.post(GRAPH_BASE, payload, { headers: headers() });
  } 
  catch (e) 
  {
    console.error('sendLocationRequest error', e?.response?.data || e.message);
  }
}



// Send gender buttons
export async function sendGenderButtons(to) 
{
  const payload = 
  {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: 'Please select your gender' },
      action: {
        buttons: [
          { type: 'reply', reply: { id: 'gender_m', title: 'Male' } },
          { type: 'reply', reply: { id: 'gender_f', title: 'Female' } },
          { type: 'reply', reply: { id: 'gender_o', title: 'Other' } }
        ]
      }
    }
  }
  try {
    return await axios.post(GRAPH_BASE, payload, { headers: headers() })
  } catch (e) { console.error('sendGenderButtons error', e?.response?.data || e.message) }
}

// Send consent buttons
export async function sendConsentButtons(to) {
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: {
        text: 'Do you consent to store your health data securely for personalized advice?'
      },
      action: {
        buttons: [
          { type: 'reply', reply: { id: 'consent_yes', title: 'I Agree' } },
          { type: 'reply', reply: { id: 'consent_no', title: 'I Do Not Agree' } }
        ]
      }
    }
  }
  try {
    return await axios.post(GRAPH_BASE, payload, { headers: headers() })
  } catch (e) { console.error('sendConsentButtons error', e?.response?.data || e.message) }
}

// Main processing function called by webhook
export async function processOnboardingMessage(rawMessage) 
{
  // rawMessage is the full message object from webhook for the single message
  // Extract phone and determine message type
  const from = rawMessage.from
  let user = await getUserByPhone(from)

  // If user not found: create and send start buttons
  if (!user) {
    user = await createUserForOnboarding(from)
    await sendStartButtons(from)
    return
  }

  // If user exists and onboarding is complete, hand off to the chat processor
  if (user.onboarding_step === 'done' || user.verified) {
    // you can forward to normal chat handler
    await processChatMessage(rawMessage);
    return
  }

  // Determine incoming content
  const msgType = rawMessage.type
  try {
    if (msgType === 'interactive') {
      const interactive = rawMessage.interactive
      if (interactive.type === 'button_reply') {
        const btnId = interactive.button_reply.id
        await handleButtonReply(user, from, btnId, rawMessage)
      } else if (interactive.type === 'list_reply') {
        const listId = interactive.list_reply.id
        await handleListReply(user, from, listId, rawMessage)
      } else {
        // fallback
        await sendText(from, "Got it — please type or choose an option.")
      }
    } 
    else if (msgType === 'text') 
      {
      const text = rawMessage.text?.body?.trim()
      await handleTextReply(user, from, text)
      } 
    else if (msgType === 'location') { // <-- ADD THIS NEW BLOCK
      // Handle the incoming location message
      const location = rawMessage.location;
      const latitude = location.latitude;
      const longitude = location.longitude;
      await handleLocationReply(user, from, latitude, longitude);
    }
    else 
    {
      await sendText(from, "Message type not supported for onboarding. Please reply with text.")
    }
  } catch (err) {
    console.error('processOnboardingMessage error', err)
  }
}



async function handleLocationReply(user, from, latitude, longitude) 
{
  if (user.onboarding_step === 'location') 
  {
    console.log(`Received location from ${from}: Lat=${latitude}, Long=${longitude}`);

    // Reverse geocode to get full address details
    const locationDetails = await getAddressFromCoords(latitude, longitude);

    // Base updates (always save coords and move to next step)
    const updates = {
      latitude: latitude,
      longitude: longitude,
      onboarding_step: 'conditions' // Move to the next step
    };

    // If reverse geocoding succeeded, include structured address fields
    if (locationDetails) {
      updates.pincode = locationDetails.pincode || null;
      updates.district = locationDetails.district || null;
      updates.subdistrict = locationDetails.subdistrict || null;
      updates.city = locationDetails.city || null;
      updates.state = locationDetails.state || null;
    }

    // Save to DB (or your persistence layer)
    await updateUserByPhone(from, updates);

    // Ask next onboarding question
    await sendText(
      from,
      'Thank you. Any chronic conditions? (e.g., Diabetes, Hypertension). Reply "None" if none.'
    );

  } else {
    await sendText(from, "Received your location!");
  }
}


// Button handler
async function handleButtonReply(user, from, btnId, rawMessage) 
{
  switch (btnId) {
    case 'start_setup':
      // This is the entry point for the onboarding flow.
      await updateUserByPhone(from, { onboarding_step: 'language' });
      
      // CORRECTED LINE: The function name now matches the one we defined.
      await sendLanguageListPage1(from); 
      break;

    case 'ask_question':
      // This allows the user to skip the detailed setup.
      await updateUserByPhone(from, { onboarding_step: 'done', verified: true });
      await sendText(from, 'You can ask your health question now. (Tip: include symptoms & duration)');
      break;

    case 'later':
      // User chooses to postpone onboarding.
      await updateUserByPhone(from, { onboarding_step: null });
      await sendText(from, 'No problem. Message anytime to get started.');
      break;

    case 'gender_m':
    case 'gender_f':
    case 'gender_o': {
      // Handles the gender selection and moves to the next step.
      const gender = btnId === 'gender_m' ? 'Male' : (btnId === 'gender_f' ? 'Female' : 'Other');
      await updateUserByPhone(from, { gender, onboarding_step: 'location' });
      await sendLocationRequest(from);
      break;
    }

    case 'consent_yes':
      // User agrees to the terms, completing the setup.
      await updateUserByPhone(from, { consent: true, onboarding_step: 'done', verified: true });
      await sendText(from, 'Thank you — setup complete. You can ask health questions anytime.');
      break;

    case 'consent_no':
      // User does not agree. Onboarding is marked as 'done' but 'verified' is false.
      await updateUserByPhone(from, { consent: false, onboarding_step: 'done', verified: false });
      await sendText(from, 'Understood. Your personal data will not be saved. You may still ask general questions.');
      break;

    default:
      // A fallback for any unexpected button IDs.
      await sendText(from, 'Option received. Proceeding...');
      break;
  }
}


// List handler (language selection)
async function handleListReply(user, from, listId) {
  // Check if the user is at the language selection step
  if (user.onboarding_step === 'language') {
    // Handle pagination
    if (listId === 'lang_page_2') {
      await sendLanguageListPage2(from);
      return; // Stop further execution
    }
    if (listId === 'lang_page_3') {
      await sendLanguageListPage3(from);
      return; // Stop further execution
    }

    // If it's not a page change, it's a language selection
    await updateUserByPhone(from, { native_language: listId, onboarding_step: 'name' });
    await sendText(from, 'Great — what is your full name?');

  } else {
    // Fallback for other potential lists
    await sendText(from, 'Selection received.');
  }
}


// Text reply handler (for steps that expect typed input)
async function handleTextReply(user, from, text) {
  const step = user.onboarding_step
  if (!step || step === 'start') {
    // If they typed some free text initially, create user and ask to start setup
    await updateUserByPhone(from, { onboarding_step: 'start' })
    await sendStartButtons(from)
    return
  }

  if (step === 'name') {
    await updateUserByPhone(from, { full_name: text, onboarding_step: 'age' })
    await sendText(from, 'Please enter your age (in years).')
    return
  }

  if (step === 'age') {
    const age = parseInt(text, 10)
    if (!age || age <= 0 || age > 120) {
      await sendText(from, 'Please enter a valid numeric age (e.g., 35).')
      return
    }
    await updateUserByPhone(from, { age, onboarding_step: 'gender' })
    await sendGenderButtons(from)
    return
  }

  if (step === 'location') {
    // try parse pincode if numeric, else store city/state
    const cleaned = text
    let updates = {}
    if (/^\d{6}$/.test(cleaned)) updates = { pincode: cleaned }
    else {
      // naive split
      const parts = cleaned.split(',').map(s => s.trim())
      updates.city = parts[0] || null
      updates.state = parts[1] || null
    }
    updates.onboarding_step = 'conditions'
    await updateUserByPhone(from, updates)
    await sendText(from, 'Any chronic conditions? (e.g., Diabetes, Hypertension). Reply "None" if none.')
    return
  }

  if (step === 'conditions') {
    const cond = text.toLowerCase() === 'none' ? [] : text.split(',').map(s => s.trim())
    await updateUserByPhone(from, { chronic_conditions: cond, onboarding_step: 'consent' })
    await sendConsentButtons(from)
    return
  }

  // fallback
  await sendText(from, 'Thanks. Proceeding to the next step.')
}
