const fs = require("fs");
const path = require("path");
const FyersAPI = require("fyers-api-v3");
const fyers = new FyersAPI.fyersModel();

fyers.setAppId(process.env.appId);
fyers.setRedirectUrl(`https://127.0.0.1`);

const TOKEN_FILE = "fyers_token.json"; // File to store token details
process.env.access_token = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf-8")).access_token;

// Ensure trade balance is only calculated once
if (!global.tradeBalance) {
    global.tradeBalance = {
        calculated: false,
        balance: 0
    };
}

async function placeOrder(symbol, type, ltp, stoploss, target, subscribedStocks) {
    const FyersAPI = require("fyers-api-v3");
    const fyers = new FyersAPI.fyersModel();

    fyers.setAppId(process.env.appId);
    fyers.setRedirectUrl(`https://127.0.0.1`);
    fyers.setAccessToken(process.env.access_token);
        let subscribedStockslength = subscribedStocks.size;

    // Calculate trade balance only once
    if (!global.tradeBalance.calculated) {
        let fundsData = await fyers.get_funds();
        const availableBalance = fundsData.fund_limit.find(item => item.title === 'Available Balance');

        if (subscribedStockslength > 13) {
            let stocksToInvestIn = Math.floor(subscribedStockslength * 0.8); // 80% of stocks
            global.tradeBalance.balance = Math.floor(availableBalance.equityAmount / stocksToInvestIn);
            console.log(`Investing ₹${global.tradeBalance.balance} per stock in ${stocksToInvestIn} stocks.`);
        } else {
            global.tradeBalance.balance = Math.floor(availableBalance.equityAmount / subscribedStockslength);
        }
        global.tradeBalance.calculated = true; // Mark as calculated
    }

    let side = type === "BUY" ? 1 : -1;
    console.log(`📢 Placing ${type} order for ${symbol}`);

    const qty = Math.floor((global.tradeBalance.balance * 5.0) / ltp);

    if (qty <= 0) {
        console.error("❌ Invalid quantity: Allocation too low for the given LTP.");
        return;
    }

    function roundToTickSize(price, tickSize = 0.05) {
        return Math.round(price / tickSize) * tickSize;
    }

    const reqBody = [
        {
            "symbol": symbol,
            "qty": qty,
            "type": 2,
            "side": side,
            "productType": "INTRADAY",
            "limitPrice": 0,
            "stopPrice": 0,
            "disclosedQty": 0,
            "validity": "DAY",
            "offlineOrder": false,
            "stopLoss": 0,
            "takeProfit": 0
        },
        {
            "symbol": symbol, // Stop-loss order
            "qty": qty,
            "type": 3,
            "side": -side,
            "productType": "INTRADAY",
            "limitPrice": 0,
            "stopPrice": roundToTickSize(stoploss),
            "disclosedQty": 0,
            "validity": "DAY",
            "offlineOrder": false,
            "stopLoss": 0,
            "takeProfit": 0
        },
        {
            "symbol": symbol, // Target order
            "qty": qty,
            "type": 1,
            "side": -side,
            "productType": "INTRADAY",
            "limitPrice": roundToTickSize(target),
            "stopPrice": 0,
            "disclosedQty": 0,
            "validity": "DAY",
            "offlineOrder": false,
            "stopLoss": 0,
            "takeProfit": 0
        }
    ];

    console.log(`📝 Order Details:`, reqBody);

    try {
        const response = await fyers.place_multi_order(reqBody);
        console.log("✅ Order placed successfully:", symbol);
        return response.data;
    } catch (error) {
        console.error("❌ Order placement failed:", error);
    }
}

async function cancel_order(data) {
    const FyersAPI = require("fyers-api-v3");
    const fyers = new FyersAPI.fyersModel();

    fyers.setAppId(process.env.appId);
    fyers.setRedirectUrl(`https://127.0.0.1`);
    fyers.setAccessToken(process.env.access_token);
    try{
    let response = await fyers.cancel_order(data);
    console.log(response);
    }catch(err){
        console.log(err);
    }
}

module.exports = { placeOrder,cancel_order };
