import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { NSELive } from 'nse-api-package'; // Import the class correctly
let nselive = new NSELive(); // Create an instance of the class
import test1 from './test1.js'; // Must include .js extension


const app = express();
app.use(cors());
app.use(bodyParser.json());

const port = 3000;

// Function to fetch stock quote
async function stockQuote(symbol) {
  try {
    const data = await nselive.tradeInfo(symbol);
    return data;
  } catch (error) {
    console.error('Error fetching stock data:', error);
    return { error: 'Failed to fetch stock data' };
  }
}

// API endpoint
app.get('/', async (req, res) => {
  const data = await stockQuote(req.query.stockName);
  res.json(data);
});

app.get('/stocks', async (req, res) => {
  let data =  await test1();
  res.json(data);
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
