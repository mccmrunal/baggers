import { fyersModel as FyersAPI } from "fyers-api-v3";
import axios from "axios";
import crypto from "crypto";
import fs from "fs";
import dotenv from "dotenv";
import csv from "csv-parser";
import { filterStocks } from "./dynamicData/filteredStocks.js";
const TOKEN_FILE = "fyers_token.json"; // File to store token details
dotenv.config();
var fyers = new FyersAPI();
fyers.setAppId(process.env.appId);
fyers.setRedirectUrl(`https://127.0.0.1`);
let url = "https://public.fyers.in/sym_details/NSE_FO.csv";
// Function to fetch and filter F&O stocks
async function fetchFnoStocks() {
  try {
      console.log("Downloading F&O stock list...");
      const response = await axios.get(url, { responseType: "stream" });

      const stockSet = new Set(); // To store unique stock names

      response.data.pipe(csv({ headers: false }))
          .on("data", (row) => {
              const symbol = row[9]; // Column 9 contains full symbol (e.g., NSE:KALYANKJIL25MAR380PE)
              
              // Extract stock name (everything after NSE: and before the date)
              const match = symbol.match(/^NSE:([A-Z0-9&-]+)(?=\d{2}[A-Z]{3})/);
              if (match) {
                  stockSet.add(match[1]); // Add stock name to Set (avoid duplicates)
              }
          })
          .on("end", () => {
              const stockList = Array.from(stockSet).sort(); // Convert to array & sort
              console.log(`Total unique F&O stocks: ${stockList.length}`);
              
              fs.writeFileSync("fno_stock_names.json", JSON.stringify(stockList, null, 2));
              console.log("✅ Stock names saved to fno_stock_names.json");
          });

  } catch (error) {
      console.error("❌ Error fetching F&O stocks:", error);
  }
}

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

async function checkAccess(){
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
}

const stockArray = JSON.parse(fs.readFileSync('./dynamicData/fno_stock_names.json', 'utf8'));



async function processStocksInBatches (fyers, stockArray,timeframe, batchSize = 10, delay = 1000) {
  const filteredStocks = [];

  for (let i =  0; i < stockArray.length; i += batchSize) {
      const batch = stockArray.slice(i, i + batchSize); // Get next batch of stocks
      
      const results = await Promise.all(
          batch.map(symbol =>filterStocks(fyers, symbol, timeframe,timeframe,delay))
      );

      // Add only the stocks that returned a valid symbol
      filteredStocks.push(...results.filter(Boolean));

      await new Promise(resolve => setTimeout(resolve, delay)); // Delay between batches
  }

  return filteredStocks; // Return all valid stocks
}
let filteredArray = [];
console.log(filteredArray)

 async function fetchStocks(timeframe){
  await checkAccess();
  // await fetchFnoStocks();
  filteredArray = await processStocksInBatches(fyers, stockArray,timeframe, 10, 1000);
  console.log(filteredArray)
  return filteredArray;
}

export default fetchStocks;