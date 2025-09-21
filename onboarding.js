// onboarding.js
import axios from 'axios'
import { getUserByPhone, createUserForOnboarding, updateUserByPhone, saveChatLog } from './db.js'

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

// Send languages as list (Example)
export async function sendLanguageList(to) {
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: 'Language Preference' },
      body: { text: 'Choose your preferred conversation language' },
      action: {
        button: 'Choose Language',
        sections: [
          {
            title: 'Languages',
            rows: [
              { id: 'lang_hi', title: 'हिन्दी' },
              { id: 'lang_en', title: 'English' },
              { id: 'lang_or', title: 'Odia' },
              { id: 'lang_bn', title: 'Bengali' }
            ]
          }
        ]
      }
    }
  }
  try {
    return await axios.post(GRAPH_BASE, payload, { headers: headers() })
  } catch (e) { console.error('sendLanguageList error', e?.response?.data || e.message) }
}

// Send gender buttons
export async function sendGenderButtons(to) {
  const payload = {
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
export async function processOnboardingMessage(rawMessage) {
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

  // If user exists but onboarding done -> nothing here
  if (user.onboarding_step === 'done' || user.verified) {
    // you can forward to normal chat handler
    await sendText(from, `Hi ${user.full_name ?? 'there'}, how can I help you today?`)
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
    } else if (msgType === 'text') {
      const text = rawMessage.text?.body?.trim()
      await handleTextReply(user, from, text)
    } else {
      await sendText(from, "Message type not supported for onboarding. Please reply with text.")
    }
  } catch (err) {
    console.error('processOnboardingMessage error', err)
  }
}

// Button handler
async function handleButtonReply(user, from, btnId, rawMessage) {
  switch (btnId) {
    case 'start_setup':
      await updateUserByPhone(from, { onboarding_step: 'language' })
      await sendLanguageList(from)
      break
    case 'ask_question':
      await updateUserByPhone(from, { onboarding_step: 'done', verified: true })
      await sendText(from, 'You can ask your health question now. (Tip: include symptoms & duration)')
      break
    case 'later':
      await updateUserByPhone(from, { onboarding_step: null })
      await sendText(from, 'No problem. Message anytime to get started.')
      break
    case 'gender_m':
    case 'gender_f':
    case 'gender_o': {
      const gender = btnId === 'gender_m' ? 'Male' : (btnId === 'gender_f' ? 'Female' : 'Other')
      await updateUserByPhone(from, { gender, onboarding_step: 'location' })
      await sendText(from, 'Please tell your city and state (e.g., Bhubaneswar, Odisha) or send PIN code.')
      break
    }
    case 'consent_yes':
      await updateUserByPhone(from, { consent: true, onboarding_step: 'done', verified: true })
      await sendText(from, 'Thank you — setup complete. You can ask health questions anytime.')
      break
    case 'consent_no':
      await updateUserByPhone(from, { consent: false, onboarding_step: 'done', verified: false })
      await sendText(from, 'Understood. Profile not saved. You may still ask general questions.')
      break
    default:
      await sendText(from, 'Option received. Proceeding...')
  }
}

// List handler (language selection)
async function handleListReply(user, from, listId) {
  if (listId.startsWith('lang_')) {
    const lang = listId.split('_')[1] // e.g., 'hi' or 'en' or 'or'
    await updateUserByPhone(from, { native_language: lang, onboarding_step: 'name' })
    await sendText(from, 'Great — what is your full name?')
  } else {
    await sendText(from, 'Selection received.')
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
