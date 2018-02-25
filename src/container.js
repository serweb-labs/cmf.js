(function() {
    window.Container = new Proxy(function() {        
        // private
        var waiting = {};
        var stack = {};
        var factory = {};
        var limbo = {};

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

            if (typeof object.target === undefined) {
                throw "value prop is not valid"
            }

            if (object.target == undefined) {                
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
            self[name] = object.target;

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

            if (obj.target === undefined || typeof obj.target !== "function") {                
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
                        var names = obj.target.toString().match(/\(([^)]+)\)/)[1].replace(/\s/g,'').split(",");
                    } catch (error) {
                        var names = [];
                    }
                }
                var cb = function(){
                    var inject = [];
                    if (limbo.hasOwnProperty(name)) {
                        throw "posible circular dependency. use container.getAsync(service) in verbose service";
                    }
                    
                    limbo[name] = true;
                    inject = names.map(function(name){      
                        return self.get(name);                        
                    })                   
                   
                    var n = new obj.target(...inject)
                    delete limbo[name];
                    return n;
                   
                }    
            }            
           
            // add lazy
            if (type == "service") {
                stack[name] = cb ? cb : obj.target;

                if (obj.lazy === false) {
                    console.log("no es lazy", name)
                    self.get(name)
                }
            }
            else if (type == "factory") {
                factory[name] = cb ? cb : obj.target;                
            }
     

            dispatchWaiting(name);
    
            return true;
        }           
            
        function has(name) {
            return self.hasOwnProperty(name) || stack.hasOwnProperty(name) || factory.hasOwnProperty(name);
        }
    
        function inStack(name) {
            return stack.hasOwnProperty(name);
        }

        function isFactory(name) {
            return factory.hasOwnProperty(name);
        }

        function get(name) {
            if(self.hasOwnProperty(name)) {
                return self[name];                
            }
            else if (has(name)) {
                if (isFactory(name)) {
                    return factory[name].bind(self.proxy);
                }
                else if (inStack(name)) {
                    if (!self.hasOwnProperty(name)) {
                        self[name] = stack[name].bind(self.proxy)();
                        delete stack[name];                   
                    }                    
                    return self[name];
                }
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
                    if (target.hasOwnProperty(name)) {
                        return target[name];
                    }
                    else if (target.hasOwnProperty('get')) {
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

