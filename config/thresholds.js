const thresholds = {
    temp: {
        heat: [28, 32, 36, 40, 44],
        cold: [12, 6, 0, -12, -24]
    },
    precp: {
        rain: [0, 2, 6, 12, 24],
        snow: [0, 5, 10, 20, 30]
    },
    uv: [2, 5, 7, 10, 12]
}

module.exports = thresholds;