const waqi_requests = require('../requests/waqi');
const iqair_requests = require('../requests/iqair');

const RestService = require('../RestService');
const thresholds = require('../../config/thresholds').aqi

function getAlerts(aqi, details){
    return {
        aqi:{
            level: thresholds.level.getAlertLevel(aqi)
        },
        ...details.pm25 && {
            pm25: {
             
                level: thresholds.pm25.getAlertLevel(details.pm25)
            }
        },
        ...details.o3 && {
            o3: {
                level: thresholds.o3.getAlertLevel(details.o3)
            }
        },
        ...details.no2 && {
            no2: {
                level: thresholds.no2.getAlertLevel(details.no2)
            }
        },
        ...details.so2 && {
            so2: {
                level: thresholds.so2.getAlertLevel(details.so2)
            }
        },
        ...details.co && {
            co: {
                level: thresholds.co.getAlertLevel(details.co)
            }
        }
    }
}

class WaqiReport {
    constructor(place, data){
        const city = place.split('/')[1];
        const details = this.getDetails(data.iaqi);
        return {
            source: "waqi/"+city,
            aqi: {
                updated: data.time.iso,
                station: {
                    name: data.city.name,
                    geoLoc: data.city.geo
                },
                level: data.aqi,
                details: details,
                alerts: getAlerts(data.aqi, details),
                forecast: data.forecast,
                attributions: data.attributions
            },
        }
    }

    getDetails(iaqi){
        return {
            ...iaqi.pm25 && {pm25: this.calcPM25(iaqi.pm25.v)},
            ...iaqi.o3 && {o3: iaqi.o3.v},
            ...iaqi.no2 && {no2: iaqi.no2.v},
            ...iaqi.so2 && {so2: iaqi.so2.v},
            ...iaqi.co && {co: iaqi.co.v}
        }
    }

    calcPM25(aqi){
        var pm25 = aqi*0.24
    
        if(aqi > 50)
            pm25 = ((aqi-50)*0.31)+12;
        if(aqi > 100)
            pm25 = ((aqi-100)*0.42)+35;
        if(aqi > 150)
            pm25 = ((aqi-150)*1.88)+56;
        if(aqi > 200)
            pm25 = ((aqi-200))+150;
        if(aqi > 300)
            pm25 = ((aqi-300)*1.25)+250;
        
        return Math.round(pm25*10)/10;
    }

    // calcO3(aqi){
    //     var o3 = aqi*2.12
    
    //     if(aqi > 50)
    //         o3 = ((aqi-50)*0.31)+106;
    //     if(aqi > 100)
    //         o3 = ((aqi-100)*0.59)+137;
    //     if(aqi > 150)
    //         o3 = ((aqi-150)*0.78)+167;
    //     if(aqi > 200)
    //         o3 = ((aqi-200)*1.86)+206;
        
    //     return Math.round(o3*10)/10;
    // }
}

class IqairReport {
    constructor(req, html){
        this.req = req
        const page = require("cheerio").load(html);
        const aqi = this.extractAqi(page);
        const details = this.extractDetails(page);
        return {
            source: "iqair/"+req.place,
            aqi: {
                updated: this.extractLastUpdated(page),
                station: req.request.station,
                level: aqi,
                details: details,
                alerts: getAlerts(aqi, details),
                attributions: [
                    {
                        "url": "https://www.iqair.com/",
                        "name": "IQAir"
                    }
                ]
            }
        };
    }

    extractLastUpdated(page){
        const ts = page(".timestamp__wrapper > time").attr('datetime');
        const offset = new Date().getTimezoneOffset()*60000;
        return new Date(Date.parse(ts)-offset).toISOString();
    }

    extractPolluant(page, index){
        return parseFloat(page(`.pollutant-concentration-value:nth(${index})`).text())
    }

    extractAqi(page){
        return parseInt(page(".aqi-value__value").text());
    }

    extractDetails(page){
        const pm25 = this.extractPolluant(page, 0);
        const o3 = this.extractPolluant(page, 1);
        const no2 = this.extractPolluant(page, 2);
        const so2 = this.extractPolluant(page, 3);
        const co = this.extractPolluant(page, 4);
        return {
            ...pm25 && {pm25: pm25},
            ...o3 && {o3: o3},
            ...no2 && {no2: no2},
            ...so2 && {so2: so2},
            ...co && {co: co},
        }
    }
}

const waqi_report = waqi_requests.map(request => {
    return new Promise((res) => {
        new RestService(request.req).execute((resp) => {
            setTimeout(() => 
                res(new WaqiReport(request.place, resp.data.data)),
                300
            )
        });
    });
});

const iqair_report = iqair_requests.map(req => {
    return new Promise((res) => {
        require('axios').get(req.request.url).then((resp) => {
            setTimeout(() => 
                res(new IqairReport(req, resp.data)),
                300
            )
        });
    });
});

module.exports = new Promise((res) => {
    Promise.all(
        waqi_report.concat(iqair_report)
    ).then((aqi_report) => {
        res(aqi_report)
    });
});