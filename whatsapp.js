const twilio = require("twilio");

// Twilio credentials (get these from your Twilio console)
const accountSid = "AC4bd6cd5a63867055fcea533faa10c4a1";  // Replace with your Twilio SID
const authToken = "4c5c97ab6bf4d721c306307b51cb1a91";    // Replace with your Twilio Auth Token
const client = new twilio(accountSid, authToken);

// Function to send a WhatsApp message
const recipients = [
    'whatsapp:+917972006469', // Example: India
    'whatsapp:+917387911579', // Example: UK
  ];
const fromNumber = 'whatsapp:+14155238886';
const messageBody = 'Borgaya jhatu';


async function sendWhatsAppMessages(message) {
    try {
      const messagePromises = recipients.map(async (toNumber) => {
        return client.messages.create({
          from: fromNumber,
          to: toNumber,
          body: message
        });
      });
  
      const results = await Promise.all(messagePromises);
      console.log('✅ Messages sent successfully:', results);
    } catch (error) {
      console.error('❌ Error sending WhatsApp messages:', error);
    }
  }
  
  // Call function
  module.exports = {sendWhatsAppMessages}
