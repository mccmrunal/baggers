import React, { useState } from "react";
import "./App.css";
import * as xlsx from "xlsx";

function App() {
  const [responseMessage, setResponseMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);

  const fetchHistoricalData = async (from, to) => {
    console.log("Fetching data from:", from, "to:", to);
    setTimer(0);

    let timeElapsed = 0; 

    const timerInterval = setInterval(() => {
      timeElapsed += 1;
      setTimer(timeElapsed);
    }, 1000);
    setLoading(true);
  
    try {
      const response = await fetch(
        `http://localhost:3000/historicalData?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
      );
  
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
  
      const blob = await response.blob(); // Convert response to binary data (Excel file)
      clearInterval(timerInterval);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "trade_results.xlsx"; // Set the file name
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a); // Clean up

      let workbook = xlsx.readFile("trade_results.xlsx");
      let sheet_name_list = workbook.SheetNames;
      let xlData = xlsx.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);
      let profit = 0;
      let loss = 0;
      let profitCount = 0;
      let lossCount = 0;
      let tradeCount = 0;
      let profitPercentage = 0;
      let lossPercentage = 0;
      let profitTotal = 0;
      let lossTotal = 0;
      let profitPercentageTotal = 0;
      let lossPercentageTotal = 0;
      for (let i = 1; i < xlData.length; i++) {
        if (xlData[i][6] === "PROFIT") {
          profit += xlData[i][3];
          profitCount++;
        } else if (xlData[i][6] === "LOSS") {
          loss += xlData[i][3];
          lossCount++;
        }
        tradeCount++;
      }
      profitTotal = profit;
      lossTotal = loss;
      profitPercentageTotal = profitPercentage;
      lossPercentageTotal = lossPercentage;
      profitPercentage = (profit / profitTotal) * 100;
      lossPercentage = (loss / lossTotal) * 100;
      setResponseMessage(
        `Number of trades: ${tradeCount}\nTotal profit: ${profitTotal}\nTotal loss: ${lossTotal}\nTotal profit percentage: ${profitPercentageTotal}\nTotal loss percentage: ${lossPercentageTotal}\nNumber of trades that resulted in profit: ${profitCount}\nNumber of trades that resulted in loss: ${lossCount}\nNumber of trades that resulted in no trade: ${tradeCount - profitCount - lossCount}`
      );
    } catch (error) {
      clearInterval(timerInterval);
      console.error("Error fetching Excel file:", error);
      setResponseMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchStockDetails = async (timeframe) => {
    setLoading(true);
    setResponseMessage("");
    setTimer(0);

    let timeElapsed = 0; 

    const timerInterval = setInterval(() => {
      timeElapsed += 1;
      setTimer(timeElapsed);
    }, 1000);

    try {
      const response = await fetch("http://localhost:3000/stocks?timeframe=" + timeframe);
      const data = await response.json();

      if (Array.isArray(data)) {
        clearInterval(timerInterval);

        data.forEach((symbol) => {
          const url = `https://www.tradingview.com/chart/?symbol=NSE%3A${symbol}&interval=${timeframe}`;
          window.open(url, "_blank");
        });

        setLoading(false);
        setResponseMessage(`Stocks opened in ${timeElapsed} seconds!`);
      }
    } catch (error) {
      clearInterval(timerInterval);
      console.error("Error fetching data:", error);
      setResponseMessage("Error fetching data");
      setLoading(false);
    }
  };

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  return (
    <div className="App">
      <header>
        <h1>📈 Baggers UI</h1>
      </header>
      <main>
        <div className="button-container">
          <button className="chart-btn" onClick={() => fetchStockDetails(5)} disabled={loading}>
            {loading ? "Fetching..." : "5 Min Chart"}
          </button>

          <button className="chart-btn" onClick={() => fetchStockDetails(15)} disabled={loading}>
            {loading ? "Fetching..." : "15 Min Chart"}
          </button>
          
          <button className="history-btn" onClick={() => fetchHistoricalData(from, to)} disabled={loading}>
            {loading ? "Fetching..." : "Fetch Historical Data"}
          </button>
        </div>
        <div className="date-picker">
          <label htmlFor="from">From:</label>
          <input type="date" id="from" name="from" onChange={(e) => setFrom(e.target.value)} />
          <label htmlFor="to">To:</label>
          <input type="date" id="to" name="to" onChange={(e) => setTo(e.target.value)} />
        </div>
        {loading && (
          <div className="loader-container">
            <div className="loader"></div>
            <p>Fetching data... {timer} sec</p>
          </div>
        )}

        <p className="response-message">{responseMessage}</p>
      </main>
      <footer>
        <p>&copy; 2025 Baggers. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;
