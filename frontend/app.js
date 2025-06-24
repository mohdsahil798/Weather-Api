// Replace your WebSocket connection code with this:

function connectToWeatherStream() {
  const location = locationInput.value.trim();
  
  if (!location) {
    showError('Please enter a city name');
    return;
  }
  
  // Close existing connection
  if (websocket) {
    websocket.close();
  }
  
  // Create secure WebSocket connection
  try {
    // Create WebSocket with retry logic
    websocket = new WebSocket(
      `wss://weather-backend-rjug.onrender.com?location=${encodeURIComponent(location)}`
    );
    
    websocket.onopen = () => {
      console.log('WebSocket connection established');
      updateConnectionStatus('connected');
      hideError();
      weatherCard.classList.remove("hidden");
      locationDisplay.textContent = location;
    };
    
    websocket.onmessage = (event) => {
      console.log('Received data:', event.data);
      const data = JSON.parse(event.data);
      
      if (data.success) {
        updateWeather(data.data);
      } else {
        showError(data.message || "Error fetching weather data");
      }
    };
    
    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      showError("Connection error. Please try again.");
      updateConnectionStatus('error');
    };
    
    websocket.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      if (event.code !== 1000) { // 1000 is normal closure
        updateConnectionStatus('error');
        setTimeout(() => {
          console.log('Attempting reconnect...');
          connectToWeatherStream();
        }, 3000);
      }
    };
    
  } catch (error) {
    console.error('WebSocket creation error:', error);
    showError('Failed to create connection');
    updateConnectionStatus('error');
  }
}