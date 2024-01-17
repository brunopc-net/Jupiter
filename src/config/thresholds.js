class Thresholds {

    constructor(thresholds){
        this.thresholds = thresholds;
    }
    
    getAlertLevel(value){
        if((this.thresholds[0] < this.thresholds[1] && value <= this.thresholds[0]) ||
           (this.thresholds[0] > this.thresholds[1] && value >  this.thresholds[0]))
            return "🟢";
        if(this.between(value, this.thresholds[0], this.thresholds[1]))
            return "🟡";
        if(this.between(value, this.thresholds[1], this.thresholds[2]))
            return "🟠";
        if(this.between(value, this.thresholds[2], this.thresholds[3]))
            return "🔴";
        if(this.between(value, this.thresholds[3], this.thresholds[4]))
            return "🟣";
    
        return "💀";
    }

    between(metric, threshold1, threshold2){
        return (metric >= threshold1 && metric < threshold2) ||
               (metric <= threshold1 && metric > threshold2);
    }
}

module.exports = {
    weather: {
        temp: {
            heat: new Thresholds([28, 32, 36, 40, 44]),
            cold: new Thresholds([12, 6, 0, -12, -24])
        },
        precp: {
            rain: new Thresholds([0, 2, 6, 12, 24]),
            snow: new Thresholds([0, 5, 10, 20, 30])
        },
        uv: {
            index: new Thresholds([3, 5, 7, 9, 11]),
            time: new Thresholds([240, 120, 60, 30, 15])
        }
    },
    aqi: {
        level: new Thresholds([50, 100, 150, 200, 300]),
        pm25: new Thresholds([12, 35, 55, 150, 250]),
        pm10: new Thresholds([54, 154, 254, 354, 424]),
        o3: new Thresholds([106, 137, 167, 206, 392]),
        so2: new Thresholds([35, 75, 185, 304, 604]),
        no2: new Thresholds([53, 100, 360, 649, 1244]),
        co: new Thresholds([4, 9, 12, 15, 30])
    }
};