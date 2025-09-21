import fetch from "node-fetch";

async function fetchSessions(pincode, date) {
  const url = `https://cdn-api.co-vin.in/api/v5/appointment/sessions/public/calendarByPin?pincode=${pincode}&date=${date}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(JSON.stringify(data, null, 2)); 
  } catch (err) {
    console.error("Request failed:", err.message);
  }
}

const pincode = process.argv[2] || "303002";
const date = process.argv[3] || "21-09-2025";

fetchSessions(pincode, date);
