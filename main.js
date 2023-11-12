const axios = require('axios');
const fs = require('fs');

const geocodes = [
    {name: "montreal", loc: "45.51,-73.56"},
    {name: "troisrivieres", loc: "46.34,-72.54"},
    {name: "quebec", loc: "46.80,-71.22"},
    {name: "gatineau", loc: "45.47,-75.82"},
    {name: "bromont", loc: "45.32,-72.65"},
    {name: "sherbrooke", loc: "45.40,-71.89"},
    {name: "parcmauricie", loc: "46.756,-72.810"},
    {name: "montmegentic", loc: "45.442,-71.133"},
    {name: "monttremblant", loc: "46.186,-74.614"},
    {name: "saintcelestin", loc: "46.228,-72.440"},
    {name: "icar", loc: "45.680,-74.024"},
    {name: "shkarting", loc: "45.600,-73.138"}
];

const TWC_FORECAST_CONFIG = {
    method: "POST",
    url: 'https://weather.com/api/v1/p/redux-dal',
    endpoint: "getSunV3HourlyForecastWithHeadersUrlConfig",
    duration: "2day",
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
    constructor(file){
        this.file = file;
    }

    export(data){
        const data_json = JSON.stringify(data);
        fs.writeFile(this.file, data_json, (err) => {
            if (err) console.log(err);
            else console.log("Data exported to "+this.file);
        });
    }
}

function buildWeatherReport(forecast, place){
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
    return {
        place: place,
        forecast: forecast_report
    };
}

function getForecast(response, place){
    return response.data.dal[TWC_FORECAST_CONFIG.endpoint][
        "duration:"+TWC_FORECAST_CONFIG.duration+";"+
        "geocode:"+place.loc+";"+
        "units:"+TWC_FORECAST_CONFIG.units
    ].data;
}

new ApiService({
    method: "POST",
    url: TWC_FORECAST_CONFIG.url,
    data: geocodes.map(code => { return {
        name: TWC_FORECAST_CONFIG.endpoint,
        params: {
            duration: TWC_FORECAST_CONFIG.duration,
            geocode: code.loc,
            units: TWC_FORECAST_CONFIG.units
        }
    }})
}).execute((response) => {
    console.log(response.data);
    for(const place of geocodes){
        const forecast = getForecast(response, place);
        const weather_report = buildWeatherReport(forecast, place);
        console.log("Building weather report for "+place.name+"("+place.loc+")");
        new FileService(place.name+".json").export(weather_report);
    }
})