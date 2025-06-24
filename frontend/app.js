function connectToWeatherStream() {
  const location = locationInput.value.trim();
  
  if (!location) {
    showError('Please enter a city name');
    return;
  }
  
  // Update UI state
  updateConnectionStatus('connecting');
  
  // Close existing connection
  if (websocket) {
    websocket.close();
    websocket = null;
  }
  
  // Create secure WebSocket connection
  try {
    const wsUrl = `wss://weather-backend-rjug.onrender.com/weather?location=${encodeURIComponent(location)}`;
    console.log('Connecting to:', wsUrl);
    
    websocket = new WebSocket(wsUrl);
    
    // Set a connection timeout (5 seconds)
    const connectionTimeout = setTimeout(() => {
      if (websocket?.readyState !== WebSocket.OPEN) {
        websocket?.close();
        showError('Connection timeout. Please try again.');
        updateConnectionStatus('error');
      }
    }, 5000);
    
    websocket.onopen = () => {
      clearTimeout(connectionTimeout);
      console.log('WebSocket connection established');
      updateConnectionStatus('connected');
      hideError();
      weatherCard.classList.remove("hidden");
      locationDisplay.textContent = location;
    };
    
    websocket.onmessage = (event) => {
      try {
        console.log('Received data:', event.data);
        const data = JSON.parse(event.data);
        
        if (data?.success) {
          updateWeather(data.data);
        } else {
          showError(data?.message || "Error fetching weather data");
        }
      } catch (e) {
        console.error('Failed to parse message:', e);
        showError('Invalid data received from server');
      }
    };
    
    websocket.onerror = (error) => {
      clearTimeout(connectionTimeout);
      console.error('WebSocket error:', error);
      showError("Connection error. Please try again.");
      updateConnectionStatus('error');
    };
    
    websocket.onclose = (event) => {
      clearTimeout(connectionTimeout);
      console.log('WebSocket closed:', event.code, event.reason);
      
      // Only auto-reconnect for unexpected closures (not for user-initiated closes)
      if (event.code !== 1000 && !event.wasClean) {
        updateConnectionStatus('reconnecting');
        setTimeout(() => {
          if (!document.hidden) { // Only reconnect if page is visible
            console.log('Attempting reconnect...');
            connectToWeatherStream();
          }
        }, 3000);
      } else {
        updateConnectionStatus('disconnected');
      }
    };
    
  } catch (error) {
    console.error('WebSocket creation error:', error);
    showError('Failed to create connection');
    updateConnectionStatus('error');
  }
}