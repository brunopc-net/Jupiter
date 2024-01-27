const RestService = require('../RestService');

const places = require('../../config/places');
const twc = require('../requests/twc');
const thresholds = require('../../config/thresholds').weather;

const weather_report = new Promise((res) => {
    new RestService(twc.request).execute((resp) => {
        const weather = [];
        const duration = "duration:"+twc.config.forecast_duration;
        const units = "units:"+twc.config.units;
        
        places.map((place) => {
            const geocode = "geocode:"+place.geoLoc;
            weather.push(new WeatherReport(place, {
                weather: resp.data.dal[twc.config.endpoint.weather][geocode+";"+units].data,
                forecast: resp.data.dal[twc.config.endpoint.forecast][duration+";"+geocode+";"+units].data
            }));
        })
        setTimeout(() => res(weather), 1000);
    });
});

class WeatherReport {
    constructor(place, data){
        return {
            place: {
                name: place.name,
                geoLoc: place.geoLoc
            },
            weather: this.buildWeatherReport(data.weather),
            forecast: this.buildForecastReport(data.forecast),
            aqi: place.aqi
        };
    }

    buildWeatherReport(data){
        var prec_type = data.snow1Hour > data.precip1Hour ? "snow": "rain";
        if (data.precip1Hour > 0) prec_type = "mixed";
        return {
            time: data.validTimeLocal,
            cond: data.wxPhraseLong,
            hum: data.relativeHumidity,
            temp: new TempReport(
                data.temperature,
                data.temperatureFeelsLike
            ),
            prec: new PrecpReport(
                100,
                prec_type,
                data.precip1Hour,
                data.snow1Hour
            ),
            uv: new UvReport(data.uvIndex),
            wind: data.windSpeed+"@"+data.windDirection,
            pressure: new PressureReport(data.pressureMeanSeaLevel),
            air_density: new AirDensityReport(
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
                temp: new TempReport(
                    data.temperature[i],
                    data.temperatureFeelsLike[i]
                ),
                prec: new PrecpReport(
                    data.precipChance[i],
                    data.precipType[i],
                    data.qpf[i],
                    data.qpfSnow[i]
                ),
                uv: new UvReport(data.uvIndex[i]),
                wind: data.windSpeed[i]+"@"+data.windDirection[i],
                pressure: new PressureReport(data.pressureMeanSeaLevel[i]),
                air_density: new AirDensityReport(
                    data.temperature[i],
                    data.relativeHumidity[i],
                    data.pressureMeanSeaLevel[i]
                )
            });
        }
        return forecast_report;
    }
}

class TempReport {
    constructor(temp, feels_like){
        return {
            absolute: temp,
            feels_like: feels_like,
            ...this.getLevel(feels_like)
        };
    }

    getLevel(feels_like){
        const level = feels_like <= 20 ? 
            "🥶"+thresholds.temp.cold.getAlertLevel(feels_like):
            "🥵"+thresholds.temp.heat.getAlertLevel(feels_like);
        if (level.includes("🟢")) return {
            level: "🟢"
        }
        return {
            level: level,
            alert: level.includes("🥶") ?
                this.getColdAlert(level) :
                this.getHeatAlert(level)
        }
    }

    getHeatAlert(alertLvl){
        if(alertLvl.includes("💀"))
            return "No exercicing, stay max cool";
        if(alertLvl.includes("🟣"))
            return "Max 60min Zone1, max hydratation";
        if(alertLvl.includes("🔴"))
            return "Max 120min Zone2, max hydratation";
        if(alertLvl.includes("🟠"))
            return "Moderate exercice, regular hydratation";
        if(alertLvl.includes("🟡"))
            return "Drink proactively";
    }

    getColdAlert(alertLvl){
        if(alertLvl.includes("💀"))
            return "Extreme cold, stay indoors";
        if(alertLvl.includes("🟣"))
            return "Wear maximum clothing, goggles";
        if(alertLvl.includes("🔴"))
            return "Put winter gear, 🧊 ice warning";
        if(alertLvl.includes("🟠"))
            return "Put warm jacket";
        if(alertLvl.includes("🟡"))
            return "Put a light jacket or sleeves";
    }
}

class PrecpReport {
    constructor(chance, type, rain, snow){
        const total_prec = rain + snow;
        if(total_prec === 0 || chance < 25)
            return "🟢";
        return {
            chance: chance,
            type: type.replace("precip","mixed"),
            rain: rain,
            snow: snow,
            ...this.getLevel(type, total_prec)
        }
    }

    getLevel(type, total_prec){
       return type === "snow" ? {
            level: "🌨️"+thresholds.precp.snow.getAlertLevel(total_prec),
            alert: this.getSnowAlert(thresholds.precp.snow.getAlertLevel(total_prec))
        } : {
            level: "🌧️"+thresholds.precp.rain.getAlertLevel(total_prec),
            alert: this.getRainAlert(thresholds.precp.rain.getAlertLevel(total_prec))
        }
    }

    getSnowAlert(alertLevel){
        if(alertLevel.includes("💀"))
            return "Heavy snow storm is expected";
        if(alertLevel.includes("🟣"))
            return "Snow storm is expected";
        if(alertLevel.includes("🔴"))
            return "A lot of snow is expected";
        if(alertLevel.includes("🟠"))
            return "Significant snow expected";
        if(alertLevel.includes("🟡"))
            return "A bit of snow is expected";
    }

    getRainAlert(alertLevel){
        if(alertLevel.includes("💀"))
            return "Heavy deluge is expected";
        if(alertLevel.includes("🟣"))
            return "Deluge is expected";
        if(alertLevel.includes("🔴"))
            return "Lots of rain is expected";
        if(alertLevel.includes("🟠"))
            return "Significant rain expected";
        if(alertLevel.includes("🟡"))
            return "Some rain drops expected";
    }
}

class UvReport {
    constructor(uv){
        if(uv === 0)
            return "🟢";
        return {
            index: uv,
            level: thresholds.uv.index.getAlertLevel(uv),
            time_to_burn: [
                this.getSkinReport(1, uv),
                this.getSkinReport(2, uv),
                this.getSkinReport(3, uv),
                this.getSkinReport(4, uv),
                this.getSkinReport(5, uv),
                this.getSkinReport(6, uv)
            ]
        };
    }

    getSkinReport(skin_type, uv){
        const skin_spf = [ 2.5, 3, 4, 5, 8, 12 ]
        const ttb = Math.floor((200 * skin_spf[skin_type-1].spf)/(3*uv));
        const report = {
            skin_type: skin_type,
            time_to_burn: ttb,
            level: thresholds.uv.time.getAlertLevel(ttb)
        };
        return report.level === "🟢" ? report : {
            ...report,
            alert: this.getUvAlert(report.level)
        }
    }

    getUvAlert(alertLevel){
        if(alertLevel.includes("💀"))
            return "Avoid sun";
        if(alertLevel.includes("🟣"))
            return "Cover most skin, put SPF60";
        if(alertLevel.includes("🔴"))
            return "Wear 🧢🕶️, put SPF60";
        if(alertLevel.includes("🟠"))
            return "Wear 🧢🕶️, put SPF30";
        if(alertLevel.includes("🟡"))
            return "Wear 🧢🕶️";
    }
}

class PressureReport {
    constructor(pressure){
        return {
            hpa: pressure,
            atm: Math.round(pressure/1013.25*10000)/10000
        }
    }
}

class AirDensityReport {
    constructor(temp, hum, pressure){
        const air_density = this.getAirDensity(temp, hum, pressure);
        return {
            absolute: Math.round(air_density*10000)/10000,
            relative: Math.round((air_density/1.225)*1000)/1000
        }
    }

    getAirDensity(temp_c, hum, pressure){
        const vapor_pressure = 6.1078 * Math.pow(10, (7.5*temp_c)/(temp_c+237.3)) * (hum/100);
        const dry_air_pressure = pressure-vapor_pressure;
        const temp_k = 273.15+temp_c;
        return (
            (dry_air_pressure/(287.058*temp_k))+
            (vapor_pressure/(461.495*temp_k))
        ) * 100;
    }
}

module.exports = weather_report;