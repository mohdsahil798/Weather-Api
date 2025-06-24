const url = require("url");
require("dotenv").config();
const express = require("express");
const WebSocket = require("ws");
const axios = require("axios");
const cors = require("cors");
const http = require("http");

const app = express();
const PORT = process.env.PORT || 10000;

// Verify API Key
const API_KEY = process.env.OPENWEATHER_API_KEY;
if (!API_KEY) {
  console.error("FATAL ERROR: OPENWEATHER_API_KEY not set!");
  process.exit(1);
} else {
  console.log("Weather API Key Verified");
}

// Middleware
app.use(cors());
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// WebSocket Server
const wss = new WebSocket.Server({ noServer: true });

// Weather service function
async function getWeather(location) {
  try {
    console.log(`Fetching weather for: ${location}`);
    const response = await axios.get(
      "https://api.openweathermap.org/data/2.5/weather",
      {
        params: {
          q: location,
          appid: API_KEY,
          units: "metric",
        },
        timeout: 5000,
      }
    );

    return {
      success: true,
      data: {
        location: response.data.name,
        temp: response.data.main.temp,
        humidity: response.data.main.humidity,
        description: response.data.weather[0].description,
        icon: response.data.weather[0].icon,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error(
      "Weather fetch error:",
      error.response?.data || error.message
    );
    return {
      success: false,
      message: error.response?.data?.message || "Weather fetch failed",
    };
  }
}

// ===== HTTP ROUTES =====
// Health endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Service is healthy",
    timestamp: new Date().toISOString(),
  });
});

// Weather endpoint (HTTP version)
app.get("/weather", async (req, res) => {
  const location = req.query.location;

  if (!location) {
    return res.status(400).json({ error: "Missing location parameter" });
  }

  try {
    const weatherData = await getWeather(location);
    res.json(weatherData);
  } catch (error) {
    res.status(500).json({
      error: "Internal server error",
    });
  }
});

// Root endpoint
app.get("/", (req, res) => {
  res.send(`
    <h1>Weather Backend Service</h1>
    <p>Service is running properly</p>
    <ul>
      <li><a href="/health">Health Check</a></li>
      <li><a href="/weather?location=London">Example Weather Request</a></li>
      <li>WebSocket endpoint: ws://localhost:${PORT}</li>
    </ul>
  `);
});

// ===== WEBSOCKET HANDLING =====
// ===== WEBSOCKET HANDLING =====
// Improved WebSocket upgrade handler
server.on("upgrade", (request, socket, head) => {
  console.log("Received WebSocket upgrade request");

  try {
    // Parse URL more reliably
    const parsedUrl = new URL(request.url, `http://${request.headers.host}`);
    const pathname = parsedUrl.pathname;

    // Only handle requests to /weather path
    if (pathname !== "/weather") {
      console.log(`Invalid WebSocket path: ${pathname}`);
      socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
      socket.destroy();
      return;
    }

    const location = parsedUrl.searchParams.get("location");

    if (!location) {
      console.log("No location parameter in WebSocket request");
      socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
      socket.destroy();
      return;
    }

    // Verify WebSocket headers
    if (request.headers["upgrade"]?.toLowerCase() !== "websocket") {
      console.log("Invalid upgrade header");
      socket.write("HTTP/1.1 426 Upgrade Required\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request, location);
    });
  } catch (error) {
    console.error("Upgrade error:", error);
    socket.destroy();
  }
});

// Improved WebSocket connection handler
wss.on("connection", (ws, request, location) => {
  console.log(`New WebSocket connection for ${location}`);

  // Heartbeat to keep connection alive
  ws.isAlive = true;
  ws.on("pong", () => (ws.isAlive = true));

  // Error handler
  ws.on("error", (error) => {
    console.error(`WebSocket error for ${location}:`, error);
  });

  // Initial data send
  const sendWeatherData = async () => {
    try {
      const data = await getWeather(location);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      }
    } catch (error) {
      console.error(`Weather fetch failed for ${location}:`, error);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            success: false,
            message: "Failed to get weather data",
          })
        );
      }
    }
  };

  // Send initial data immediately
  sendWeatherData();

  // Set up periodic updates (every 2 minutes)
  const interval = setInterval(() => {
    // Check connection health
    if (!ws.isAlive) {
      ws.terminate();
      return;
    }

    ws.isAlive = false;
    ws.ping();

    // Send new weather data
    sendWeatherData();
  }, 120000);

  // Cleanup on close
  ws.on("close", () => {
    console.log(`WebSocket closed for ${location}`);
    clearInterval(interval);
  });
});

// ws.on("error", (error) => {
//   console.error(`WebSocket error for ${location}:`, error);
// });

// Start server
server.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`🔌 WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(
    `🌤️  HTTP Weather endpoint: http://localhost:${PORT}/weather?location=London`
  );
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
  console.log(`🏠 Home: http://localhost:${PORT}\n`);
});
