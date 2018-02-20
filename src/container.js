function newContainer() {
    var container = new Container();

    var proxy = new Proxy(container, {
        get: function(target, name) {
            return target.get(name);
        }/*,        
        set: function(target, name, value) {
        }*/
    });

    container.proxy = proxy;
    return proxy;
}

function Container() {

    // private
    var waiting = {};
    var lazy = {};

    // api    
    var self = this;
    this.register = register;
    this.service = service;
    this.factory = factory;
    this.has = has;
    this.get = get;
    this.getAsync = getAsync;
    
    
    // internals
    function register(name, callback) {
        
        // rejects
        if (!callback) {
            if (waiting.hasOwnProperty(name)) {
                if (waiting[name].hasOwnProperty('reject')) {
                    waiting[name].reject(name);
                }
                delete waiting[name]
            }
            return false;
        }

        // add to library
        self[name] = callback
        
        // if someone waith notices of you
        if (waiting.hasOwnProperty(name)) {
            if (waiting[name].hasOwnProperty('resolve')) {
                waiting[name].resolve(self[name]);
            }
            delete waiting[name]
        }

        return true;
    }

    // internals
    function service(name, callback) {
        
        // rejects
        if (!callback) {
            if (waiting.hasOwnProperty(name)) {
                if (waiting[name].hasOwnProperty('reject')) {
                    waiting[name].reject(name);
                }
                delete waiting[name]
            }
            return false;
        }

        // add to library
        lazy[name] = callback
        
        // if someone waith notices of you
        if (waiting.hasOwnProperty(name)) {
            if (waiting[name].hasOwnProperty('resolve')) {
                waiting[name].resolve(self.get(name));
            }
            delete waiting[name]
        }

        return true;
    }
    
    // internals
    function factory(name, callback) {
        
        // rejects
        if (!callback) {
            if (waiting.hasOwnProperty(name)) {
                if (waiting[name].hasOwnProperty('reject')) {
                    waiting[name].reject(name);
                }
                delete waiting[name]
            }
            return false;
        }

        // add to library
        lazy[name] = callback.bind(self.proxy);
        
        // if someone waith notices of you
        if (waiting.hasOwnProperty(name)) {
            if (waiting[name].hasOwnProperty('resolve')) {
                waiting[name].resolve(self.get(name));
            }
            delete waiting[name]
        }

        return true;
    }
    

        
    function has(name) {
        return self.hasOwnProperty(name) || lazy.hasOwnProperty(name);
    }

    function isLazy(name) {
        return lazy.hasOwnProperty(name);
    }

    function get(name) {
        if (has(name)) {
            if (isLazy(name)) {
                self[name] = lazy[name].bind(self.proxy)()
            }
            return self[name];
        }
        return false;
    }

    function getAsync(name) {
        return new Promise(
            function(resolve, reject) {
                if (has(name)) {
                    resolve(self[name]);
                }
                else {
                    waiting[name] = {resolve: resolve, reject: reject};
                }
            }
        );
    }
}