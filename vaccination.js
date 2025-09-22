import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch"; // Ensure you have 'node-fetch' installed (npm install node-fetch)

// --- Configuration and Supabase Client ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const VACCINATION_API_TEMPLATE = "https://cdn-api.co-vin.in/api/v5/appointment/sessions/public/calendarByPin?pincode={pincode}&date={date}";

/**
 * Fetches a list of unique, valid pincodes from the users table.
 * @returns {Promise<string[]>} An array of unique pincode strings.
 */
async function getUniqueUserPincodes() {
  const { data, error } = await supabase
    .from("users")
    .select("pincode");

  if (error) {
    console.error("Error fetching user data:", error.message);
    return [];
  }

  // Filter out null/undefined pincodes, get unique values using a Set, and convert back to an array.
  const uniquePincodes = [...new Set(data.map(user => user.pincode).filter(Boolean))];
  return uniquePincodes;
}

/**
 * Fetches vaccination session data for a given pincode and date from the public API.
 * @param {string} pincode - The 6-digit pincode to search for.
 * @param {string} date - The date in DD-MM-YYYY format.
 * @returns {Promise<object|null>} A structured object with session data or null on failure/no data.
 */
async function fetchVaccinationSessions(pincode, date) {
  const apiUrl = VACCINATION_API_TEMPLATE
    .replace("{pincode}", pincode)
    .replace("{date}", date);

  try {
    const response = await fetch(apiUrl, {
      headers: { 'User-Agent': 'SwasthyaSathiApp/1.0' } // It's good practice to set a User-Agent
    });

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // If the API returns no centers, there's nothing to report.
    if (!data.centers || data.centers.length === 0) {
      return null;
    }

    // Process the data into a cleaner format
    const firstCenter = data.centers[0];
    const processedData = {
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

    return processedData;
  } catch (err) {
    console.error(`Request failed for pincode ${pincode}:`, err.message);
    return null;
  }
}

/**
 * Formats the vaccination session data into a readable string.
 * @param {object} sessionData - The processed data object from fetchVaccinationSessions.
 * @returns {string} A formatted message string ready for display.
 */
function formatVaccinationMessage(sessionData) {
  let message = `
📍 Vaccination Drives for Pincode: ${sessionData.pincode}
   State: ${sessionData.state}
   District: ${sessionData.district}

Centers Available:
--------------------`;

  sessionData.centers.forEach((center, index) => {
    message += `
  ${index + 1}. ${center.name}
     Address: ${center.address}
     Timing: ${center.timing}
     Purpose: ${center.purpose}
`;
  });

  return message;
}

/**
 * Main function to execute the vaccination drive check process.
 */
async function runVaccinationCheck() {
  console.log("Starting vaccination drive check...");

  // Use the date from the command line argument, or default to today's date.
  // Example usage: node vaccination.js 25-12-2025
  const date = process.argv[2] || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  console.log(`Checking for vaccination drives on date: ${date}`);

  const uniquePincodes = await getUniqueUserPincodes();

  if (uniquePincodes.length === 0) {
    console.log("No valid pincodes found in the users table. Exiting.");
    return;
  }

  console.log(`Found users in ${uniquePincodes.length} unique pincode(s).`);

  // Loop through each unique pincode
  for (const pincode of uniquePincodes) {
    const sessionData = await fetchVaccinationSessions(pincode, date);

    if (sessionData) {
      const message = formatVaccinationMessage(sessionData);
      console.log(message);
    } else {
      console.log(`\n-> No vaccination data found for Pincode: ${pincode}`);
    }
  }

  console.log("\nVaccination drive check finished.");
}

// --- Execute the Script ---
runVaccinationCheck();