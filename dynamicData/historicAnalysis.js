const fs = require("fs");
const xlsx = require("xlsx");
const axios = require("axios");
let excelLogger = require("./excelGenerator.js");

module.exports = {
    filterStocks: async function (fyers, symbol, startDay, delay = 15) {
        try {
            await new Promise(resolve => setTimeout(resolve, delay));
            
            let startTimeDay = startDay;
            let endTime = parseInt(startTimeDay) + 5 * 60; // First 5-minute candle
            let dayEndTime = parseInt(startTimeDay) + 345 * 60; // Market close 3:30 PM
            let lastCandleTime = dayEndTime; // 3:20 PM candle
            
            // Fetch first 5-minute candle
            const date = new Date(startDay * 1000).toISOString().split('T')[0];
            let url =  `https://api.upstox.com/v2/historical-candle/${symbol.asset_key}/1minute/${date}/${date}`;
            if(date === new Date().toISOString().split('T')[0]){
                url =  `https://api.upstox.com/v2/historical-candle/intraday/${symbol.asset_key}/1minute`
            }
            let config = {
            method: 'get',
            maxBodyLength: Infinity,
            url: url,
            headers: { 
            'Accept': 'application/json'
            }
            };
            
            let data = await axios(config);
            if(data.data.data.candles.length === 0 ){
                return false;
            }
            let arrUpstox = data.data.data.candles.splice(0-5);
            const open = arrUpstox[4][1];  // Open of the first 1-min candle (9:15 AM)
            const close = arrUpstox[0][4]; // Close of the last 1-min candle (9:19 AM)
            const high = Math.max(...arrUpstox.map(candle => candle[2])); // Highest high
            const low = Math.min(...arrUpstox.map(candle => candle[3]));  // Lowest low
            
            
            const trend = open > close ? "bearish" : "bullish";
            const isNearLow = open === high;
            const isNearHigh = open === low;
            
            let entryPrice, stopLoss, targetPrice, tradeActive = false;
            const percentageChange = ((high - low) / low) * 100;
            const bodySize = Math.abs(close - open);
            const totalRange = high - low;
            const strength = (bodySize / totalRange) * 100;
            
            if (percentageChange > 1.5 || strength < 50) return "NO TRADE";
            if(trend && (isNearLow || isNearHigh) && (percentageChange < 1.5 && strength >= 50)){
                console.log(symbol)
            }
            if (open === close && close === high && high === low) {
                console.log(`${symbol.symbol} has hit a lower circuit`)
                return false;
            }
            
            if (trend === "bearish" && isNearLow) {
                entryPrice = low;
                stopLoss = high;
                targetPrice = low - (low * 0.01);
            } else if (trend === "bullish" && isNearHigh) {
                entryPrice = high;
                stopLoss = low;
                targetPrice = high + (high * 0.01);
            } else {
                return "NO TRADE";
            }
            
            const dailyInp = {
                symbol: `NSE:${symbol.symbol}-EQ`,
                resolution: "1",
                date_format: "0",
                range_from: endTime,
                range_to: dayEndTime,
                cont_flag: "1"
            };
            
            const dailyResponse = await fyers.getHistory(dailyInp);
            if (!dailyResponse || !dailyResponse.candles.length) return false;
            
            for (let candle of dailyResponse.candles) {
                const [candleTime, candleOpen, candleHigh, candleLow, candleClose] = candle;
                
                if (!tradeActive) {
                    if ((trend === "bearish" && candleLow <= entryPrice) ||
                        (trend === "bullish" && candleHigh >= entryPrice)) {
                        tradeActive = true;
                    }
                }
                
                if (tradeActive) {
                    if ((trend === "bearish" && candleHigh >= stopLoss) ||
                        (trend === "bullish" && candleLow <= stopLoss)) {
                        await excelLogger.logTradeResult(startDay, symbol.symbol, trend, entryPrice, stopLoss, targetPrice, "LOSS");
                        return "LOSS";
                    }
                    if ((trend === "bearish" && candleLow <= targetPrice) ||
                        (trend === "bullish" && candleHigh >= targetPrice)) {
                        await excelLogger.logTradeResult(startDay, symbol.symbol, trend, entryPrice, stopLoss, targetPrice, "PROFIT");
                        return "PROFIT";
                    }
                }
                
                if (tradeActive && candleTime >= lastCandleTime) {
                    let profit;

                    if (trend === "bullish") {
                        profit = candleClose - entryPrice; // Profit = Final close - Entry price
                    } else if (trend === "bearish") {
                        profit = entryPrice - candleClose; // Profit = Entry price - Final close
                    }
                
                    let status = profit >= 0 ? "PROFIT" : "LOSS"; // Determine trade outcome
                
                    await excelLogger.logTradeResult(startDay, symbol.symbol, trend, entryPrice, stopLoss, targetPrice, {
                        type: "CLOSED",
                        profit: ((profit/entryPrice)*100).toFixed(3),
                        status: status,
                    });
                
                    return `CLOSED at ${candleClose}`;
                }
            }
            return "NO TRADE";
        } catch (error) {
            if (error.code === 429) {
                console.log(error)
                await new Promise(resolve => setTimeout(resolve, delay * 2));
            }
            else{
                console.log(error)
            }
            return false;
        }
    }
};
