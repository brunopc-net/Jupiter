const twn_request = {
    method: "POST",
    url: 'https://weather.com/api/v1/p/redux-dal',
    endpoint: {
        alerts: "getSunWeatherAlertHeadlinesUrlConfig",
        weather: "getSunV3CurrentObservationsUrlConfig",
        forecast: "getSunV3HourlyForecastWithHeadersUrlConfig",
        pollen: "getSunIndexPollenDaypartUrlConfig"
    },
    forecast_duration: "3day",
    units: "m"
};

module.exports = twn_request;