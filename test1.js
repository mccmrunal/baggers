import { fyersModel as FyersAPI } from "fyers-api-v3";
import axios from "axios";
import crypto from "crypto";
import fs from "fs";
import dotenv from "dotenv";
import csv from "csv-parser";
import { filterStocks } from "./dynamicData/filteredStocks.js";
import historicAnalysis from "./dynamicData/historicAnalysis.js";
import path from 'path';

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

  return tokenAge >= 6; // Refresh if the token is older than 23.5 hours
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


let requestCount = 0; // Global counter to track requests across function calls

async function processStocksInBatches(fyers, stockArray, timestamp, delayBetweenRequests = 100,callfunc,timeframe) {
    const filteredStocks = [];

    for (let i = 0; i < stockArray.length; i++) {
        const symbol = stockArray[i];

        try {
            let result;
            if(callfunc){
              result = await callfunc(fyers, symbol, timestamp);
            }else{
               result = await filterStocks(fyers, symbol, timeframe,delayBetweenRequests,timestamp);
            }
            filteredStocks.push(result);
        } catch (error) {
            console.error(`❌ Error processing ${symbol}:`, error.message);
        }

        requestCount++; // Increment global request count

        // Wait after every request to respect 10 requests/sec limit
        await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));

        // After every 10 requests, wait 1 second
        if (requestCount % 10 === 0) {
            console.log(`⏳ Pausing for 1 second after ${requestCount} requests...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // After every 100 requests, wait 1 minute and reset the counter
        if (requestCount % 100 === 0) {
            console.log(`🚨 Reached 100 requests! Waiting for 1 minute to respect API limit...`);
            await new Promise(resolve => setTimeout(resolve, 60000));
            requestCount = 0; // Reset counter after cooldown
        }
    }

    return filteredStocks;
}

let filteredArray = [];
console.log(filteredArray)

async function fetchStocks(timestamp,callfunc,timeframe) {
  
  await checkAccess();

  console.log(`🔍 Fetching stocks for timestamp: ${timestamp}...`);
  if(callfunc){
  filteredArray = await processStocksInBatches(fyers, stockArray, timestamp, 100,callfunc);
  }else{
    filteredArray = await processStocksInBatches(fyers, stockArray, timestamp, 100,null,timeframe);
  }
  console.log("✅ Filtered Stocks:", filteredArray);
  return filteredArray;
}

async function historicalData(from,to,res) {
  // await checkAccess(); 

  let startDate = new Date(from+"T03:45:00Z"); // 9:15 AM IST (Convert to UTC)
  let endDate = new Date(to+"T10:00:00Z");   // End on Feb 29th, 2024 (Leap Year)
  let tradingDays = [];
  let results = {};

  // Generate a list of trading days (excluding weekends)
  while (startDate <= endDate) {
      let dayOfWeek = startDate.getDay(); // 0 = Sunday, 6 = Saturday
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          tradingDays.push(new Date(startDate)); // Clone the date object
      }
      startDate.setDate(startDate.getDate() + 1);
  }

  // Fetch stocks for each trading day
  for (let tradingDay of tradingDays) {
      console.log(`Fetching data for ${tradingDay.toISOString().split("T")[0]}...`);

      let formattedDate = Math.floor(tradingDay.getTime() / 1000); // Convert to timestamp
      let stockData = await fetchStocks(formattedDate,historicAnalysis.filterStocks); // Pass timestamp as timeframe

      results[tradingDay.toISOString().split("T")[0]] = stockData;
      await new Promise(resolve => setTimeout(resolve, 2000)); // Avoid rate limits
  }
  const filePath = path.join(process.cwd(), "trade_results.xlsx");
  res.setHeader("Content-Disposition", "attachment; filename=trade_results.xlsx");
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.sendFile(filePath, (err) => {
    if (err) {

      console.error("Error sending file:", err);
      res.status(500).send("Error sending file");
    }
    fs.unlinkSync(filePath); // Delete the file after sending
  });
}
export default {fetchStocks,historicalData};