(function() {
    window.Container = new Proxy(function() {        
        // private
        var waiting = {};
        var lazy = {};
        var factory = {};

        // api    
        var self = this;
        this.value = value;
        this.service = init.bind(null, 'service');
        this.factory = init.bind(null, 'factory');
        this.has = has;
        this.get = get;
        this.getAsync = getAsync;
        
        
        // internals
        function value(object) {
            var name = object.name;
            if (typeof name !== "string") {
                throw "name prop is not valid"
            }

            if (typeof object.value === undefined) {
                throw "value prop is not valid"
            }

            if (object.value == undefined) {                
                // rejects async
                if (waiting.hasOwnProperty(name)) {
                    if (waiting[name].hasOwnProperty('reject')) {
                        waiting[name].reject(name);
                    }
                    delete waiting[name]
                }
                // error
                throw "init prop is not valid"
            }

            // add as container property
            self[name] = object.value;

            dispatchWaiting(name)
            return true;
        }
        
        function dispatchWaiting(name) {
            // if someone waith notices of you
            if (waiting.hasOwnProperty(name)) {
                if (waiting[name].hasOwnProperty('resolve')) {
                    waiting[name].resolve(self.get(name));
                }
                delete waiting[name]
            }
    
        }

        // internals
        function init(type, obj) {
            obj = obj || {};
            type = type || "";
            var name = obj.name;            

            if (typeof name !== "string") {
                throw "name prop is not valid"
            }

            if (obj.init === undefined || typeof obj.init !== "function") {                
                // rejects async
                if (waiting.hasOwnProperty(name)) {
                    if (waiting[name].hasOwnProperty('reject')) {
                        waiting[name].reject(name);
                    }
                    delete waiting[name]
                }
                // error
                throw "init prop is not valid"
            }

            if (obj.di !== false) {
                // DI exlicit
                if (Array.isArray(obj.di)) {
                    var names = obj.di;
                }
                // DI auto
                else {
                    try {
                        var names = obj.init.toString().match(/\(([^)]+)\)/)[1].replace(/\s/g,'').split(",");
                    } catch (error) {
                        var names = [];
                    }
                }
                var cb = function(){
                    var inject = names.map(function(name){
                        return self.proxy[name];
                    })
                    console.log(inject, "inject");
                    return new obj.init(...inject)
                }    
            }            
           
            // add lazy
            if (type == "service") {
                lazy[name] = cb ? cb : obj.init;
                if (obj.lazy === false) {
                    get(name)
                }
            }
            else if (type == "factory") {
                factory[name] = cb ? cb : obj.init;                
            }
            else if (type == "object") {
                factory[name] = cb ? cb : obj.init;                
            }

            dispatchWaiting(name);
    
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

        function isFactory(name) {
            return factory.hasOwnProperty(name);
        }

        function get(name) {
            if (has(name)) {
                if (isFactory(name)) {
                    self[name] = factory[name].bind(self.proxy);
                }
                else if (isLazy(name)) {
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

        function isConstructor(f) {
            try {
              Reflect.construct(String, [], f);
            } catch (e) {
              return false;
            }
            return true;
          }
    },
    {   
        construct(target, args) {
            var inst = new target(...args);
            var omg = new Proxy(inst, {
                get: function(target, name) {
                    if (target.hasOwnProperty('get')) {
                        return target.get(name);
                    }
                },        
                set: function(target, name, value) {
                    // things
                }
            });
            inst.proxy = omg;
            return omg;
        }
    });  
})();

