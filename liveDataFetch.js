const fs = require('fs');
const { sendEmail } = require('./mail');
const { sendWhatsAppMessages } = require('./whatsapp');
const { fyersDataSocket } = require("fyers-api-v3");
const {placeOrder} = require('./orderPlacement');

// **Read Fyers Token**
const TOKEN_FILE = "fyers_token.json";
let tokenData;
try {
    tokenData = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf-8"));
} catch (error) {
    console.error("❌ Error reading Fyers token:", error.message);
    process.exit(1); // Exit to prevent further issues
}
const fyersOrderdata = new fyersDataSocket(tokenData.access_token);

// fyersOrderdata.on("lit", () => {
//     console.log("❌ WebSocket disconnected. Market might be closed.");
// });

// **Maps to Track Stocks**
const subscribedStocks = new Map();
const trackedStocks = new Map();
const entryTaken = new Map();
let lastProcessedTime = new Map();

// **Configure WebSocket**
fyersOrderdata.mode(fyersOrderdata.LiteMode);

// **WebSocket Event Handlers**
fyersOrderdata.on("error", (errMsg) => {
    if(errMsg.code === 12001){
        console.log("Market is closed");
    }else{
        console.error("WebSocket Error:", errMsg);
    }
}
);

fyersOrderdata.on("connect", () => {
    console.log("🔗 Connected to WebSocket");
    if (subscribedStocks.size > 0) {
        fyersOrderdata.subscribe([...subscribedStocks.keys()]);
    }
});

fyersOrderdata.on("message", async (message) => {
    if (message.type === "sf" && global.analysisDone === true) {
        const { symbol, ltp } = message;
        const now = Date.now();
        if (lastProcessedTime.has(symbol) && now - lastProcessedTime.get(symbol) < 1000) { 
            return; // Ignore updates that come within 2 seconds
        }
        lastProcessedTime.set(symbol, now);
        console.log(`📊 Live update: ${symbol} - ${ltp}`);

        if (trackedStocks.has(symbol) && !entryTaken.has(symbol)) {
            const stock = trackedStocks.get(symbol);
            stock.lastPrice = ltp;

            if (stock.tradeType === "BUY" && ltp >= stock.entry) {
                let orderDetails = await placeOrder(symbol, "BUY", ltp, stock.stopLoss, stock.target, subscribedStocks);
                
                if (orderDetails) { 
                    entryTaken.set(symbol, {
                        tradeType: stock.tradeType,
                        stopLoss: stock.stopLoss,
                        target: stock.target,
                        entry: stock.entry,
                        stopLossId: orderDetails[1]?.body?.id, // Ensure valid indexing
                        targetId: orderDetails[2]?.body?.id,
                    });

                    trackedStocks.delete(symbol);
                    await notifyUser(symbol, ltp, "BUY");
                }
            } else if (stock.tradeType === "SELL" && ltp <= stock.entry) {
                let orderDetails = await placeOrder(symbol, "SELL", ltp, stock.stopLoss, stock.target, subscribedStocks);

                if (orderDetails) {
                    entryTaken.set(symbol, {
                        tradeType: stock.tradeType,
                        stopLoss: stock.stopLoss,
                        target: stock.target,
                        entry: stock.entry,
                        stopLossId: orderDetails[1]?.body?.id,
                        targetId: orderDetails[2]?.body?.id,
                    });

                    trackedStocks.delete(symbol);
                    await notifyUser(symbol, ltp, "SELL");
                }
            }
        } else if (entryTaken.has(symbol)) {
            const stock = entryTaken.get(symbol);
            if (stock.tradeType === "BUY" && ltp >= stock.target) {
                await fyersOrderdata.cancel_order({ id: stock.stopLossId });
                entryTaken.delete(symbol);
                console.log(`✅ Profit booked for ${symbol}`);
                await fyersOrderdata.unsubscribe([symbol], false);
            } else if (stock.tradeType === "BUY" && ltp <= stock.stopLoss) {
                await fyersOrderdata.cancel_order({ id: stock.targetId });
                entryTaken.delete(symbol);
                console.log(`❌ Loss booked for ${symbol}`);
                await fyersOrderdata.unsubscribe([symbol], false);
            } else if (stock.tradeType === "SELL" && ltp <= stock.target) {
                await fyersOrderdata.cancel_order({ id: stock.stopLossId });
                entryTaken.delete(symbol);
                console.log(`✅ Profit booked for ${symbol}`);
                await fyersOrderdata.unsubscribe([symbol], false);
            } else if (stock.tradeType === "SELL" && ltp >= stock.stopLoss) {
                await fyersOrderdata.cancel_order({ id: stock.targetId });
                entryTaken.delete(symbol);
                console.log(`❌ Loss booked for ${symbol}`);
                await fyersOrderdata.unsubscribe([symbol], false);
            }
        }
    }
});


fyersOrderdata.on("close", () => console.log("❌ WebSocket disconnected"));

fyersOrderdata.autoreconnect();
fyersOrderdata.connect();

// **Subscribe to a Stock**
async function subscribeToStock(tradeType, symbol, stopLoss, target, entry) {
    const stockSymbol = `NSE:${symbol}-EQ`;

    if (!subscribedStocks.has(stockSymbol)) {
        subscribedStocks.set(stockSymbol, { tradeType, stopLoss, target, entry });
        trackedStocks.set(stockSymbol, { tradeType, stopLoss, target, entry, lastPrice: null });
        await fyersOrderdata.subscribe([stockSymbol]);
        console.log(`✅ Subscribed to ${stockSymbol} | SL: ${stopLoss}, Target: ${target}, Entry: ${entry}`);
    } else {
        console.log(`⚠️ Already subscribed to ${stockSymbol}, updating values`);
        subscribedStocks.set(stockSymbol, { tradeType, stopLoss, target, entry });
        trackedStocks.set(stockSymbol, { tradeType, stopLoss, target, entry, lastPrice: null });
    }
}

// **Send Notifications**
async function notifyUser(symbol, ltp, tradeType) {
    console.log(`🚀 ${tradeType} Entry triggered for ${symbol} at ${ltp}`);
    const message = `Entry taken for ${symbol} at ${ltp} for ${tradeType}`;
    await sendEmail(message);
    await sendWhatsAppMessages(message);
}

module.exports = { subscribeToStock };
