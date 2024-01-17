const weather_report_promise = require('./api/report/weather');
const aqi_report_promise = require('./api/report/aqi');

function getEnrichedReport(weather_report, aqi_reports){
    weather_report.aqi = weather_report.aqi ?
        aqi_reports.filter((report) => report.source === weather_report.aqi)[0].aqi
        : {};
    return weather_report;
}

function print(){
    const report_path = "www/"+weather_report.place.name+".json";
    const report_data = JSON.stringify(weather_report);

    require('fs-extra').outputFile(report_path, report_data, (err) => {
        if (err) console.log(err);
        else console.log("Data exported to "+report_path);
    });
}

weather_report_promise
    .then((weather_reports) => 
        aqi_report_promise.then((aqi_reports) => {
            for (weather_report of weather_reports) {
                print(getEnrichedReport(weather_report, aqi_reports));
            }
        })
    );