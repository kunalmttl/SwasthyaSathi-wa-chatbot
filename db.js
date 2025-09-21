// db.js
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Get user by phone (returns null if not found)
export async function getUserByPhone(phone) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('phone_number', phone)
    .maybeSingle()
  if (error) {
    console.error('getUserByPhone error', error)
    return null
  }
  return data
}

// Create a minimal user row for onboarding
export async function createUserForOnboarding(phone) {
  const payload = {
    phone_number: phone,
    onboarding_step: 'start',
    preferred_channel: 'whatsapp',
    created_at: new Date().toISOString(),
    last_active: new Date().toISOString()
  }
  const { data, error } = await supabase
    .from('users')
    .insert([payload])
    .select()
  if (error) {
    console.error('createUserForOnboarding error', error)
    return null
  }
  return data?.[0] ?? null
}

// Update user by phone
export async function updateUserByPhone(phone, updates) {
  updates.last_active = new Date().toISOString()
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('phone_number', phone)
    .select()
  if (error) {
    console.error('updateUserByPhone error', error)
    return null
  }
  return data?.[0] ?? null
}

// Save chat log (useful)
export async function saveChatLog(user_id, message_in, message_out) {
  const { data, error } = await supabase
    .from('chat_logs')
    .insert([{ user_id, message_in, message_out }])
  if (error) console.error('saveChatLog error', error)
  return data
}
