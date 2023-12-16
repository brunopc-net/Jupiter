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
            uv: this.buildUvReport(data.uvIndex),
            wind: data.windSpeed+"@"+data.windDirection,
            pressure: this.buildPressureReport(data.pressureMeanSeaLevel),
            air: this.buildAirReport(
                data.temperature,
                data.relativeHumidity,
                data.pressureMeanSeaLevel
            )
        }
    }

    buildForecastReport(data){
        var forecast_report = [];
        for(var i = 0; i < data.validTimeLocal.length ; i++) {
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
                pressure: this.buildPressureReport(data.pressureMeanSeaLevel[i]),
                air: this.buildAirReport(
                    data.temperature[i],
                    data.relativeHumidity[i],
                    data.pressureMeanSeaLevel[i]
                )
            });
        }
        return forecast_report;
    }

    buildTempReport(temp, feels_like){
        const tempReport = {
            absolute: temp,
            feels_like: feels_like,
        };
        const alertLevelCold = getAlertLevel(feels_like, thresholds.temp.cold);
        if(alertLevelCold !== "🟢") return {
            ...tempReport, alert: "🥶"+alertLevelCold
        }
        const alertLevelHeat = getAlertLevel(feels_like, thresholds.temp.heat);
        if(alertLevelHeat !== "🟢") return {
            ...tempReport, alert: "🥵"+alertLevelHeat
        }
        return tempReport
    }

    buildPrecReport(chance, type, rain, snow){
        const total_prec = rain + snow;
        if(total_prec === 0 || chance < 20)
            return "none";
        const precReport = {
            chance: chance,
            type: type.replace("precip","mixed"),
            rain: rain,
            snow: snow
        }
        return type === "snow" ? {
            ...precReport,
            alert: "🌨️"+getAlertLevel(total_prec, thresholds.precp.snow)
        } : {
            ...precReport,
            alert: "🌧️"+getAlertLevel(total_prec, thresholds.precp.rain)
        };
    }

    buildUvReport(uv){
        if(uv === 0)
            return "none";
        return {
            index: uv,
            alert: "☀️"+getAlertLevel(uv, thresholds.uv)
        };
    }

    buildPressureReport(pressure){
        return {
            hpa: pressure,
            atm: Math.round(pressure/1013.25*10000)/10000
        };
    }

    buildAirReport(temp, hum, pressure){
        const saturation_vapor_pressure = 6.1078*Math.pow(10, (7.5*temp)/(temp+237.3));
        const press_vapor = saturation_vapor_pressure*(hum/100);
        const press_air = pressure-press_vapor;
        const temp_kelvin = 273.15+temp;
        const air_density = ((press_air/(287.058*temp_kelvin))+(press_vapor/(461.495*temp_kelvin)))*100;
        return {
            density: {
                absolute: Math.round(air_density*10000)/10000,
                relative: Math.round((air_density/1.225)*1000)/1000
            }
        }
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