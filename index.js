import express from "express";
import bodyParser from "body-parser";
import crypto from "crypto";
import axios from "axios";
import dotenv from "dotenv";
import { processOnboardingMessage } from "./onboarding.js";

dotenv.config();

const app = express();
app.use(bodyParser.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN; 
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID; 

// Webhook verification
app.get("/webhook", (req, res) => 
{
        const mode = req.query["hub.mode"];
        const token = req.query["hub.verify_token"];
        const challenge = req.query["hub.challenge"];

        if (mode && token && mode === "subscribe" && token === VERIFY_TOKEN) 
        {
                console.log("Webhook verified!");
                res.status(200).send(challenge);
        } 
        else 
        {
                res.sendStatus(403);
        }
});


// POST /webhook - receives messages
app.post('/webhook', async (req, res) => {
  try {
    const body = req.body
    const entry = body.entry?.[0]
    const change = entry?.changes?.[0]
    const value = change?.value
    const messages = value?.messages
    if (messages && messages.length > 0) {
      const msg = messages[0]
      // forward the raw message object for processing
      await processOnboardingMessage(msg)
    }
  } catch (e) {
    console.error('webhook error', e)
  }
  res.sendStatus(200)
})


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
