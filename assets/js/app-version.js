class AppVersionService {
    constructor() {
        this.initial();
    }
    initial(){
        var properties = this.queryStringToObject(this.getQueryString(), true);
        var lastVer = localStorage.getItem("app-js-ver");
        if(properties && (lastVer != properties.v)) {
            console.log("App updating");
            localStorage.setItem("app-js-ver", properties.v);
            this.deleteCaches();
        }
    }
    deleteCaches = () => {
        caches.keys().then(function(names) {
            for (let name of names)
                caches.delete(name);
        });
        window.location.reload(true);
    }
    
    queryStringToObject(queryString, decode) {
        var query = queryString.split('&'),
              obj = {};
    
        for (var i = 0, l = query.length; i < l; i++) {
            var keyVal = query[i].split('=');
            obj[keyVal[0]] = decode ? decodeURIComponent(keyVal[1]) : keyVal[1];
        }
    
        return obj;
    }
    
    getQueryString() {
        var scriptTag = document.querySelector('script[role="app_ver"]');
        return scriptTag.src.split('?')[1];
    }
}