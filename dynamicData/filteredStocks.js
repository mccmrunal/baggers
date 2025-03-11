const { subscribeToStock } = require("../liveDataFetch.js");
const {sendEmail}  = require("../mail.js");
let axios = require("axios")

module.exports = {

    filterStocks: async function (symbol,timestamp,timeframe) { // Default delay of 1 second
        try {    
            const today = new Date().toISOString().split('T')[0];      
            let config = {
            method: 'get',
            maxBodyLength: Infinity,
            url: `https://api.upstox.com/v2/historical-candle/intraday/${symbol.asset_key}/1minute`,
            headers: { 
            'Accept': 'application/json'
            }
            };
            
            let data = await axios(config);
            let arrUpstox = data.data.data.candles.splice(0-timeframe);
            const openUpstox = arrUpstox[4][1];  // Open of the first 1-min candle (9:15 AM)
            const closeUpstox = arrUpstox[0][4]; // Close of the last 1-min candle (9:19 AM)
            const highUpstox = Math.max(...arrUpstox.map(candle => candle[2])); // Highest high
            const lowUpstox = Math.min(...arrUpstox.map(candle => candle[3]));  // Lowest low

            const percentageChange = (Math.abs(highUpstox - lowUpstox) / lowUpstox) * 100;
            
            if (percentageChange > 1.5) {
                console.log(`⛔ Skipping ${symbol.symbol}-EQ as percentage change is ${percentageChange.toFixed(3)}% (> 1.5%)`);
                return false;
            }
            const bodySize = Math.abs(closeUpstox - openUpstox);
            const totalRange = highUpstox - lowUpstox;
            const strength = (bodySize / totalRange) * 100;

            // Exclude candles that are less than 50% strong
            if (strength < 50) {
                console.log(`⛔ Skipping ${symbol.symbol}-EQ as candle strength is ${strength.toFixed(3)}% (< 50%)`);
                return false;
            }
            if (openUpstox === closeUpstox && closeUpstox === highUpstox && highUpstox === lowUpstox) {
                console.log(`${symbol.symbol} has hit a lower circuit`)
                return false;
            }

            const trend = openUpstox > closeUpstox ? "bearish" : "bullish";
            const isNearLow = openUpstox === highUpstox ? true :false;
            const isNearHigh = openUpstox === lowUpstox ? true :false;
            if (trend === "bearish" && isNearLow) {
                console.log(`📉 Bearish trend detected for ${symbol.symbol}-EQ`);
                await subscribeToStock("SELL",symbol.symbol,highUpstox,0.99*lowUpstox,lowUpstox);
                symbol.stopLoss = highUpstox;
                symbol.target = 0.99*lowUpstox;
                symbol.tradeType = "SELL";
                symbol.entry = lowUpstox;   
                return symbol; // Return the stock symbol if it meets criteria
            } else if (trend === "bullish" && isNearHigh) {
                console.log(`📈 Bullish trend detected for ${symbol.symbol}-EQ`);
                await subscribeToStock("BUY",symbol.symbol,lowUpstox,1.01*highUpstox,highUpstox);
                symbol.stopLoss = lowUpstox;
                symbol.target = 1.01*highUpstox;
                symbol.tradeType = "BUY";
                symbol.entry = highUpstox;   
                return symbol; // Return the stock symbol if it meets criteria
            }
            return false; // Return false if stock does not meet criteria
        } catch (error) {
            if (error.code === 429) {
                console.error(`⚠️ Rate limit reached for ${symbol}-EQ. Retrying after some time...`);
                // await new Promise(resolve => setTimeout(resolve, delay * 2)); // Exponential backoff
            } else {
                console.error(`❌ Error fetching data for ${symbol.symbol}-EQ:`, error);
            }
            return false;
        }
    }



    // filterStocks: async function (fyers, symbol,timeframe, delay = 15,timestamp) { // Default delay of 1 second
    //     try {            
    //         await new Promise(resolve => setTimeout(resolve, delay)); // Delay to prevent rate limiting
    //         let startTimeDay = timestamp;
    //         let endTime =  parseInt(startTimeDay) + timeframe*60;
    //         const inp = {
    //             symbol: `NSE:${symbol}-EQ`,
    //             resolution:timeframe,
    //             date_format: "0",
    //             range_from:startTimeDay ,
    //             range_to: endTime,
    //             cont_flag: "1"
    //         };

    //         const response = await fyers.getHistory(inp);
    //         const [time, open, high, low, close,volume] = response.candles[0];

    //         if (!response || !response.candles || response.candles.length === 0) {
    //             console.log(`⚠️ No data available for ${symbol}-EQ`);
    //             return false;
    //         }
    //         const percentageChange = (Math.abs(high - low) / low) * 100;
            
    //         if (percentageChange > 1.5) {
    //             console.log(`⛔ Skipping ${symbol}-EQ as percentage change is ${percentageChange.toFixed(3)}% (> 1.5%)`);
    //             return false;
    //         }
    //         const bodySize = Math.abs(close - open);
    //         const totalRange = high - low;
    //         const strength = (bodySize / totalRange) * 100;

    //         // Exclude candles that are less than 50% strong
    //         if (strength < 50) {
    //             console.log(`⛔ Skipping ${symbol}-EQ as candle strength is ${strength.toFixed(3)}% (< 50%)`);
    //             return false;
    //         }


    //         const trend = open > close ? "bearish" : "bullish";
    //         const isNearLow = open === high ? true :false;
    //         const isNearHigh = open === low ? true :false;
    //         if (trend === "bearish" && isNearLow) {
    //             console.log(`📉 Bearish trend detected for ${symbol}-EQ`);
    //             await subscribeToStock("SELL",symbol,high,0.99*low,low);
    //             return symbol; // Return the stock symbol if it meets criteria
    //         } else if (trend === "bullish" && isNearHigh) {
    //             console.log(`📈 Bullish trend detected for ${symbol}-EQ`);
    //             await subscribeToStock("BUY",symbol,low,1.01*high,high);
    //             return symbol; // Return the stock symbol if it meets criteria
    //         }
    //         return false; // Return false if stock does not meet criteria
    //     } catch (error) {
    //         if (error.code === 429) {
    //             console.error(`⚠️ Rate limit reached for ${symbol}-EQ. Retrying after some time...`);
    //             await new Promise(resolve => setTimeout(resolve, delay * 2)); // Exponential backoff
    //         } else {
    //             console.error(`❌ Error fetching data for ${symbol}-EQ:`, error);
    //         }
    //         return false;
    //     }
    // }
};
