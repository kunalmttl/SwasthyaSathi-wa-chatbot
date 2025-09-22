import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// --- Supabase Client Initialization ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Fetches a list of unique states from the users table.
 * @returns {Promise<string[]>} An array of unique state names.
 */
async function getUniqueUserStates() {
  // Select only the 'state' column to minimize data transfer
  const { data, error } = await supabase
    .from("users")
    .select("state");

  if (error) {
    console.error("Error fetching user data:", error.message);
    return []; // Return an empty array on error
  }

  // Use a Set to automatically handle duplicates, then convert back to an array
  const uniqueStates = [...new Set(data.map(user => user.state))];
  return uniqueStates;
}

/**
 * Fetches all outbreak records for a specific state.
 * @param {string} state - The state to query for outbreaks.
 * @returns {Promise<object[]|null>} An array of outbreak objects or null on error.
 */
async function getOutbreaksByState(state) {
  const { data, error } = await supabase
    .from("public_outbreaks")
    .select("*")
    .eq("state", state);

  if (error) {
    console.error(`Error fetching outbreaks for ${state}:`, error.message);
    return null; // Return null to indicate an error occurred
  }

  return data;
}

/**
 * Formats an array of outbreak objects into a readable string.
 * @param {string} state - The state where the outbreaks occurred.
 * @param {object[]} outbreaks - The array of outbreak records.
 * @returns {string} A formatted message string ready for display.
 */
function formatOutbreakMessage(state, outbreaks) {
  let message = `\n🚨 Outbreaks in ${state}:\n`;

  outbreaks.forEach((outbreak, index) => {
    message += `
  ${index + 1}. Disease: ${outbreak.disease}
     District: ${outbreak.district}
     Cases: ${outbreak.cases}, Deaths: ${outbreak.deaths}
     Start Date: ${outbreak.start_date}
     Reported: ${outbreak.reporting_date}
     Status: ${outbreak.status}
     Comments: ${outbreak.comments || "N/A"}
`;
  });

  return message;
}

/**
 * Main function to execute the outbreak check process.
 */
async function runOutbreakCheck() {
  console.log("Starting outbreak check...");

  const uniqueStates = await getUniqueUserStates();

  if (!uniqueStates.length) {
    console.log("No states found in the users table. Exiting.");
    return;
  }

  console.log(`Found users in the following states: ${uniqueStates.join(', ')}`);

  // Loop through each unique state
  for (const state of uniqueStates) {
    console.log(`\n--- Checking for outbreaks in ${state}...`);

    const outbreaks = await getOutbreaksByState(state);

    // Handle cases where an error occurred or no outbreaks were found
    if (!outbreaks) {
      // Error message was already logged in the fetch function
      continue; // Move to the next state
    }

    if (outbreaks.length === 0) {
      console.log(`No outbreaks found for ${state}.`);
      continue; // Move to the next state
    }

    // If outbreaks are found, format and print the message
    const message = formatOutbreakMessage(state, outbreaks);
    console.log(message);
  }

  console.log("\nOutbreak check finished.");
}

// --- Execute the Script ---
runOutbreakCheck();