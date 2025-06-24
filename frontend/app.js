/****************************************************************
 * INITIALIZATION LOGS
 ****************************************************************/
console.log('[APP] Initializing weather application...');

/****************************************************************
 * DOM ELEMENTS
 ****************************************************************/
console.log('[APP] Loading DOM elements...');
const locationInput = document.getElementById('location-input');
const connectBtn = document.getElementById('connect-btn');
const weatherCard = document.querySelector('.weather-card');
const locationDisplay = document.querySelector('.location');
const tempDisplay = document.querySelector('.temperature');
const descriptionDisplay = document.querySelector('.description');
const humidityDisplay = document.querySelector('.humidity');
const updateTimeDisplay = document.querySelector('.update-time');
const weatherIcon = document.getElementById('weather-icon');
const errorMessage = document.getElementById('error-message');

// Verify all critical elements exist
const requiredElements = {
  locationInput, connectBtn, weatherCard, locationDisplay,
  tempDisplay, descriptionDisplay, humidityDisplay,
  updateTimeDisplay, weatherIcon, errorMessage
};

Object.entries(requiredElements).forEach(([name, element]) => {
  if (!element) {
    console.error(`[APP] CRITICAL: Missing DOM element - ${name}`);
  } else {
    console.log(`[APP] Found element: ${name}`);
  }
});

/****************************************************************
 * GLOBAL VARIABLES
 ****************************************************************/
let websocket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
console.log('[APP] Global variables initialized');

/****************************************************************
 * EVENT LISTENERS
 ****************************************************************/
console.log('[APP] Setting up event listeners...');
connectBtn.addEventListener('click', handleConnectClick);
console.log('[APP] Connect button listener added');

/****************************************************************
 * CORE FUNCTIONS
 ****************************************************************/

function handleConnectClick() {
  const location = locationInput.value.trim();
  console.log('[UI] Connect clicked for location:', location || '<empty>');
  
  if (!location) {
    showError('Please enter a city name');
    return;
  }
  
  connectToWeatherStream(location);
}

function connectToWeatherStream(location) {
  console.group('[WS] Connection Process');
  console.log('[WS] Location:', location);

  // Cleanup previous connection
  if (websocket) {
    console.log('[WS] Cleaning previous connection');
    websocket.onclose = null;
    websocket.close(1000, 'New connection requested');
  }

  updateUIState('connecting', `Connecting to ${location}...`);

  try {
    const wsUrl = new URL(`wss://weather-backend-rjug.onrender.com/weather`);
    wsUrl.searchParams.set('location', location);
    console.log('[WS] Connecting to:', wsUrl.href);

    websocket = new WebSocket(wsUrl);
    console.log('[WS] WebSocket state:', getReadyStateName(websocket.readyState));

    // Connection timeout (5 seconds)
    const connectionTimeout = setTimeout(() => {
      if (websocket?.readyState === WebSocket.CONNECTING) {
        console.warn('[WS] Connection timeout reached');
        websocket.close(1006, 'Timeout');
        handleConnectionError('Server not responding');
      }
    }, 5000);

    websocket.onopen = () => {
      clearTimeout(connectionTimeout);
      console.log('[WS] Connection established');
      console.log('[WS] Protocol:', websocket.protocol);
      updateUIState('connected', `Live data: ${location}`);
      weatherCard.classList.remove('hidden');
      startHeartbeat();
    };

    websocket.onmessage = (event) => {
      console.log('[WS] Received data:', event.data);
      try {
        const data = JSON.parse(event.data);
        console.log('[WS] Parsed data:', data);
        
        if (data.success) {
          updateWeatherData(data.data);
        } else {
          console.error('[WS] Server error:', data.message);
          showError(data.message || "Couldn't fetch weather");
        }
      } catch (e) {
        console.error('[WS] Parse error:', e, 'Raw data:', event.data);
        showError('Invalid server response');
      }
    };

    websocket.onerror = (error) => {
      clearTimeout(connectionTimeout);
      console.error('[WS] Connection error:', {
        error: error,
        readyState: websocket?.readyState,
        url: websocket?.url
      });
      handleConnectionError('Connection error');
    };

    websocket.onclose = (event) => {
      clearTimeout(connectionTimeout);
      stopHeartbeat();
      console.log('[WS] Connection closed:', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
      });
      
      if (event.code === 1008) { // Policy violation (invalid city)
        showError(`Weather data not available for ${location}`);
      } else if (!event.wasClean) {
        handleDisconnection(location);
      }
    };

  } catch (error) {
    console.error('[WS] Setup error:', error);
    handleConnectionError('Connection failed');
  }
  console.groupEnd();
}

/****************************************************************
 * WEATHER DATA HANDLING
 ****************************************************************/

function updateWeatherData(data) {
  console.log('[UI] Updating with:', data);
  
  locationDisplay.textContent = data.location;
  tempDisplay.textContent = `${data.temp}°C`;
  descriptionDisplay.textContent = data.description;
  humidityDisplay.textContent = `Humidity: ${data.humidity}%`;
  updateTimeDisplay.textContent = `Updated: ${formatTime(data.timestamp)}`;
  
  if (data.icon) {
    weatherIcon.src = `https://openweathermap.org/img/wn/${data.icon}@2x.png`;
    weatherIcon.alt = data.description;
    console.log('[UI] Weather icon set:', weatherIcon.src);
  }
  
  weatherCard.classList.remove('hidden');
  hideError();
}

/****************************************************************
 * CONNECTION MANAGEMENT
 ****************************************************************/

let heartbeatInterval;

function startHeartbeat() {
  console.log('[WS] Starting heartbeat');
  heartbeatInterval = setInterval(() => {
    if (websocket?.readyState === WebSocket.OPEN) {
      websocket.send('ping');
      console.log('[WS] Sent heartbeat ping');
    }
  }, HEARTBEAT_INTERVAL);
}

function stopHeartbeat() {
  console.log('[WS] Stopping heartbeat');
  clearInterval(heartbeatInterval);
}

function handleDisconnection(location) {
  reconnectAttempts++;
  console.warn(`[WS] Disconnected (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
  
  if (reconnectAttempts <= MAX_RECONNECT_ATTEMPTS) {
    updateUIState('reconnecting', `Reconnecting... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
    setTimeout(() => {
      console.log('[WS] Attempting reconnect...');
      connectToWeatherStream(location);
    }, 3000);
  } else {
    console.error('[WS] Max reconnection attempts reached');
    showError('Connection lost. Please refresh.');
  }
}

function handleConnectionError(message) {
  console.error('[ERROR]', message);
  showError(message);
  updateUIState('error', 'Connection error');
  weatherCard.classList.add('hidden');
}

/****************************************************************
 * UI FUNCTIONS
 ****************************************************************/

function showError(message) {
  console.error('[UI] Showing error:', message);
  errorMessage.textContent = message;
  errorMessage.classList.remove('hidden');
  weatherCard.classList.add('hidden');
}

function hideError() {
  console.log('[UI] Hiding error message');
  errorMessage.classList.add('hidden');
}

function updateUIState(state, message) {
  console.log(`[UI] State: ${state} - ${message}`);
  // Add visual status indicators if needed
}

/****************************************************************
 * UTILITY FUNCTIONS
 ****************************************************************/

function getReadyStateName(state) {
  const states = {
    0: 'CONNECTING',
    1: 'OPEN',
    2: 'CLOSING',
    3: 'CLOSED'
  };
  return states[state] || state;
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString();
}

/****************************************************************
 * INITIALIZATION COMPLETE
 ****************************************************************/
// console.log('[APP] Application initialized successfully');
// console.log('[APP] Ready for user interaction');

// Test WebSocket support
if (!window.WebSocket) {
  console.error('[APP] WebSocket not supported');
  showError('Your browser does not support live updates');
}