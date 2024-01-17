const weather_report_promise = require('./api/report/weather');
const aqi_report_promise = require('./api/report/aqi');

const fs = require('fs-extra');
class FileService {
    constructor(path){
        const file_nodes = path.split("/");
        this.file = file_nodes.pop()+".json"
        this.dir = "www/"+file_nodes.join('');
    }

    export(data){
        this.createDir();
        this.exportData(data);
    }

    createDir(){
        const folders = this.dir.split("/");
        var path = "";
        for(const folder of folders){
            path += folder+"/";
            !fs.existsSync(path) && fs.mkdirSync(path);
        }   
    }

    export(data){
        const fullpath = this.dir+"/"+this.file;
        fs.writeFile(fullpath, JSON.stringify(data), (err) => {
            if (err) console.log(err);
            else console.log("Data exported to "+fullpath);
        });
    }
}

function getAqi(weather_report, aqi_reports){
    return weather_report.aqi ? 
        aqi_reports.filter((report) => report.source === weather_report.aqi)[0].aqi:
        {};
}

weather_report_promise
    .then((weather_reports) => 
        aqi_report_promise.then((aqi_reports) => {
            for (weather_report of weather_reports) {
                //For each aqi report received, insert it in weather report
                weather_report.aqi = getAqi(weather_report, aqi_reports);
                //Export report
                new FileService(weather_report.place.name).export(weather_report);
            }
        })
    );