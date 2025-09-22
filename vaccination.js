import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";
// Import our new WhatsApp message sender
import { sendVaccinationList } from "./onboarding.js";

// --- Configuration and Supabase Client ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const VACCINATION_API_TEMPLATE = "https://cdn-api.co-vin.in/api/v5/appointment/sessions/public/calendarByPin?pincode={pincode}&date={date}";

/**
 * A helper function to pause execution. Crucial for not getting blocked by WhatsApp.
 * @param {number} ms - Milliseconds to wait.
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetches all users who have a pincode and groups them by that pincode.
 * @returns {Promise<Map<string, object[]>>} A Map where keys are pincodes and values are arrays of user objects.
 */
async function getUsersGroupedByPincode() {
  const { data, error } = await supabase
    .from("users")
    .select("phone_number, pincode")
    .not("pincode", "is", null); // Only fetch users who have a pincode

  if (error) {
    console.error("Error fetching user data:", error.message);
    return new Map();
  }

  // Group users by their pincode
  const usersByPincode = new Map();
  for (const user of data) {
    if (!usersByPincode.has(user.pincode)) {
      usersByPincode.set(user.pincode, []);
    }
    usersByPincode.get(user.pincode).push(user);
  }
  return usersByPincode;
}

/**
 * Fetches vaccination session data for a given pincode and date.
 * (This function is the same as before, just kept for modularity)
 * @param {string} pincode - The 6-digit pincode.
 * @param {string} date - The date in DD-MM-YYYY format.
 * @returns {Promise<object|null>} A structured object with session data or null.
 */
async function fetchVaccinationSessions(pincode, date) {
  const apiUrl = VACCINATION_API_TEMPLATE.replace("{pincode}", pincode).replace("{date}", date);
  try {
    const response = await fetch(apiUrl, { headers: { 'User-Agent': 'SwasthyaSathiApp/1.0' } });
    if (!response.ok) throw new Error(`API responded with status ${response.status}`);
    const data = await response.json();
    if (!data.centers || data.centers.length === 0) return null;

    const firstCenter = data.centers[0];
    return {
      pincode: firstCenter.pincode,
      state: firstCenter.state_name,
      district: firstCenter.district_name,
      centers: data.centers.map(center => ({
        name: center.name,
        address: center.address,
        timing: `${center.from} - ${center.to}`,
        purpose: center.sessions[0]?.uip_session_category || "General Vaccination",
      })),
    };
  } catch (err) {
    console.error(`Request failed for pincode ${pincode}:`, err.message);
    return null;
  }
}

/**
 * Main function to run the entire vaccination alert process.
 */
async function sendVaccinationAlerts() {
  console.log("Starting vaccination alert process...");

  const date = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  console.log(`Checking for drives on date: ${date}`);

  const usersByPincode = await getUsersGroupedByPincode();
  if (usersByPincode.size === 0) {
    console.log("No users with pincodes found. Exiting.");
    return;
  }

  console.log(`Found users in ${usersByPincode.size} unique pincode(s).`);

  // Loop through each pincode that has users
  for (const [pincode, users] of usersByPincode.entries()) {
    console.log(`\n--- Checking pincode: ${pincode} (for ${users.length} user(s))`);
    
    const sessionData = await fetchVaccinationSessions(pincode, date);

    if (sessionData) {
      console.log(`  Found ${sessionData.centers.length} centers. Preparing to notify users.`);
      // If we found drives, notify every user in that pincode
      for (const user of users) {
        await sendVaccinationList(user.phone_number, sessionData);
        // IMPORTANT: Wait 1 second between sending messages to avoid being rate-limited or blocked!
        await delay(1000);
      }
    } else {
      console.log(`  No vaccination data found for Pincode: ${pincode}`);
    }
  }

  console.log("\nVaccination alert process finished.");
}

// --- Execute the Script ---
sendVaccinationAlerts();