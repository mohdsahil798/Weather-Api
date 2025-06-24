require('dotenv').config();
const express = require('express');
const WebSocket = require('ws');
const cron = require('node-cron');
const WeatherService = require('./weatherService');

const app = express();
const PORT = process.env.PORT || 3000;
const weatherService = new WeatherService(process.env.OPENWEATHER_API_KEY);

// WebSocket Server
const wss = new WebSocket.Server({ noServer: true });
const clients = new Map();

wss.on('connection', (ws, location) => {
  console.log(`New client connected for ${location}`);
  clients.set(ws, location);

  // Send initial data
  weatherService.getWeather(location)
    .then(data => ws.send(JSON.stringify(data)));

  ws.on('close', () => {
    console.log(`Client disconnected for ${location}`);
    clients.delete(ws);
  });
});

// HTTP Server
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Upgrade HTTP to WebSocket
server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const location = url.searchParams.get('location');
  
  // Validate location
  if (!location || location.trim().length < 2) {
    socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, location.trim());
  });
});

// Scheduled updates every 2 minutes
cron.schedule('*/2 * * * *', () => {
  clients.forEach((location, ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      weatherService.getWeather(location)
        .then(data => ws.send(JSON.stringify(data)));
    }
  });
});