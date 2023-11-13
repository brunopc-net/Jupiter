const axios = require('axios');
const fs = require('fs');

const geocodes = [
    {name: "montreal", loc: "45.51,-73.56"}, //OK
    {name: "trois-rivieres", loc: "46.34,-72.54"}, //OK
    {name: "quebec", loc: "46.80,-71.22", aqicity: "Quebec City"}, //OK
    {name: "gatineau", loc: "45.47,-75.82"}, //OK
    {name: "bromont", loc: "45.32,-72.65", aqicity:"Granby"},
    {name: "sherbrooke", loc: "45.40,-71.89"}, //OK
    {name: "parcmauricie", loc: "46.756,-72.810", aqicity:"Shawinigan"}, //OK
    {name: "montmegentic", loc: "45.442,-71.133", aqicity: "Ditton"},
    {name: "monttremblant", loc: "46.186,-74.614", aqicity: "Saint-faustin"},
    {name: "saintcelestin", loc: "46.228,-72.440", aqicity: "trois-rivieres"}, //OK
    {name: "icar", loc: "45.680,-74.024", aqicity: "Blainville"},
    {name: "shkarting", loc: "45.600,-73.138", aqicity: "Otterburn Park"}
];

const TWC_FORECAST_CONFIG = {
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
}

class ApiService {
    constructor(request){
        this.request = request;
    }

    execute(func){
        axios(this.request)
            .then((resp) => {
                console.log(this.request.method+" request to "+this.request.url);
                func(resp);
            }).catch(function (error) {
                console.log(error);
            })
    }
}

class FileService {
    constructor(){
    }

    createDir(name){
        if (!fs.existsSync(name)){
            fs.mkdirSync(name);
        }
    }

    export(weather_report){
        const place = weather_report.place.name;
        this.createDir("www");
        this.createDir("www/"+place);
        const fullpath = "www/"+place+"/"+place+".json";

        fs.writeFile(fullpath, JSON.stringify(weather_report), (err) => {
            if (err) console.log(err);
            else console.log("Data exported to "+fullpath);
        });
        const html = '<head><meta http-equiv="refresh" content="0; url='+place+'.json" /></head>';
        fs.writeFile("www/"+place+"/index.html", html, (err) => {
            if (err) console.log(err);
        });
    }
}

function getWeatherReport(weather){
    return {
        time: weather.validTimeLocal,
        cond: weather.wxPhraseLong,
        hum: weather.relativeHumidity,
        temp: {
            absolute: weather.temperature,
            feels_like: weather.temperatureFeelsLike
        },
        prec:{
            rain: weather.precip1Hour,
            snow: weather.snow1Hour,
        },
        uv: weather.uvIndex,
        wind: weather.windSpeed+"@"+weather.windDirection
    }
}

function getForecastReport(forecast){
    var forecast_report = [];
    for(var i = 0; i < forecast.validTimeLocal.length ; i++) {
        forecast_report.push({
            time: forecast.validTimeLocal[i],
            cond: forecast.wxPhraseLong[i],
            hum: forecast.relativeHumidity[i],
            temp: {
                absolute: forecast.temperature[i],
                feels_like: forecast.temperatureFeelsLike[i]
            },
            prec:{
                chance: forecast.precipChance[i],
                type: forecast.precipType[i],
                rain: forecast.qpf[i],
                snow: forecast.qpfSnow[i],
            },
            uv: forecast.uvIndex[i],
            wind: forecast.windSpeed[i]+"@"+forecast.windDirection[i]
        });
    }
    return forecast_report;
}

function buildWeatherReport(place, weather, forecast){
    return {
        place: place,
        weather: getWeatherReport(weather),
        forecast: getForecastReport(forecast)
    };
}

function getForecast(response, place){
    return response.data.dal[TWC_FORECAST_CONFIG.endpoint.forecast][
        "duration:"+TWC_FORECAST_CONFIG.forecast_duration+";"+
        "geocode:"+place.loc+";"+
        "units:"+TWC_FORECAST_CONFIG.units
    ].data;
}

function getCurrentWeather(response, place){
    return response.data.dal[TWC_FORECAST_CONFIG.endpoint.weather][
        "geocode:"+place.loc+";"+
        "units:"+TWC_FORECAST_CONFIG.units
    ].data;
}

function getRequests(){
    const currentWeatherRequests = geocodes.map(code => { return {
        name: TWC_FORECAST_CONFIG.endpoint.weather,
        params: {
            geocode: code.loc,
            units: TWC_FORECAST_CONFIG.units
        }
    }});
    const forecastRequests = geocodes.map(code => { return {
        name: TWC_FORECAST_CONFIG.endpoint.forecast,
        params: {
            duration: TWC_FORECAST_CONFIG.forecast_duration,
            geocode: code.loc,
            units: TWC_FORECAST_CONFIG.units
        }
    }});
    console.log(JSON.stringify(currentWeatherRequests.concat(forecastRequests)));
    return currentWeatherRequests.concat(forecastRequests);
}

new ApiService({
    method: "POST",
    url: TWC_FORECAST_CONFIG.url,
    data: getRequests()
}).execute((response) => {
    for(const place of geocodes){
        const weather = getCurrentWeather(response, place);
        const forecast = getForecast(response, place);
        const weather_report = buildWeatherReport(place, weather, forecast);
        new FileService(place.name+".json").export(weather_report);
    }
})