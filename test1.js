import { fyersModel as FyersAPI } from "fyers-api-v3";
import axios from "axios";
import crypto from "crypto";
import fs from "fs";
import dotenv from "dotenv";
const TOKEN_FILE = "fyers_token.json"; // File to store token details
dotenv.config();
var fyers = new FyersAPI();
fyers.setAppId(process.env.appId);
fyers.setRedirectUrl(`https://127.0.0.1`);
const appIdHash = crypto.createHash("sha256").update(`${process.env.appId}:${process.env.appSecret}`).digest("hex");
const requestBody = {
  grant_type: "refresh_token",
  appIdHash: appIdHash,
  refresh_token: process.env.refreshToken,
  pin: process.env.pin
}

async function refreshAccessToken() {
  try {
    const response = await axios.post(
      "https://api-t1.fyers.in/api/v3/validate-refresh-token",
      requestBody,
      { headers: { "Content-Type": "application/json" } }
    );

    if (response.data.s === "ok") {
      const newAccessToken = response.data.access_token;
      console.log("✅ New Access Token:", newAccessToken);

      // Save the new access token with timestamp
      fs.writeFileSync(TOKEN_FILE, JSON.stringify({ access_token: newAccessToken, updated_at: new Date() }, null, 2), { flag: 'w' });
    } else {
      console.error("❌ Failed to refresh token:", response.data);
    }
  } catch (error) {
    console.error("❌ Error refreshing token:", error.response ? error.response.data : error.message);
  }
}
function isTokenExpired() {
  ensureTokenFileExists();
  if (!fs.existsSync(TOKEN_FILE)) {
    return true; // No file → Token needs to be refreshed
  }

  const tokenData = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf-8"));
  if (!tokenData.access_token || !tokenData.updated_at) {
    return true; // Invalid data → Refresh required
  }

  const tokenTimestamp = new Date(tokenData.updated_at).getTime();
  const currentTime = new Date().getTime();
  const tokenAge = (currentTime - tokenTimestamp) / (1000 * 60 * 60); // Convert ms to hours

  return tokenAge >= 23.5; // Refresh if the token is older than 23.5 hours
}

function ensureTokenFileExists() {
  if (!fs.existsSync(TOKEN_FILE)) {
      fs.writeFileSync(TOKEN_FILE, JSON.stringify({ access_token: "", updated_at: "" }, null, 2));
  }
}

try{
  if (isTokenExpired()) {
    console.log("🔄 Token expired. Refreshing...");
    await refreshAccessToken();
  } else {
    console.log("✅ Token is still valid. No refresh needed.");
  }
} catch(error){
  console.error("❌ Error checking token expiry:", error);
}finally{
  fyers.setAccessToken(JSON.parse(fs.readFileSync(TOKEN_FILE, "utf-8")).access_token);
  console.log("🚀 Starting the server...");
}

fyers.get_orders().then((response) => {
  console.log(response)
}).catch((error) => {
  console.log(error)
})