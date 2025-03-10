async function placeOrder(symbol, type, ltp, stoploss, target, subscribedStocks) {
    let fs = require("fs");
    global.tradeBalance = {
        caculated:false,
        balance : 0
    }
    const path = require("path");
        // const logFilePath = path.join(__dirname, "fyers_order_log.txt");
    var FyersAPI = require("fyers-api-v3");
    var fyers = new FyersAPI.fyersModel();
    fyers.setAppId(process.env.appId);
    fyers.setRedirectUrl(`https://127.0.0.1`);
    const TOKEN_FILE = "fyers_token.json"; // File to store token details
    fyers.setAccessToken(JSON.parse(fs.readFileSync(TOKEN_FILE, "utf-8")).access_token);
    let fundsData = await fyers.get_funds();
    const availableBalance = fundsData.fund_limit.find(item => item.title === 'Available Balance');
    let subscribedStockslength = subscribedStocks.size;
    let tradeBalance = 0;
    function logToFile(data) {
        // const logFilePath = path.join(__dirname, "fyers_order_log.txt");
        const timestamp = new Date().toISOString();
        const logEntry = `${timestamp} - ${JSON.stringify(data, null, 2)}\n\n`;
    
        // fs.appendFile(logFilePath, logEntry, (err) => {
        //     if (err) {
        //         console.error("Error logging data to file:", err);
        //     }
        // });
    }
    if(!global.tradeBalance.caculated)
    {    if (subscribedStockslength > 13) {
            let stocksToInvestIn = Math.floor(subscribedStockslength * 0.8); // 80% of stocks
            tradeBalance = Math.floor(availableBalance.equityAmount / stocksToInvestIn);

            console.log(`Investing ₹${tradeBalance} per stock in ${stocksToInvestIn} stocks.`);
        } else {
            tradeBalance = Math.floor(availableBalance.equityAmount / subscribedStockslength);
        }
    global.tradeBalance.caculated = true;
    global.tradeBalance.balance = tradeBalance;
    }

    let side;
    if (type === "BUY") {
        side = 1
        // target = target - ltp;
        // stoploss = ltp - stoploss;
    } else {
        side = -1;
        // target = ltp - target;
        // stoploss = stoploss - ltp;
    }
    console.log(`📢 Placing ${type} order for ${symbol}`);

    const qty = Math.floor((global.tradeBalance.balance* 5.0)  / ltp);

    if (qty <= 0) {
        console.error("❌ Invalid quantity: Allocation too low for the given LTP.");
        return;
    }
    function roundToTickSize(price, tickSize = 0.05) {
        return Math.round(price / tickSize) * tickSize;
    }
    const reqBody =

        [{
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
            "symbol": symbol,//stoploss
            "qty": qty,
            "type": 3,
            "side": 0 - (side),
            "productType": "INTRADAY",
            "limitPrice": 0,
            "stopPrice": roundToTickSize(stoploss),
            "disclosedQty": 0,
            "validity": "DAY",
            "offlineOrder": false,
            "stopLoss": 0,
            "takeProfit": 0
        }, {
            "symbol": symbol,//target
            "qty": qty,
            "type": 1,
            "side": 0 - (side),
            "productType": "INTRADAY",
            "limitPrice": roundToTickSize(target),
            "stopPrice": 0,
            "disclosedQty": 0,
            "validity": "DAY",
            "offlineOrder": false,
            "stopLoss": 0,
            "takeProfit": 0
        }];


    console.log(`📝 Order Details:`, reqBody);

    try {
        // await logToFile(reqBody);
        const response = await fyers.place_multi_order(reqBody);
        // await logToFile(response);
        console.log("✅ Order placed successfully:", symbol);
        return response.data;
    } catch (error) {
        console.error("❌ Order placement failed:", error);
    }
}

module.exports = { placeOrder }