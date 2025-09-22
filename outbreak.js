import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
// Import our new WhatsApp message sender
import { sendOutbreakList } from "./onboarding.js";

// --- Configuration and Supabase Client ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * A helper function to pause execution. Crucial for not getting blocked by WhatsApp.
 * @param {number} ms - Milliseconds to wait.
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetches all users who have a state defined and groups them by that state.
 * @returns {Promise<Map<string, object[]>>} A Map where keys are states and values are arrays of user objects.
 */
async function getUsersGroupedByState() {
  const { data, error } = await supabase
    .from("users")
    .select("phone_number, state")
    .not("state", "is", null); // Only fetch users who have a state

  if (error) {
    console.error("Error fetching user data:", error.message);
    return new Map();
  }

  // Group users by their state
  const usersByState = new Map();
  for (const user of data) {
    if (!usersByState.has(user.state)) {
      usersByState.set(user.state, []);
    }
    usersByState.get(user.state).push(user);
  }
  return usersByState;
}

/**
 * Fetches all active outbreak records for a specific state.
 * @param {string} state - The state to query for outbreaks.
 * @returns {Promise<object[]|null>} An array of outbreak objects or null on error.
 */
async function fetchActiveOutbreaksByState(state) {
  const { data, error } = await supabase
    .from("public_outbreaks")
    .select("*")
    .eq("state", state)
    .neq("status", "Ended"); // Only get ongoing outbreaks

  if (error) {
    console.error(`Error fetching outbreaks for ${state}:`, error.message);
    return null;
  }
  return data;
}

/**
 * Main function to run the entire outbreak alert process.
 */
async function sendOutbreakAlerts() {
  console.log("Starting outbreak alert process...");

  const usersByState = await getUsersGroupedByState();
  if (usersByState.size === 0) {
    console.log("No users with state information found. Exiting.");
    return;
  }

  console.log(`Found users in ${usersByState.size} unique state(s).`);

  // Loop through each state that has users
  for (const [state, users] of usersByState.entries()) {
    console.log(`\n--- Checking state: ${state} (for ${users.length} user(s))`);

    const outbreaks = await fetchActiveOutbreaksByState(state);

    if (outbreaks && outbreaks.length > 0) {
      console.log(`  Found ${outbreaks.length} active outbreak(s). Preparing to notify users.`);
      
      const outbreakData = { state, outbreaks };

      // Notify every user in that state
      for (const user of users) {
        await sendOutbreakList(user.phone_number, outbreakData);
        // IMPORTANT: Wait 1 second between sending messages to avoid being rate-limited!
        await delay(1000);
      }
    } else {
      console.log(`  No active outbreaks found for ${state}.`);
    }
  }

  console.log("\nOutbreak alert process finished.");
}

// --- Execute the Script ---
sendOutbreakAlerts();