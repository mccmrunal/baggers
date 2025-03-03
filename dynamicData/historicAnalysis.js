const fs = require("fs");
const xlsx = require("xlsx");
let excelLogger = require("./excelGenerator.js");

// Function to write trade results to Excel (without deleting previous data)



// Modified function to include logging
module.exports = {
    filterStocks: async function (fyers, symbol, startDay,delay = 15) {
        try {
            await new Promise(resolve => setTimeout(resolve, delay));

            let startTimeDay = startDay;
            let endTime = parseInt(startTimeDay) + 5 * 60; // First 5-minute candle

            // Fetch first 5-minute candle
            const firstCandleInp = {
                symbol: `NSE:${symbol}-EQ`,
                resolution: "5",
                date_format: "0",
                range_from: startTimeDay,
                range_to: endTime,
                cont_flag: "1"
            };

            const firstCandleResponse = await fyers.getHistory(firstCandleInp);
            if (!firstCandleResponse || !firstCandleResponse.candles || firstCandleResponse.candles.length === 0) {
                return false;
            }

            // Extract first candle data
            const [time, open, high, low, close, volume] = firstCandleResponse.candles[0];

            // Determine trend
            const trend = open > close ? "bearish" : "bullish";
            const isNearLow = open === high; // Bearish confirmation
            const isNearHigh = open === low; // Bullish confirmation

            // Variables for entry, stop-loss, and target
            let entryPrice, stopLoss, targetPrice;
            let tradeActive = false; // Track if entry is triggered

            // **Determine Entry Conditions Based on Trend**
            if (trend === "bearish" && isNearLow) {
                entryPrice = low;
                stopLoss = high;
                targetPrice = low - (low * 0.01); // 1% profit target
            } else if (trend === "bullish" && isNearHigh) {
                entryPrice = high;
                stopLoss = low;
                targetPrice = high + (high * 0.01); // 1% profit target
            } else {
                return "NO TRADE";
            }

            // Fetch full day's data
            let dayEndTime = parseInt(startTimeDay) + 345 * 60;
            const dailyInp = {
                symbol: `NSE:${symbol}-EQ`,
                resolution: "1",
                date_format: "0",
                range_from: endTime,
                range_to: dayEndTime,
                cont_flag: "1"
            };

            const dailyResponse = await fyers.getHistory(dailyInp);
            if (!dailyResponse || !dailyResponse.candles || dailyResponse.candles.length === 0) {
                return false;
            }

            for (let candle of dailyResponse.candles) {
                const [candleTime, candleOpen, candleHigh, candleLow, candleClose, candleVolume] = candle;

                // **Check for Entry**
                if (!tradeActive) {
                    if (trend === "bearish" && isNearLow && candleLow <= entryPrice) {
                        tradeActive = true;
                    } else if (trend === "bullish" && isNearHigh && candleHigh >= entryPrice) {
                        tradeActive = true;
                    }
                }

                // **Check Stop-loss and Target Only After Entry**
                if (tradeActive) {
                    if (trend === "bearish") {
                        if (candleHigh >= stopLoss) {
                            console.log(`❌ LOSS: Stop-loss hit at ${stopLoss} for ${symbol}`);
                            excelLogger.logTradeResult(symbol, trend, entryPrice, stopLoss, targetPrice, "LOSS");
                            return "LOSS";
                        }
                        if (candleLow <= targetPrice) {
                            console.log(`✅ PROFIT: Target hit at ${targetPrice} for ${symbol}`);
                            excelLogger.logTradeResult(symbol, trend, entryPrice, stopLoss, targetPrice, "PROFIT");
                            return "PROFIT";
                        }
                    } else if (trend === "bullish") {
                        if (candleLow <= stopLoss) {
                            console.log(`❌ LOSS: Stop-loss hit at ${stopLoss} for ${symbol}`);
                            excelLogger.logTradeResult(symbol, trend, entryPrice, stopLoss, targetPrice, "LOSS");
                            return "LOSS";
                        }
                        if (candleHigh >= targetPrice) {
                            console.log(`✅ PROFIT: Target hit at ${targetPrice} for ${symbol}`);
                            excelLogger.logTradeResult(symbol, trend, entryPrice, stopLoss, targetPrice, "PROFIT");
                            return "PROFIT";
                        }
                    }
                }
            }

            console.log(`📌 No Trade Executed for ${symbol}`);
            excelLogger.logTradeResult(symbol, trend, entryPrice, stopLoss, targetPrice, "NO TRADE");
            return "NO TRADE";
        } catch (error) {
            if (error.code === 429) {
                console.error(`⚠️ Rate limit reached for ${symbol}-EQ. Retrying after some time...`);
                await new Promise(resolve => setTimeout(resolve, delay * 2));
            }
            return false;
        }
    }
};
