const places = require('../../config/places');

const IQAIR_HTTP_BASE_URL="https://www.iqair.com/canada/quebec";

const IQAir_stations = {
    granby: {
        name: "granby-parc-poitevin",
        geoLoc: [
            -72.73243,
            45.40008
        ]
    },
    drummondville: {
        name: "drummondville-stade-jacques-desautels",
        geoLoc: [
            -72.48241,
            45.88336
        ],
    },
    ditton: {
        name: "ditton-station",
        geoLoc: [
            -71.2514,
            45.3733
        ],
    },
    'saint-faustin': {
        name: "saint-faustin-station",
        geoLoc: [
            -74.4819,
            46.035
        ],
    }
}

module.exports = places.filter(place =>
    place.aqi && place.aqi.includes("iqair")
).map((place) => {
    const city = place.aqi.split('/')[1];
    const station = IQAir_stations[city];
    return {
        place:city,
        request: {
            url: `${IQAIR_HTTP_BASE_URL}/${city}/${station.name}`,
            station: station
        }
    };
});