import axios from 'axios';
import { useState } from 'react';

function App() {
  const [message, setMessage] = useState('');
  const [stockName, setStockName] = useState(''); // Manage input state

  function fetchStockDetails() {
    console.log(`Fetching details for stock: ${stockName}`);

    axios.get(`http://localhost:3000/?stockName=${stockName}`)
      .then((response) => {
        console.log(response.data); // Log the data, not setMessage
        setMessage(response.data);
      })
      .catch((error) => {
        console.error('There was an error fetching the stock details!', error);
      });
  }
  function fetchAllIndices() {
    axios.get(`http://localhost:3000/indices`)
      .then((response) => {
        setMessage(response.data);
      })
      .catch((error) => {
        console.error('There was an error fetching the indices!', error);
      });
  }

  return (
    <div>
      <input 
        type="text" 
        value={stockName}
        onChange={(e) => setStockName(e.target.value)}
        placeholder="Enter stock name" 
      />
      <button onClick={fetchStockDetails}>Fetch Stock Details</button>
      <button onClick={fetchAllIndices}>Fetch All Indices</button>
      <div>Stock details: {JSON.stringify(message)}</div>
    </div>
  );
}

export default App;
