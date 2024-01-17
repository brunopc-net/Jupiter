const places = require('../../config/places');

const config = {
    endpoint: {
        alerts: "getSunWeatherAlertHeadlinesUrlConfig",
        weather: "getSunV3CurrentObservationsUrlConfig",
        forecast: "getSunV3HourlyForecastWithHeadersUrlConfig",
        pollen: "getSunIndexPollenDaypartUrlConfig"
    },
    forecast_duration: "3day",
    units: "m"
};


const currentWeatherRequests = places.map(place => { return {
    name: config.endpoint.weather,
    params: {
        geocode: place.geoLoc,
        units: config.units
    }
}});

const forecastRequests = places.map(place => { return {
    name: config.endpoint.forecast,
    params: {
        duration: config.forecast_duration,
        geocode: place.geoLoc,
        units: config.units
    }
}});

module.exports = { 
    config: config,
    request: {
        method: "POST",
        url: 'https://weather.com/api/v1/p/redux-dal',
        data: currentWeatherRequests.concat(forecastRequests)
    }
};