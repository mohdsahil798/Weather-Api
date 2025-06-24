require('dotenv').config();
const express = require('express');
const WebSocket = require('ws');
const cron = require('node-cron');
const WeatherService = require('./weatherService');
const cors = require('cors');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 10000; // Use Render's port
const weatherService = new WeatherService(process.env.OPENWEATHER_API_KEY);

// Enhanced CORS configuration
app.use(cors({
  origin: [
    'https://your-netlify-app.netlify.app', // Your live frontend
    'http://localhost:5500' // Local development
  ],
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true
}));

// Create HTTP server explicitly
const server = http.createServer(app);

// WebSocket Server
const wss = new WebSocket.Server({ 
  noServer: true,
  clientTracking: true // Track connected clients
});

const clients = new Map();

// Handle HTTP server upgrade
server.on('upgrade', (request, socket, head) => {
  console.log('Received upgrade request');
  
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const location = url.searchParams.get('location');
    
    console.log(`Upgrade request for location: ${location}`);
    
    if (!location || location.trim().length < 2) {
      console.log('Invalid location, destroying socket');
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, location.trim());
    });
  } catch (error) {
    console.error('Upgrade error:', error);
    socket.destroy();
  }
});

wss.on('connection', (ws, location) => {
  console.log(`New client connected for ${location}`);
  clients.set(ws, location);

  // Send initial data
  weatherService.getWeather(location)
    .then(data => {
      ws.send(JSON.stringify(data));
      console.log(`Initial data sent for ${location}`);
    })
    .catch(error => {
      console.error(`Error getting weather for ${location}:`, error);
      ws.send(JSON.stringify({
        success: false,
        message: 'Error fetching weather data'
      }));
    });

  ws.on('message', (message) => {
    console.log(`Received message from ${location}: ${message}`);
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error for ${location}:`, error);
  });

  ws.on('close', () => {
    console.log(`Client disconnected for ${location}`);
    clients.delete(ws);
  });
});

// Scheduled updates
cron.schedule('*/2 * * * *', () => {
  console.log(`Running scheduled update for ${clients.size} clients`);
  
  clients.forEach((location, ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      weatherService.getWeather(location)
        .then(data => {
          ws.send(JSON.stringify(data));
          console.log(`Updated data sent for ${location}`);
        })
        .catch(error => {
          console.error(`Update error for ${location}:`, error);
        });
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    clients: wss.clients.size,
    uptime: process.uptime()
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready at ws://localhost:${PORT}`);
});