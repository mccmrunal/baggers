require("dotenv").config();  // Load environment variables from a .env file
const twilio = require("twilio");

// Load credentials from environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
    console.error("❌ Twilio credentials are missing. Please set them in the .env file.");
    process.exit(1);
}

const client = new twilio(accountSid, authToken);

// Recipients & message details
const recipients = [
    "whatsapp:+917972006469",
    "whatsapp:+917387911579"
];
const fromNumber = "whatsapp:+14155238886";

// Function to send WhatsApp messages with rate limiting (1 RPS)
async function sendWhatsAppMessages(message) {
    console.log("⏳ Sending WhatsApp messages with rate limiting...");

    for (const toNumber of recipients) {
        try {
            const result = await client.messages.create({
                from: fromNumber,
                to: toNumber,
                body: message
            });

            console.log(`✅ Message sent to ${toNumber}:`, result.sid);
        } catch (error) {
            console.error(`❌ Error sending message to ${toNumber}:`, error);
        }

        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before next message
    }

    console.log("✅ All messages sent!");
}

// Export function
module.exports = { sendWhatsAppMessages };
