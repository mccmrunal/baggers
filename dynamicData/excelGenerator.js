let fs = require("fs"); 
let xlsx = require("xlsx"); 
module.exports = {
     logTradeResult: async function(dateepoch,symbol, trend, entryPrice, stopLoss, targetPrice, result) {
        const filePath = "trade_results.xlsx";
        const epochTime = dateepoch; // Replace with your epoch timestamp
        const date = new Date(epochTime * 1000); // Convert to milliseconds
        //create file is doesnt exists
        if (!fs.existsSync(filePath
        )) {
            const workbook = xlsx.utils.book_new();
            const worksheet = xlsx.utils.aoa_to_sheet([["Date", "Symbol", "Trend", "Entry Price", "Stop Loss", "Target Price", "Result", "Loss/profit %"]]);
            xlsx.utils.book_append_sheet(workbook, worksheet, "TradeResults");
            xlsx.writeFile(workbook, filePath);
        }
        let sheetName = "TradeResults";
        let workbook, worksheet, sheetData;
    
        // Calculate loss percentage (only for losses)
        let lossPercentage = result === "LOSS" ? "-"+((Math.abs(entryPrice - stopLoss) / entryPrice) * 100).toFixed(3)  : "1";
        if(result === "NO TRADE"){
            lossPercentage = 0;
        }
        if(result.type === "CLOSED"){
            lossPercentage = result.profit
        }
        // Check if the file exists
        if (fs.existsSync(filePath)) {
            workbook = xlsx.readFile(filePath); // Load existing workbook
            worksheet = workbook.Sheets[sheetName] || xlsx.utils.aoa_to_sheet([]);
        } else {
            workbook = xlsx.utils.book_new();
            worksheet = xlsx.utils.aoa_to_sheet([["Date", "Symbol", "Trend", "Entry Price", "Stop Loss", "Target Price", "Result", "Loss/profit %"]]);
            xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);
        }
    
        // Convert sheet data to JSON format (array of arrays)
        sheetData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    
        // Append new row with trade details
        sheetData.push([date.toLocaleString(), symbol, trend, entryPrice, stopLoss, targetPrice, result, lossPercentage]);
    
        // Convert data back to worksheet & update workbook
        const updatedSheet = xlsx.utils.aoa_to_sheet(sheetData);
        workbook.Sheets[sheetName] = updatedSheet;
        xlsx.writeFile(workbook, filePath);
    
        console.log(`📊 Trade result logged in Excel: ${symbol} - ${result} (Loss %: ${lossPercentage})`);
    }
}