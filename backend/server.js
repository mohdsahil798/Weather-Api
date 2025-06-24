require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

// Verify API Key
const API_KEY = process.env.OPENWEATHER_API_KEY;
if (!API_KEY) {
  console.error('FATAL ERROR: OPENWEATHER_API_KEY not set!');
  process.exit(1);
} else {
  console.log('Weather API Key Verified');
}

// Middleware
app.use(cors());
app.use(express.json());

// Health endpoint
app.get('/health', (req, res) => {
  console.log('Health check request received');
  res.json({ 
    status: 'ok',
    message: 'Service is healthy',
    timestamp: new Date().toISOString()
  });
});

// Weather endpoint
app.get('/weather', async (req, res) => {
  const location = req.query.location;
  console.log(`Weather request received for: ${location}`);
  
  if (!location) {
    return res.status(400).json({ error: 'Missing location parameter' });
  }

  try {
    const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
      params: {
        q: location,
        appid: API_KEY,
        units: 'metric'
      },
      timeout: 5000
    });

    res.json({
      location: response.data.name,
      temp: response.data.main.temp,
      humidity: response.data.main.humidity,
      description: response.data.weather[0].description,
      icon: response.data.weather[0].icon
    });
  } catch (error) {
    console.error('Weather API error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to fetch weather data',
      details: error.response?.data?.message || error.message
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.send(`
    <h1>Weather Backend Service</h1>
    <p>Service is running properly</p>
    <ul>
      <li><a href="/health">Health Check</a></li>
      <li><a href="/weather?location=London">Example Weather Request</a></li>
    </ul>
  `);
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`🌤️  Weather endpoint: http://localhost:${PORT}/weather?location=London`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
  console.log(`🏠 Home: http://localhost:${PORT}\n`);
});