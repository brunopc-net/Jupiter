const places = require('../../config/places');

function getRequest(geoLoc){
    return {
        method: 'GET',
        url: `http://api.waqi.info/feed/geo:${geoLoc.replace(",",";")}/`,
        params: {
            token: "9fae673cccebdd595fcd3142ea113cc26b631b46",
        }
    }
}

module.exports =  places.filter(place => 
    place.aqi && place.aqi.includes("waqi")
).map(place => {
    return {
        place: place.name,
        req: getRequest(place.geoLoc)
    };
});