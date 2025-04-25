// Weather App Configuration
const config = {
    apiKey: "e7df2fb32d295933f6f1bfd6f17821bb",
    apiUrl: "https://api.openweathermap.org/data/2.5/weather?units=metric&q=",
    iconBaseUrl: "https://openweathermap.org/img/wn/"
};

// DOM Elements
const elements = {
    searchBox: document.querySelector(".search input"),
    searchBtn: document.querySelector(".search button"),
    weatherIcon: document.querySelector(".weather-icon"),
    weatherContainer: document.querySelector(".weather"),
    loadingIndicator: document.querySelector(".weather-loading"),
    city: document.querySelector(".city"),
    temp: document.querySelector(".temp"),
    weatherDesc: document.querySelector(".weather-description"),
    windSpeed: document.querySelector(".wind-speed"),
    humidity: document.querySelector(".humidity-percent"),
    pressure: document.querySelector(".pressure"),
    unitButtons: document.querySelectorAll(".unit-btn"),
    errorMessage: document.createElement('p')
};

// Create error message element
elements.errorMessage.className = 'error-message';
document.querySelector('.card').appendChild(elements.errorMessage);

// State
let currentUnit = "celsius";
let currentWeatherData = null;

// Initialize the app
function init() {
    // Load last searched city from localStorage
    const lastCity = localStorage.getItem("lastSearchedCity");
    if (lastCity) {
        checkWeather(lastCity);
    } else {
        checkWeather("New York"); // Default city
    }
    
    // Event Listeners
    elements.searchBtn.addEventListener("click", handleSearch);
    elements.searchBox.addEventListener("keypress", (e) => {
        if (e.key === "Enter") handleSearch();
    });
    
    elements.unitButtons.forEach(btn => {
        btn.addEventListener("click", handleUnitChange);
    });
}

// Handle search
function handleSearch() {
    const city = elements.searchBox.value.trim();
    if (!city) {
        showError("Please enter a city name");
        return;
    }
    checkWeather(city);
}

// Handle unit change
function handleUnitChange(e) {
    const unit = e.target.dataset.unit;
    if (unit === currentUnit) return;
    
    currentUnit = unit;
    elements.unitButtons.forEach(btn => {
        btn.classList.toggle("active", btn.dataset.unit === unit);
    });
    
    if (currentWeatherData) {
        updateTemperatureDisplay(currentWeatherData);
    }
}

// Fetch weather data
async function checkWeather(city) {
    showLoading();
    hideError();
    
    try {
        const response = await fetch(`${config.apiUrl}${city}&appid=${config.apiKey}`);
        
        if (!response.ok) {
            throw new Error(response.status === 404 ? "City not found" : "Weather data unavailable");
        }
        
        const data = await response.json();
        currentWeatherData = data;
        
        updateWeatherDisplay(data);
        localStorage.setItem("lastSearchedCity", city);
        
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// Update UI with weather data
function updateWeatherDisplay(data) {
    elements.city.textContent = data.name;
    elements.weatherDesc.textContent = data.weather[0].description;
    elements.windSpeed.textContent = `${Math.round(data.wind.speed)} km/h`;
    elements.humidity.textContent = `${data.main.humidity}%`;
    elements.pressure.textContent = `${data.main.pressure} hPa`;
    
    updateTemperatureDisplay(data);
    updateWeatherIcon(data.weather[0].icon);
    
    // Show weather container
    elements.weatherContainer.style.display = "block";
}

// Update temperature display based on current unit
function updateTemperatureDisplay(data) {
    let temp = data.main.temp;
    if (currentUnit === "fahrenheit") {
        temp = (temp * 9/5) + 32;
    }
    elements.temp.textContent = `${Math.round(temp)}°${currentUnit === "celsius" ? "C" : "F"}`;
}

// Update weather icon
function updateWeatherIcon(iconCode) {
    elements.weatherIcon.src = `${config.iconBaseUrl}${iconCode}@2x.png`;
}

// Show loading state
function showLoading() {
    elements.weatherContainer.style.display = "none";
    elements.loadingIndicator.style.display = "flex";
    elements.errorMessage.style.display = "none";
}

// Hide loading state
function hideLoading() {
    elements.loadingIndicator.style.display = "none";
}

// Show error message
function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.style.display = "block";
    elements.weatherContainer.style.display = "none";
}

// Hide error message
function hideError() {
    elements.errorMessage.style.display = "none";
}

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", init);