



import { fyersModel as FyersAPI } from "fyers-api-v3";
import axios from "axios";
var fyers = new FyersAPI();
fyers.setAppId("Z0HUY8E6FI-100");
fyers.setRedirectUrl(`https://127.0.0.1`);
fyers.setAccessToken("eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJhcGkuZnllcnMuaW4iLCJpYXQiOjE3NDE0NjE2MjYsImV4cCI6MTc0MTQ4MDIyNiwibmJmIjoxNzQxNDYxNjI2LCJhdWQiOlsieDowIiwieDoxIiwieDoyIiwiZDoxIiwiZDoyIiwieDoxIiwieDowIiwieDoxIiwieDowIl0sInN1YiI6ImFjY2Vzc190b2tlbiIsImF0X2hhc2giOiJnQUFBQUFCbnpKaDZaRHVsQnFoTTFVeEJ6MkdvNXlsWHFwOENWalRKXy1HRTd1ZFA4MFdINHZ6WGwxT3BWN0dib05wRFRyMUc1cGFHYm9Pd2tNMUJtenNHMTl3VzN2dnJFZlJHbW14ZnBiY1FHdXVzbkh6RlJ0ST0iLCJkaXNwbGF5X25hbWUiOiJTSEFOVEFOVSBWSUpBWVJBTyBCT1JHQU1XQVIiLCJvbXMiOiJLMSIsImhzbV9rZXkiOiIwMDQ1YzFhNzA1MTkyN2M4YzcwNTVjNWIzMWEzN2NkZThiYmFhODUyNDg5NjhmNmM3YjNhZmJlZCIsImlzRGRwaUVuYWJsZWQiOiJOIiwiaXNNdGZFbmFibGVkIjoiTiIsImZ5X2lkIjoiWFMwODY0NyIsImFwcFR5cGUiOjEwMCwicG9hX2ZsYWciOiJOIn0.U1IEhnj9ctuKy_n2MdFIlISAV9YvjQtLG-Jtn-NxBjM");
import fs from "fs";
let startTimeDay = "1736221500";
let endTimeDay = parseInt(startTimeDay) + 5*60;
const stockArray = JSON.parse(fs.readFileSync('./dynamicData/fno_stock_names.json', 'utf8'));
let requestCount= 0;
var t0 = performance.now();
for (const symbols of stockArray) {
//     if (requestCount % 10 === 0) {
//         await new Promise(resolve => setTimeout(resolve, 500));
//     }
//     requestCount++; 
//     const inp = {
//         symbol: `NSE:${symbols.symbol}-EQ`,
//         resolution:"5",
//         date_format: "0",
//         range_from:startTimeDay ,
//         range_to: endTimeDay,
//         cont_flag: "1"
//     };
// const response = await fyers.getHistory(inp);
// const [time, open, high, low, close,volume] = response.candles[0];
//     if(open === high || open === low){
//     let config = {
//         method: 'get',
//         maxBodyLength: Infinity,
//         url: `https://api.upstox.com/v2/historical-candle/${symbols.asset_key}/1minute/2025-01-07/2025-01-07`,
//         headers: { 
//         'Accept': 'application/json'
//         }
//         };
        
//         let data = await  axios(config);
        
//         if(!checkValues(response.candles[0],data.data.data.candles.splice(-5))){
//             console.log(symbols.symbol)
//         };
//     }



// function checkValues(arrFyers, arrUpstox){
// const [time, open, high, low, close,volume] = response.candles[0];

// const openUpstox = arrUpstox[4][1];  // Open of the first 1-min candle (9:15 AM)
// const closeUpstox = arrUpstox[0][4]; // Close of the last 1-min candle (9:19 AM)
// const highUpstox = Math.max(...arrUpstox.map(candle => candle[2])); // Highest high
// const lowUpstox = Math.min(...arrUpstox.map(candle => candle[3]));  // Lowest low

// // Creating 5-min candle

// return  high === highUpstox && low === lowUpstox

// }  
let config = {
    method: 'get',
    maxBodyLength: Infinity,
    url: `https://api.upstox.com/v2/historical-candle/${symbols.asset_key}/1minute/2025-01-07/2025-01-07`,
    headers: { 
    'Accept': 'application/json'
    }
    };
    
    let data = await  axios(config);
    console.log(data.status)
    console.log(requestCount++);
}
var t1 = performance.now();

console.log("Call to doSomething took " + (t1 - t0) + " milliseconds.")

  