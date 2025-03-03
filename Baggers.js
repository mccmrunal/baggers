import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import test1 from './test1.js'; // Ensure test1.js exports the necessary functions

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

// Function to fetch stock quote with error handling
async function stockQuote(symbol) {
  try {
    if (!symbol) throw new Error("Stock symbol is required");
    const data = await nselive.tradeInfo(symbol);
    return data;
  } catch (error) {
    console.error("Error fetching stock data:", error.message);
    return { error: error.message || "Failed to fetch stock data" };
  }
}

// API Endpoints with error handling

app.get('/', async (req, res) => {
  try {
    const { stockName } = req.query;
    if (!stockName) {
      return res.status(400).json({ error: "Missing required parameter: stockName" });
    }
    const data = await stockQuote(stockName);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get('/stocks', async (req, res) => {
  try {
    const { timeframe } = req.query;
    if (!timeframe) {
      return res.status(400).json({ error: "Missing required parameter: timeframe" });
    }
   // Get current date in IST
let now = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });

// Extract year, month, day, and set time to 09:15 AM
let istDate = new Date(now);
istDate.setHours(9, 15, 0, 0); // Set to 9:15 AM IST

// Get the epoch time in seconds
let timestamp = Math.floor(istDate.getTime() / 1000);
    let data = await test1.fetchStocks(timestamp,null,timeframe);
    data = data.filter(item=>item !== false)
    res.json(data);
  } catch (error) {
    console.error("Error fetching stocks:", error);
    res.status(500).json({ error: "Failed to fetch stocks" });
  }
});

app.get('/historicalData', async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ error: "Missing required parameters: from and to" });
    }

    await test1.historicalData(from, to, res);
  } catch (error) {
    console.error("Error fetching historical data:", error.message);
    res.status(500).json({ error: "Failed to fetch historical data" });
  }
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Internal Server Error" });
});

app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
