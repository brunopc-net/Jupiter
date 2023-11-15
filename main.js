const axios = require('axios');
const fs = require('fs-extra');

const places = [
    //City
    {name: "city/montreal", loc: "45.51,-73.56"},
    {name: "city/beloeil", loc: "45.56,-73.21"},
    {name: "city/saint-hyacinthe", loc: "45.64,-72.95"},
    {name: "city/granby", loc: "45.41,-72.73"},
    {name: "city/bromont", loc: "45.29,-72.62"},
    {name: "city/sherbrooke", loc: "45.40,-71.89"},
    {name: "city/drummondville", loc: "45.89,-72.50"},
    {name: "city/quebec", loc: "46.80,-71.22"},
    {name: "city/shawinigan", loc: "46.756,-72.810"},
    {name: "city/trois-rivieres", loc: "46.34,-72.54"},
    {name: "city/sorel-tracy", loc: "46.04,-73.11"},
    {name: "city/st-jerome", loc: "45.78,-74.01"},
    {name: "city/gatineau", loc: "45.47,-75.70"},
    
    //Park
    {name: "park/mauricie", loc: "45.442,-71.133"},
    {name: "park/montmegentic", loc: "45.442,-71.133"},
    {name: "park/gatineau", loc: "45.47,-75.82"},

    //Karting
    {name: "karting/sc", loc: "46.228,-72.440"},
    {name: "karting/icar", loc: "45.680,-74.024"},
    {name: "karting/sh", loc: "45.600,-73.138"},
    {name: "karting/tremblant", loc: "46.186,-74.614"}
];

const TWC_API_CONFIG = {
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
                console.log(resp.data);
                func(resp);
            }).catch(function (error) {
                console.log(error);
            })
    }
}

class FileService {
    constructor(path){
        this.dir = "www/"+path;
        const file_nodes = path.split("/");
        this.file = file_nodes[file_nodes.length-1]+".json"
    }

    export(weather_report){
        this.createDir();
        this.exportData(weather_report);
        this.exportHtml();
    }

    createDir(){
        const folders = this.dir.split("/");
        var path = "";
        for(const folder of folders){
            path += folder+"/";
            !fs.existsSync(path) && fs.mkdirSync(path);
        }   
    }

    exportData(weather_report){
        const fullpath = this.dir+"/"+this.file;
        fs.writeFile(fullpath, JSON.stringify(weather_report), (err) => {
            if (err) console.log(err);
            else console.log("Data exported to "+fullpath);
        });
    }

    exportHtml(){
        const html = '<head><meta http-equiv="refresh" content="0; url='+this.file+'" /></head>';
        fs.writeFile(this.dir+"/index.html", html, (err) => {
            if (err) console.log(err);
        });
    }
}

class WeatherReport {

    constructor(place, weather_data, forecast_data){
        return {
            place: place,
            weather: this.buildWeatherReport(weather_data),
            forecast: this.buildForecastReport(forecast_data)
        };
    }

    buildWeatherReport(data){
        return {
            time: data.validTimeLocal,
            cond: data.wxPhraseLong,
            hum: data.relativeHumidity,
            temp: {
                absolute: data.temperature,
                feels_like: data.temperatureFeelsLike
            },
            prec:{
                rain: data.precip1Hour,
                snow: data.snow1Hour,
            },
            uv: data.uvIndex,
            wind: data.windSpeed+"@"+data.windDirection
        }
    }

    buildForecastReport(data){
        var forecast_report = [];
        for(var i = 0; i < data.validTimeLocal.length ; i++) {
            forecast_report.push({
                time: data.validTimeLocal[i],
                cond: data.wxPhraseLong[i],
                hum: data.relativeHumidity[i],
                temp: {
                    absolute: data.temperature[i],
                    feels_like: data.temperatureFeelsLike[i]
                },
                prec:{
                    chance: data.precipChance[i],
                    type: data.precipType[i],
                    rain: data.qpf[i],
                    snow: data.qpfSnow[i],
                },
                uv: data.uvIndex[i],
                wind: data.windSpeed[i]+"@"+data.windDirection[i]
            });
        }
        return forecast_report;
    }
}

const currentWeatherRequests = places.map(code => { return {
    name: TWC_API_CONFIG.endpoint.weather,
    params: {
        geocode: code.loc,
        units: TWC_API_CONFIG.units
    }
}});

const forecastRequests = places.map(code => { return {
    name: TWC_API_CONFIG.endpoint.forecast,
    params: {
        duration: TWC_API_CONFIG.forecast_duration,
        geocode: code.loc,
        units: TWC_API_CONFIG.units
    }
}});

const weather_req = {
    method: TWC_API_CONFIG.method,
    url: TWC_API_CONFIG.url,
    data: currentWeatherRequests.concat(forecastRequests)
};

new ApiService(weather_req).execute((resp) => {
    for(const place of places){
        const duration = "duration:"+TWC_API_CONFIG.forecast_duration;
        const geocode = "geocode:"+place.loc;
        const units = "units:"+TWC_API_CONFIG.units;

        const weather_data = resp.data.dal[TWC_API_CONFIG.endpoint.weather][geocode+";"+units].data;
        const forecast_data = resp.data.dal[TWC_API_CONFIG.endpoint.forecast][duration+";"+geocode+";"+units].data;

        const weather_report = new WeatherReport(place, weather_data, forecast_data);
        new FileService(place.name).export(weather_report);
    }
});