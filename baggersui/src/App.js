import React, { useState } from "react";
import "./App.css";

function App() {
  const [responseMessage, setResponseMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);

  const fetchStockDetails = async () => {
    setLoading(true);
    setResponseMessage("");
    setTimer(0);

    let timeElapsed = 0; // Local timer variable

    // Start the timer
    const timerInterval = setInterval(() => {
      timeElapsed += 1;
      setTimer(timeElapsed);
    }, 1000);

    try {
      const response = await fetch("http://localhost:3000/stocks");
      const data = await response.json();

      if (Array.isArray(data)) {
        clearInterval(timerInterval); // Stop timer when data is received

        // Open stock URLs
        data.forEach((symbol) => {
          const url = `https://www.tradingview.com/chart/?symbol=NSE%3A${symbol}`;
          window.open(url, "_blank");
        });

        setLoading(false);
        setResponseMessage(`Stocks opened in ${timeElapsed} seconds!`); // Use local timer variable
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
        <h1>Welcome to Baggers UI</h1>
      </header>
      <main>
        <button onClick={fetchStockDetails} disabled={loading}>
          {loading ? "Fetching..." : "Fetch Data"}
        </button>

        {loading && (
          <div className="loader-container">
            <div className="loader"></div>
            <p>Fetching data... {timer} sec</p>
          </div>
        )}

        <p>{responseMessage}</p>
      </main>
      <footer>
        <p>&copy; 2023 Baggers. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;
