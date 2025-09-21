import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

// init supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

async function testSupabase() {
  // Insert test user
  const { data: insertData, error: insertError } = await supabase
    .from('users')
    .insert([
      {
        phone_number: "+911234567890",
        full_name: "Test User",
        native_language: "Hindi",
        age: 25,
        gender: "Male",
        city: "Delhi",
        state: "Delhi",
        height_cm: 170,
        weight_kg: 65
      }
    ])
    .select()

  if (insertError) {
    console.error("❌ Insert Error:", insertError)
    return
  }
  console.log("✅ Inserted:", insertData)

  // Fetch test user
  const { data: fetchData, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('phone_number', "+911234567890")
    .single()

  if (fetchError) {
    console.error("❌ Fetch Error:", fetchError)
    return
  }
  console.log("✅ Fetched:", fetchData)
}

testSupabase()
