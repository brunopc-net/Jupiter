class RestService {
    
    constructor(request){
        this.request = request;
    }

    execute(func){
        require('axios')(this.request)
            .then((resp) => {
                console.log(this.request.method+" request to "+this.request.url);
                console.log(resp.data);
                func(resp);
            }).catch(function (error) {
                console.log(error);
            })
    }
}

module.exports = RestService;