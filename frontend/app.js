document.addEventListener("DOMContentLoaded", () => {
  const locationInput = document.getElementById("location-input");
  const connectBtn = document.getElementById("connect-btn");
  const weatherCard = document.querySelector(".weather-card");
  const locationDisplay = document.querySelector(".location");
  const tempDisplay = document.querySelector(".temperature");
  const descDisplay = document.querySelector(".description");
  const humidityDisplay = document.querySelector(".humidity");
  const timeDisplay = document.querySelector(".update-time");
  const weatherIcon = document.getElementById("weather-icon");
  const errorDisplay = document.getElementById("error-message");

  let websocket = null;

  connectBtn.addEventListener("click", () => {
    const location = locationInput.value.trim();

    if (!location) {
      showError("Please enter a city name");
      return;
    }

    // Close existing connection
    if (websocket) websocket.close();

    // Establish new WebSocket connection
    websocket = new WebSocket(
      `ws://localhost:3000?location=${encodeURIComponent(location)}`
    );

    websocket.onopen = () => {
      hideError();
      weatherCard.classList.remove("hidden");
      locationDisplay.textContent = location;
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.success) {
        updateWeather(data.data);
      } else {
        showError(data.message || "Error fetching weather data");
      }
    };

    websocket.onerror = (error) => {
      showError("Connection error. Please try again.");
      console.error("WebSocket error:", error);
    };

    websocket.onclose = () => {
      console.log("WebSocket connection closed");
    };
  });

  function updateWeather(data) {
    tempDisplay.textContent = `${data.temp}°C`;
    descDisplay.textContent = data.description;
    humidityDisplay.textContent = `Humidity: ${data.humidity}%`;
    timeDisplay.textContent = `Last update: ${new Date(
      data.timestamp
    ).toLocaleTimeString()}`;
    weatherIcon.src = `https://openweathermap.org/img/wn/${data.icon}@2x.png`;
    weatherIcon.alt = data.description;
  }

  function showError(message) {
    errorDisplay.textContent = message;
    errorDisplay.classList.remove("hidden");
    weatherCard.classList.add("hidden");
  }

  function hideError() {
    errorDisplay.classList.add("hidden");
  }
});
