const axios = require('axios');
const fs = require('fs-extra');

const places = require('./config/places');
const thresholds = require('./config/thresholds');
const twn_request = require('./config/twn_request');

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
        const file_nodes = path.split("/");
        this.file = file_nodes.pop()+".json"
        this.dir = "www/"+file_nodes.join('');
    }

    export(weather_report){
        this.createDir();
        this.exportData(weather_report);
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
}

function between(metric, threshold1, threshold2){
    return (metric >= threshold1 && metric < threshold2) ||
           (metric <= threshold1 && metric > threshold2);
}

function getAlertLevel(metric, thresholds){
    if((thresholds[0] < thresholds[1] && metric <= thresholds[0]) ||
       (thresholds[0] > thresholds[1] && metric >  thresholds[0]))
        return "🟢";
    if(between(metric, thresholds[0], thresholds[1]))
        return "🟡";
    if(between(metric, thresholds[1], thresholds[2]))
        return "🟠";
    if(between(metric, thresholds[2], thresholds[3]))
        return "🔴";
    if(between(metric, thresholds[3], thresholds[4]))
        return "🟣";

    return "💀";
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
        var prec_type = data.snow1Hour > data.precip1Hour ? "snow": "rain";
        if (data.precip1Hour > 0) prec_type = "mixed";
        return {
            time: data.validTimeLocal,
            cond: data.wxPhraseLong,
            hum: data.relativeHumidity,
            temp: this.buildTempReport(
                data.temperature,
                data.temperatureFeelsLike
            ),
            prec: this.buildPrecReport(
                100,
                prec_type,
                data.precip1Hour,
                data.snow1Hour
            ),
            uv: data.uvIndex,
            wind: data.windSpeed+"@"+data.windDirection,
            pressure: data.pressureMeanSeaLevel
        }
    }

    buildForecastReport(data){
        var forecast_report = [];
        for(var i = 0; i < data.validTimeLocal.length ; i++) {
            const feels_like = data.temperatureFeelsLike[i];
            forecast_report.push({
                time: data.validTimeLocal[i],
                cond: data.wxPhraseLong[i],
                hum: data.relativeHumidity[i],
                temp: this.buildTempReport(
                    data.temperature[i],
                    data.temperatureFeelsLike[i]
                ),
                prec: this.buildPrecReport(
                    data.precipChance[i],
                    data.precipType[i],
                    data.qpf[i],
                    data.qpfSnow[i]
                ),
                uv: this.buildUvReport(data.uvIndex[i]),
                wind: data.windSpeed[i]+"@"+data.windDirection[i],
                pressure: data.pressureMeanSeaLevel[i]
            });
        }
        return forecast_report;
    }

    buildTempReport(temp, feels_like){
        const tempReport = {
            absolute: temp,
            feels_like: feels_like,
        };
        return feels_like < 20 ? {
            ...tempReport, alert: {
                type: "🥶",
                level: getAlertLevel(feels_like, thresholds.temp.cold)
            }
        } : {
            ...tempReport, alert: {
                type: "🥵",
                level: getAlertLevel(feels_like, thresholds.temp.heat)
            }
        }
    }

    buildPrecReport(chance, type, rain, snow){
        const total_prec = rain + snow;
        if(total_prec === 0 || chance < 20) return { 
            type: "none",
            alert_level: "🟢"
        }
        const precReport = {
            chance: chance,
            type: type.replace("precip","mixed"),
            rain: rain,
            snow: snow
        }
        return type === "snow" ? {
            ...precReport, alert: {
                type: "🌨️",
                level: getAlertLevel(total_prec, thresholds.precp.snow)
            }
        } : {
            ...precReport, alert: {
                type: "🌧️",
                level: getAlertLevel(total_prec, thresholds.precp.rain)
            }
        };
    }

    buildUvReport(uv){
        return {
            index: uv,
            alert: {
                level: getAlertLevel(uv, thresholds.uv)
            }
        };
    }
}

const currentWeatherRequests = places.map(code => { return {
    name: twn_request.endpoint.weather,
    params: {
        geocode: code.loc,
        units: twn_request.units
    }
}});

const forecastRequests = places.map(code => { return {
    name: twn_request.endpoint.forecast,
    params: {
        duration: twn_request.forecast_duration,
        geocode: code.loc,
        units: twn_request.units
    }
}});

const weather_req = {
    method: twn_request.method,
    url: twn_request.url,
    data: currentWeatherRequests.concat(forecastRequests)
};

new ApiService(weather_req).execute((resp) => {
    for(const place of places){
        const duration = "duration:"+twn_request.forecast_duration;
        const geocode = "geocode:"+place.loc;
        const units = "units:"+twn_request.units;

        const weather = resp.data.dal[twn_request.endpoint.weather][geocode+";"+units];
        const forecast = resp.data.dal[twn_request.endpoint.forecast][duration+";"+geocode+";"+units];

        const weather_report = new WeatherReport(place, weather.data, forecast.data);
        new FileService(place.name).export(weather_report);
    }
});