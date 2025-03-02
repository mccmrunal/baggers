import React, { useState } from "react";
import "./App.css";

function App() {
  const [responseMessage, setResponseMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);

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
