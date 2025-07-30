import { useState, useEffect } from 'react'
import './App.css'

// OpenWeatherMap API configuration
const WEATHER_API_KEY = import.meta.env.VITE_WEATHER_API_KEY || '68b549863894e3bf4d498a6c21776923'
const GEOCODING_BASE_URL = 'https://api.openweathermap.org/geo/1.0/direct'
const WEATHER_BASE_URL = 'https://api.openweathermap.org/data/3.0/onecall'

// Debug: Check if API key is loaded
console.log('API Key loaded:', WEATHER_API_KEY ? 'Yes' : 'No')
console.log('API Key value:', WEATHER_API_KEY)

// Function to get weather icon based on weather condition
const getWeatherIcon = (weatherData) => {
  if (!weatherData || !weatherData.current || !weatherData.current.weather || !weatherData.current.weather[0]) {
    return '01d'; // Default clear sky icon
  }

  const weather = weatherData.current.weather[0];
  

  
  // If we have an icon code from the API, use it
  if (weather.icon) {
    return weather.icon;
  }
  
  // Fallback: map weather ID to icon codes (more reliable than description)
  if (weather.id) {
    // Thunderstorm
    if (weather.id >= 200 && weather.id < 300) return '11d';
    // Drizzle
    if (weather.id >= 300 && weather.id < 400) return '09d';
    // Rain
    if (weather.id >= 500 && weather.id < 600) return '10d';
    // Snow
    if (weather.id >= 600 && weather.id < 700) return '13d';
    // Atmosphere (mist, fog, etc.)
    if (weather.id >= 700 && weather.id < 800) return '50d';
    // Clear
    if (weather.id === 800) return '01d';
    // Clouds
    if (weather.id >= 801 && weather.id <= 804) return '02d';
  }
  
  // Fallback: map weather description to icon codes
  const description = weather.description.toLowerCase();
  
  if (description.includes('clear')) return '01d';
  if (description.includes('cloud')) return '02d';
  if (description.includes('rain')) return '10d';
  if (description.includes('snow')) return '13d';
  if (description.includes('thunder')) return '11d';
  if (description.includes('mist') || description.includes('fog')) return '50d';
  if (description.includes('drizzle')) return '09d';
  
  return '01d'; // Default fallback
}

function App() {
  const [countries, setCountries] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedCountry, setSelectedCountry] = useState(null)
  const [weatherData, setWeatherData] = useState(null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [weatherError, setWeatherError] = useState(null)

  // Fetch all countries
  const fetchAllCountries = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('https://studies.cs.helsinki.fi/restcountries/api/all')
      if (!response.ok) {
        throw new Error('Failed to fetch countries')
      }
      const data = await response.json()
      // Sort countries alphabetically by common name
      const sortedData = data.sort((a, b) => a.name.common.localeCompare(b.name.common))
      setCountries(sortedData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Search countries by name
  const searchCountries = async (name) => {
    if (!name.trim()) {
      setCountries([])
      return
    }
    
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`https://studies.cs.helsinki.fi/restcountries/api/name/${encodeURIComponent(name)}`)
      if (!response.ok) {
        if (response.status === 404) {
          setCountries([])
          return
        }
        throw new Error('Failed to search countries')
      }
      const data = await response.json()
      const countriesData = Array.isArray(data) ? data : [data]
      // Sort countries alphabetically by common name
      const sortedData = countriesData.sort((a, b) => a.name.common.localeCompare(b.name.common))
      setCountries(sortedData)
    } catch (err) {
      setError(err.message)
      setCountries([])
    } finally {
      setLoading(false)
    }
  }

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value
    setSearchTerm(value)
    
    if (value.trim()) {
      searchCountries(value)
    } else {
      setCountries([])
    }
  }

  // Test API key with a simple weather call
  const testAPIKey = async () => {
    try {
      const testUrl = `https://api.openweathermap.org/data/2.5/weather?q=London&appid=${WEATHER_API_KEY}&units=metric`
      console.log('Testing API key with URL:', testUrl)
      const response = await fetch(testUrl)
      console.log('Test response status:', response.status)
      if (response.ok) {
        const data = await response.json()
        console.log('Test successful:', data.name, data.main.temp)
        
        // Test icon URL
        if (data.weather && data.weather[0] && data.weather[0].icon) {
          const iconUrl = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`
          console.log('Testing icon URL:', iconUrl)
          
          // Test if icon loads
          const iconResponse = await fetch(iconUrl)
          console.log('Icon response status:', iconResponse.status)
          if (iconResponse.ok) {
            console.log('Icon URL is accessible')
          } else {
            console.log('Icon URL failed:', iconResponse.status)
          }
        }
        
        return true
      } else {
        console.log('Test failed:', response.status, response.statusText)
        return false
      }
    } catch (err) {
      console.error('Test error:', err)
      return false
    }
  }

  // Fetch coordinates using Geocoding API
  const fetchCoordinates = async (city, countryCode) => {
    if (!city) return null
    
    try {
      const query = countryCode ? `${city},${countryCode}` : city
      const url = `${GEOCODING_BASE_URL}?q=${encodeURIComponent(query)}&limit=1&appid=${WEATHER_API_KEY}`
      
      console.log('Geocoding URL:', url)
      console.log('API Key being used:', WEATHER_API_KEY)
      
      const response = await fetch(url)
      if (!response.ok) {
        console.error('Geocoding response error:', response.status, response.statusText)
        throw new Error(`Failed to fetch coordinates: ${response.status} ${response.statusText}`)
      }
      const data = await response.json()
      console.log('Geocoding response:', data)
      return data.length > 0 ? data[0] : null
    } catch (err) {
      console.error('Geocoding error:', err)
      return null
    }
  }

  // Fetch weather data using OneCall API
  const fetchWeatherData = async (lat, lon) => {
    if (!lat || !lon) return
    
    setWeatherLoading(true)
    setWeatherError(null)
    try {
      const response = await fetch(
        `${WEATHER_BASE_URL}?lat=${lat}&lon=${lon}&exclude=minutely,hourly,daily,alerts&appid=${WEATHER_API_KEY}&units=metric`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch weather data')
      }
      const data = await response.json()
      console.log('OneCall API response:', data)
      console.log('Current weather data:', data.current)
      console.log('Weather array:', data.current.weather)
      setWeatherData(data)
    } catch (err) {
      setWeatherError(err.message)
    } finally {
      setWeatherLoading(false)
    }
  }

  // Fetch weather data for a city (two-step process)
  const fetchWeatherDataForCity = async (city, countryCode) => {
    if (!city) return
    
    setWeatherLoading(true)
    setWeatherError(null)
    
    try {
      // Try the two-step process first
      const locationData = await fetchCoordinates(city, countryCode)
      
      if (locationData) {
        // Step 2: Get weather data using OneCall API
        await fetchWeatherData(locationData.lat, locationData.lon)
      } else {
        // Fallback: Try direct weather API call
        console.log('Geocoding failed, trying direct weather API...')
        await fetchWeatherDataDirect(city, countryCode)
      }
      
    } catch (err) {
      setWeatherError(err.message)
      setWeatherLoading(false)
    }
  }

  // Fallback: Fetch weather data directly using city name
  const fetchWeatherDataDirect = async (city, countryCode) => {
    try {
      const query = countryCode ? `${city},${countryCode}` : city
      const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(query)}&appid=${WEATHER_API_KEY}&units=metric`
      
      console.log('Direct weather API URL:', url)
      
      const response = await fetch(url)
      if (!response.ok) {
        // If OpenWeatherMap fails, try a free alternative
        console.log('OpenWeatherMap failed, trying free alternative...')
        await fetchWeatherDataFree(city)
        return
      }
      
      const data = await response.json()
      console.log('Direct weather response:', data)
      
      // Convert the response to match OneCall format
      const convertedData = {
        current: {
          temp: data.main.temp,
          feels_like: data.main.feels_like,
          humidity: data.main.humidity,
          pressure: data.main.pressure,
          wind_speed: data.wind.speed,
          weather: data.weather
        }
      }
      
      setWeatherData(convertedData)
    } catch (err) {
      console.error('Direct weather API error:', err)
      // Try free alternative as last resort
      await fetchWeatherDataFree(city)
    } finally {
      setWeatherLoading(false)
    }
  }

  // Free weather API fallback (no API key required)
  const fetchWeatherDataFree = async (city) => {
    try {
      console.log('Using free weather API for:', city)
      
      // Using wttr.in API (free, no API key required)
      const response = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`)
      
      if (!response.ok) {
        throw new Error('Free weather API also failed')
      }
      
      const data = await response.json()
      console.log('Free weather response:', data)
      
      if (data.current_condition && data.current_condition[0]) {
        const current = data.current_condition[0]
        
        // Convert to match our format
        const convertedData = {
          current: {
            temp: parseFloat(current.temp_C),
            feels_like: parseFloat(current.FeelsLikeC),
            humidity: parseInt(current.humidity),
            pressure: parseInt(current.pressure),
            wind_speed: parseFloat(current.windspeedKmph) / 3.6, // Convert km/h to m/s
            weather: [{
              description: current.weatherDesc[0].value,
              icon: '01d' // Default clear sky icon for free API
            }]
          }
        }
        
        setWeatherData(convertedData)
      } else {
        throw new Error('No weather data available')
      }
    } catch (err) {
      console.error('Free weather API error:', err)
      setWeatherError('Weather data unavailable - please check your API key or try again later')
    } finally {
      setWeatherLoading(false)
    }
  }

  // Show detailed view for a specific country
  const showCountryDetails = (country) => {
    setSelectedCountry(country)
    setWeatherData(null)
    setWeatherError(null)
    
    // Fetch weather for the capital city using two-step process
    if (country.capital && country.capital.length > 0) {
      fetchWeatherDataForCity(country.capital[0], country.cca2)
    }
  }

  // Go back to countries list
  const goBack = () => {
    setSelectedCountry(null)
  }

  // Load all countries on component mount
  useEffect(() => {
    fetchAllCountries()
    // Test API key on component mount
    testAPIKey()
  }, [])

  // Render detailed country view
  const renderCountryDetails = () => {
    const country = selectedCountry
    return (
      <div className="country-details">
        <button onClick={goBack} className="back-btn">
          ← Back to Countries
        </button>
        
        <div className="country-detail-card">
          <div className="country-header">
            <h2>{country.name.common}</h2>
            {country.flags && (
              <img 
                src={country.flags.png} 
                alt={`Flag of ${country.name.common}`}
                className="country-detail-flag"
              />
            )}
          </div>
          
          <div className="country-info">
            <p><strong>Official Name:</strong> {country.name.official}</p>
            <p><strong>Capital:</strong> {country.capital?.join(', ') || 'N/A'}</p>
            <p><strong>Region:</strong> {country.region}</p>
            <p><strong>Subregion:</strong> {country.subregion || 'N/A'}</p>
            <p><strong>Population:</strong> {country.population?.toLocaleString()}</p>
            <p><strong>Languages:</strong> {country.languages ? Object.values(country.languages).join(', ') : 'N/A'}</p>
            <p><strong>Currencies:</strong> {country.currencies ? Object.keys(country.currencies).join(', ') : 'N/A'}</p>
            <p><strong>Time Zones:</strong> {country.timezones?.join(', ') || 'N/A'}</p>
            <p><strong>Area:</strong> {country.area ? `${country.area.toLocaleString()} km²` : 'N/A'}</p>
            <p><strong>Borders:</strong> {country.borders?.join(', ') || 'No land borders'}</p>
          </div>

          {/* Weather Information */}
          {(country.capital && country.capital.length > 0) && (
            <div className="weather-section">
              <h3>Weather in {country.capital[0]}</h3>
              
              {weatherLoading && <div className="weather-loading">Loading weather data...</div>}
              
              {weatherError && (
                <div className="weather-error">Weather data unavailable: {weatherError}</div>
              )}
              
              {weatherData && (
                <div className="weather-card">
                  <div className="weather-main">
                    <div className="weather-temp">
                      {Math.round(weatherData.current.temp)}°C
                    </div>
                    <div className="weather-description">
                      {weatherData.current.weather[0].description}
                    </div>
                  </div>
                  
                  <div className="weather-details">
                    <div className="weather-detail">
                      <span className="weather-label">Feels like:</span>
                      <span className="weather-value">{Math.round(weatherData.current.feels_like)}°C</span>
                    </div>
                    <div className="weather-detail">
                      <span className="weather-label">Humidity:</span>
                      <span className="weather-value">{weatherData.current.humidity}%</span>
                    </div>
                    <div className="weather-detail">
                      <span className="weather-label">Wind:</span>
                      <span className="weather-value">{Math.round(weatherData.current.wind_speed)} m/s</span>
                    </div>
                    <div className="weather-detail">
                      <span className="weather-label">Pressure:</span>
                      <span className="weather-value">{weatherData.current.pressure} hPa</span>
                    </div>
                  </div>
                  
                  <div className="weather-icon">
                    <img 
                      src={`https://openweathermap.org/img/wn/${getWeatherIcon(weatherData)}@2x.png`}
                      alt={weatherData.current.weather[0].description}
                      onError={(e) => {
                        console.log('Icon load failed, trying fallback icon');
                        e.target.src = 'https://openweathermap.org/img/wn/01d@2x.png';
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Render countries list
  const renderCountriesList = () => {
    return (
      <>
        <div className="search-section">
          <input
            type="text"
            placeholder="Search countries by name..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="search-input"
          />
          <button onClick={fetchAllCountries} className="load-all-btn">
            Load All Countries
          </button>
        </div>

        {error && <div className="error">Error: {error}</div>}
        
        {loading && <div className="loading">Loading...</div>}

        <div className="countries-grid">
          {countries.map((country) => (
            <div key={country.cca3} className="country-card">
              <div className="country-header">
                <h3>{country.name.common}</h3>
                <button 
                  onClick={() => showCountryDetails(country)}
                  className="show-btn"
                >
                  Show
                </button>
              </div>
              <p><strong>Capital:</strong> {country.capital?.join(', ') || 'N/A'}</p>
              <p><strong>Region:</strong> {country.region}</p>
              <p><strong>Population:</strong> {country.population?.toLocaleString()}</p>
            </div>
          ))}
        </div>

        {!loading && !error && countries.length === 0 && searchTerm && (
          <div className="no-results">No countries found matching "{searchTerm}"</div>
        )}
      </>
    )
  }

  return (
    <div className="app">
      <h1>Countries Information</h1>
      
      {selectedCountry ? renderCountryDetails() : renderCountriesList()}
    </div>
  )
}

export default App
