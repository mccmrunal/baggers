const fs = require("fs");
const xlsx = require("xlsx");

module.exports = {
  logTradeResult: async function (dateepoch, symbol, trend, entryPrice, stopLoss, targetPrice, result) {
    try {
      const filePath = "trade_results.xlsx";
      const sheetName = "TradeResults";
      const epochTime = dateepoch;
      const date = new Date(epochTime * 1000); // Convert epoch to Date

      // Check if file exists, if not, create it
      let workbook, worksheet;
      if (!fs.existsSync(filePath)) {
        workbook = xlsx.utils.book_new();
        worksheet = xlsx.utils.aoa_to_sheet([
          ["Date", "Symbol", "Trend", "Entry Price", "Stop Loss", "Target Price", "Result", "Loss/profit %"],
        ]);
        xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);
        xlsx.writeFile(workbook, filePath);
      }

      // Read the existing file
      workbook = xlsx.readFile(filePath);
      worksheet = workbook.Sheets[sheetName] || xlsx.utils.aoa_to_sheet([]);

      // Convert sheet data to JSON format (array of arrays)
      let sheetData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

      // Calculate loss/profit percentage
      let lossPercentage = "1"; // Default value for profitable trades
      if (result === "LOSS") {
        lossPercentage = "-" + ((Math.abs(entryPrice - stopLoss) / entryPrice) * 100).toFixed(3);
      } else if (result === "NO TRADE") {
        lossPercentage = "0";
      } else if (typeof result === "object" && result.type === "CLOSED") {
        lossPercentage = result.profit; // If result is an object, extract profit value
      }

      // Append new row with trade details
      sheetData.push([date.toLocaleString(), symbol, trend, entryPrice, stopLoss, targetPrice, Number(lossPercentage) > 0.00?"PROFIT":"LOSS", Number(lossPercentage)]);

      // Convert data back to worksheet & update workbook
      const updatedSheet = xlsx.utils.aoa_to_sheet(sheetData);
      workbook.Sheets[sheetName] = updatedSheet;
      xlsx.writeFile(workbook, filePath);

      console.log(`📊 Trade result logged in Excel: ${symbol} - ${result} (Loss %: ${lossPercentage})`);
    } catch (error) {
      console.error("❌ Error logging trade result:", error);
    }
  },
};
