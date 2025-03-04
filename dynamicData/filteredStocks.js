module.exports = {
    filterStocks: async function (fyers, symbol,timeframe, delay = 15,timestamp) { // Default delay of 1 second
        try {            
            await new Promise(resolve => setTimeout(resolve, delay)); // Delay to prevent rate limiting
            let startTimeDay = timestamp;
            let endTime =  parseInt(startTimeDay) + timeframe*60;
            const inp = {
                symbol: `NSE:${symbol}-EQ`,
                resolution:timeframe,
                date_format: "0",
                range_from:startTimeDay ,
                range_to: endTime,
                cont_flag: "1"
            };

            const response = await fyers.getHistory(inp);

            if (!response || !response.candles || response.candles.length === 0) {
                console.log(`⚠️ No data available for ${symbol}-EQ`);
                return false;
            }

            const [time, open, high, low, close,volume] = response.candles[0];
            const trend = open > close ? "bearish" : "bullish";
            const isNearLow = open === high ? true :false;
            const isNearHigh = open === low ? true :false;
            if (trend === "bearish" && isNearLow) {
                console.log(`📉 Bearish trend detected for ${symbol}-EQ`);
                return symbol; // Return the stock symbol if it meets criteria
            } else if (trend === "bullish" && isNearHigh) {
                console.log(`📈 Bullish trend detected for ${symbol}-EQ`);
                return symbol; // Return the stock symbol if it meets criteria
            }

            return false; // Return false if stock does not meet criteria
        } catch (error) {
            if (error.code === 429) {
                console.error(`⚠️ Rate limit reached for ${symbol}-EQ. Retrying after some time...`);
                await new Promise(resolve => setTimeout(resolve, delay * 2)); // Exponential backoff
            } else {
                console.error(`❌ Error fetching data for ${symbol}-EQ:`, error);
            }
            return false;
        }
    }
};
