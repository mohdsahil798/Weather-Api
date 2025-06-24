const axios = require('axios');

class WeatherService {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('API key is required');
    }
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.openweathermap.org/data/2.5';
  }

  async getWeather(location) {
    try {
      const response = await axios.get(`${this.baseUrl}/weather`, {
        params: {
          q: location,
          appid: this.apiKey,
          units: 'metric'
        }
      });
      
      return {
        success: true,
        data: {
          location: response.data.name,
          temp: response.data.main.temp,
          humidity: response.data.main.humidity,
          description: response.data.weather[0].description,
          icon: response.data.weather[0].icon,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('WeatherService error:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Weather fetch failed'
      };
    }
  }
}

module.exports = WeatherService;