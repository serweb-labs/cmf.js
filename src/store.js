(function() {
    'use strict';
    window.StoreItem = StoreItem;
    window.StoreCollection = StoreCollection;
    window.store = store;

    /* 
    * Store Wrapper
    *
    */
    function store(config, contenttype, id, name) {
        if (id || id === null) {
            return new StoreItem(config, contenttype, id, name);
        }
        else {
           return new StoreCollection(config, contenttype, name);
        }           
    }


    function StoreItem(config, contenttype, id, name) {

        var api = config.api;
        var schema = config.schema

        
        // constructor
        var self = this;

        /****************************
         *          API
         ****************************/

        // public properties
        self.id = id;
        self.contenttype = contenttype;
        self.uri = self.contenttype + "/" + self.id;
        self.data = {values:{}, relations: {}};
        self.callbacks = {};
        self.log = [];
        self.history = [];
        self.countGetRelations = 0;
        self.query = {}
        self.get = {};
        self.mutate = {};
        self.schema = schema.get(contenttype);

        // public methods
        self.addEventListener = addEventListener.bind(self);
        self.removeEventListener = removeEventListener.bind(self);
        self.dispatchEvent = dispatchEvent.bind(self);
        self.on = addEventListener.bind(self);
        self.off = removeEventListener.bind(self);
        self.fire = dispatchEvent.bind(self);
        self.ContentEvent = ContentEvent.bind(null, self);
        self.happened = happened.bind(self);         
        self.copy = copy;
        self.addAction = addAction.bind(self);
        self.addMutation = addMutation.bind(self);
        self.addGetter = addGetter.bind(self);


        /****************************
         *        INTERNALS
         ****************************/

        if (config.hasOwnProperty('init')) {
            config.init.apply(this);
        }        

        // default getters
        self.addGetter('val', getVal);
        self.addGetter('rel', getRel);
        self.addGetter('vals', getVals);
        self.addGetter('rels', getRels);
        self.addGetter('raw', getRaw);
        self.addGetter('hasRel', hasRel);
        
        // default actions
        self.addAction('fetch', fetch);
        self.addAction('next', next);
        self.addAction('error', error);
        self.addAction('remove', deleteItem);
        self.addAction('create', createItem);
        self.addAction('save', saveItem);
        self.addAction('update', updateItem);
        self.addAction('fetchRelated', getRelations);
        self.addAction('setUri', setUri);
        self.addAction('setQuery', setQuery);

        // register default mutations
        self.addMutation('setRaw', setRaw);
        self.addMutation('setVal', setVal);
        self.addMutation('setVals', setVals);
        self.addMutation('setRel', setRel);
        self.addMutation('setRels', setRels);
        self.addMutation('addVal', addVal);
        self.addMutation('addRel', addRel);
        self.addMutation('delVal', delVal);
        self.addMutation('delRel', delRel);

        // default getter
        // handlers
        function getVal(field) {
            return this.data.values[field];
        }

        function getRel(field) {
            return this.data.relations[field];
        }

        function getVals(field) {
            return this.data.values;
        }

        function getRels(field) {
            return this.data.relations;
        }

        function getRaw(field) {
            return this.data;
        }

        function hasRel(field, key) {
            var key = key || false;
            if (this.data.relations.hasOwnProperty(field)) {
                if (key) {
                    return this.data.relations[field].includes(key)                        
                }
                else {
                    return true;
                }
            }
            return false;
        }

        // default mutation
        // handlers
        function setRaw(data) {
            this.data.values =  data.values || {};
            this.data.relations =  data.relations || {};
            return true;
        }

        function setVal(field, data) {
            this.data.values[field] = data;
            return true;
        }

        function setVals(data) {
            console.log(data.title);
            this.data.values = data;
            return true;
        }

        function setRel(field, data) {
            this.data.relations[field] = data;
            return true;
        }

        function setRels(data) {
            this.data.relations = data;
            return true;
        }

        function addVal(field, data) {
            this.data.values[field] = data;
            return true;
        }

        function addRel(field, key) {
            this.data.relations[field].push(key);
            return true;
        }

        function delVal(field, key) {
            delete this.data.values[field];
            return true;        
        }

        function delRel(field, key) {
            var array = this.data.relations[field];
            var index = array.indexOf(key);
            if (index > -1) {
                array.splice(index, 1);
                return true;
            }
            return false;            
        }


        function fetch(ignoreCache) {
            var ignoreCache = ignoreCache || false;
            // dispatch before event
            let event = new self.ContentEvent('next:before');
            self.dispatchEvent(event);
            if (event.defaultPrevented) {return;}
            // get of the server
            api.getContent(self, ignoreCache).then(function(data){
                self.next(data);
            });  
        }

        function next(result) {
            this.mutate.setRaw(result);
            // events
            if(!this.happened('next:first')) {
                let event = new this.ContentEvent('next:first', {success: true});
                this.dispatchEvent(event);
                if (event.defaultPrevented) {return;}
            }

            let event = new this.ContentEvent('next', {success: true});
            this.dispatchEvent(event);
            if (event.defaultPrevented) {return;}
        }

        function error(){
            let event = new this.ContentEvent('next', {success: false});
            this.dispatchEvent(event)
            if (event.defaultPrevented) {return;}
        }

        function createItem() {
            var self = this;
            api.createContent(self).then(function(response) {
                setUri(self.contenttype, response.data.id)

                // event
                let event = new self.ContentEvent('create'); 
                event.success = false;

                if (response.data.id) {
                    event.id = response.data.id;
                    event.success = true;
                }

                self.dispatchEvent(event);
                if (event.defaultPrevented) {return;}
            })  
        }
        
        function updateItem() {
            // event
            var self = this;
            let event = new self.ContentEvent('update:before');  
            self.dispatchEvent(event);
            if (event.defaultPrevented) {return;}
            
            // event
            api.updateContent(self).then(function(response) {
                let event = new self.ContentEvent('update', {success: true});  
                self.dispatchEvent(event);
                if (event.defaultPrevented) {return;}
            })
        }
        
        function arrayDiff(a, b) {
            var a = a || [];
            var b = b || [];                
            return a.filter(function(i) {return b.indexOf(i) < 0;});
        }

        function getRelations(options) {
            var content = self.data.values;
            var relations = self.data.relations;      
            var options = options || {};
            self.countGetRelations = 0;


            for (var contenttype in relations) {
                if(relations.hasOwnProperty(contenttype)) {

                    // If not specified in the options
                    // go to the next
                    if(!options.hasOwnProperty(contenttype)) {
                        continue;                            
                    }

                    for (var i = 0; i < relations[contenttype].length ; i++) {
                        
                        // If the index is greater than
                        // the number specified in options, exit
                        if (options.hasOwnProperty(contenttype)) {
                            if ((i + 1) > options[contenttype] ) {
                                break;
                            }
                        }

                        if (relations[contenttype][i] == "") continue;
                        
                        self.countGetRelations++; 
                        relatedCallToApi(content, relations[contenttype][i], contenttype);
                    }                             
                }
            }
        }

        function deleteItem() {
            // todo: remove instance
            api.deleteContent(self).then(function(data) {
                console.log("sdasdas", data);
                let event = new self.ContentEvent('delete', {success: true, id: self.id}); 
                self.dispatchEvent(event);
                if (event.defaultPrevented) {return;}
            })
        }


        function saveItem() {
            if (self.id === null) {
                self.create();
            }
            else {
                self.update();
            }
        }

        function setQuery(query, merge) {
            if (merge) {
                Object.assign(self.query, query);                    
            }
            else {
                self.query = query; 
            }
        }

        function setUri(ct, id) {
            self.contenttype = ct;
            self.id = id;
            self.uri = self.contenttype + "/" + self.id;
        }

        function relatedCallToApi(content, relation, key) {                
            var uri = key + "/" + relation;
            var c = new StoreItem(config, key, relation)
            
            api.getContent(c)
            .then(function(result){                    
                    // as array
                    if (!content.hasOwnProperty(key)) {
                        content[key] = [];
                    }
                    
                    content[key].push(result.values);
                    
                    // as object
                    // TODO: Best with setters
                    Object.defineProperty(content, '_' + key, {
                        enumerable: false,
                        writable: true,
                        value: result.values
                    });
                    
                    self.countGetRelations--;
                    if (self.countGetRelations == 0) {
                        let event = new self.ContentEvent('next:related', {success: true});
                        self.dispatchEvent(event);
                        if (event.defaultPrevented) {return;}
                    }
                })
                .catch(function(){
                    // unhandled
                })
        }

        function related(ct) {
            var self = this;
            var rel = {};
            if (self.data.values.hasOwnProperty(ct)) {                    
                for (var i = 0; i < self.data.values[ct].length; i++) {
                    rel[self.data.values[ct][i].id] = self.data.values[ct][i];
                }
            }
            return rel;                
        }

        function values() {
            return this.data.values;
        }
        
        function value(field) {
            return this.data.values[field];                
        }

        
        function copy() {
            var cp = new StoreItem(config, self.contenttype, self.data.values.id);               
            merge(cp.data, self.data);
            cp.log.push('next');
            return cp;
        }

    }

    function StoreCollection(config, contenttype, name) {

        var api = config.api;
        var schema = config.schema

        // constructor
        var self = this;
        var api = api;

        // api
        self.callbacks = {};            
        self.contenttype = contenttype;
        self.data = [];
        self.log = [];
        self.history = [];
        self.uri = self.contenttype;
        self.schema = schema.get(contenttype);

        self.query = {
            filter: {},
            order: {
                key: "id",
                values: "desc"
            }
        };

        self.limit = 10;
        self.page = 1;
        self.count = null;
        self.pages = null;
        self.addAction = addAction.bind(self);
        self.addMutation = addMutation.bind(self);
        self.addGetter = addGetter.bind(self);
        self.checkQuery = checkQuery.bind(self);

        // events
        self.addEventListener = addEventListener.bind(self);
        self.removeEventListener = removeEventListener.bind(self);
        self.addItemEvents = addItemEvents;
        self.dispatchEvent = dispatchEvent.bind(self);            
        self.on = addEventListener.bind(self);
        self.off = removeEventListener.bind(self);
        self.fire = dispatchEvent.bind(self);
        self.ContentEvent = ContentEvent.bind(null, self);
        self.happened = happened.bind(self);

        /****************************
         *        INTERNALS
         ****************************/


        if (config.hasOwnProperty('init')) {
            config.init.apply(this);
        }

        // default actions
        self.addAction('fetch', get);
        self.addAction('next', next);
        self.addAction('error', error);
        self.addAction('removeItem', removeItem);
        self.addAction('setQuery', setQuery);
        self.addAction('goToPage', goToPage);
        self.addAction('prevPage', prevPage);
        self.addAction('nextPage', nextPage);

        function get(ignoreCache) {
            var ignoreCache = ignoreCache || false;
            // dispatch before event
            let event = new self.ContentEvent('next:before');                
            self.dispatchEvent(event);
            if (event.defaultPrevented) { return; }              
            api.getCollection(self, ignoreCache).then(function(data){
                self.next(data);
            })
        }

        function next(result) {
            console.log("next...", result)

            // pagination
            self.count = result.count;
            self.pages = result.pages;

            // items
            var list = [];
            
            for (var item of result.items) {        
                var content = new StoreItem(config, item.values.contenttype, item.values.id)
                addItemEvents(content);
                content.next(item);
                list.push(content);
            }
            
            self.data = list;

            if(!self.happened('next:first')) {
                let event = new self.ContentEvent('next:first', {success: true});
                self.dispatchEvent(event);
                if (event.defaultPrevented) {return;}
            }

            let event = new self.ContentEvent('next', {success: true});
            self.dispatchEvent(event);
            if (event.defaultPrevented) {return;}
        }

        function error() {
            let event = new self.ContentEvent('next', {success: false});
            self.dispatchEvent(event)
            if (event.defaultPrevented) {return;}
        }

        function setQuery(query) {
            self.query = query;
        }

        function addItemEvents(item) {
            item.addEventListener('next:before', function(event){
                self.dispatchEvent(event, 'next:before:item', item);
            });
            
            item.addEventListener('next', function(event){
                self.dispatchEvent(event, 'next:item', item);
            });

            item.addEventListener('fetch:related', function(event){
                self.dispatchEvent(event, 'fetch:related:item', item);
            });

            item.addEventListener('delete', function(event){
                self.dispatchEvent(event, 'delete:item', item);
            });

            item.addEventListener('update:before', function(event){
                self.dispatchEvent(event, 'update:before:item', item);
            });

            item.addEventListener('update', function(event){
                self.dispatchEvent(event, 'update:item', item)
            });

            item.addEventListener('create:before', function(event){
                self.dispatchEvent(event, 'create:before:item', item);
            });

            item.addEventListener('create', function(event){
                self.dispatchEvent(event, 'create:item', item);
            });
        }

        // call next page
        function nextPage() {
            self.page = (self.page * 1) + (1 * 1);
            self.fetch();
        }

        // call previus page
        function prevPage() {
            self.page = (self.page * 1) - (1 * 1);
            self.fetch();
        }

        // go to specific page
        function goToPage(page) {
            self.page = (page * 1);
            self.fetch(true);
        }

        function removeItem(id) {
            for (var i = 0; i < self.data.length; i++) {
                if (self.data[i].id == id) {
                    self.data.splice(i, 1);
                    break;
                }                 
            }
        }

        self.on('delete:item', function(data){
            self.removeItem(data.id)
        })

    }

    function addAction(name, handler)  {
        this[name] = handler.bind(this);
    }

    function addGetter(name, handler)  {
        this.get[name] =  handler.bind(this);
    }

    function addMutation(name, handler)  {
        this.mutate[name] = commit.bind(this, name, handler);
    }

    function commit(name, handler, ...args){
        this.history.push(this.data);
        this.log.push("mutate: " + name);
        handler.apply(this, args);        
    }

    function addEventListener(name, handler, late) {
        var self = this;
        this.callbacks = this.callbacks || {};    
        if (isFunction(handler)) {
            if (self.callbacks.hasOwnProperty(name)) {
                self.callbacks[name].push(handler);
            }
            else {
                self.callbacks[name] = [handler]
            }                                
            if (isFunction(late) && self.happened(name)) {
                late.apply(self)                    
            }
        }
    }

    function removeEventListener(name, handler) {
        this.callbacks = this.callbacks || {};
        if (!this.callbacks.hasOwnProperty(name)){
            return;
        }
        var index = this.callbacks[name].indexOf(handler);
        if (index!= -1) {
            this.callbacks[name][index] = null;
        }                
    }

    function dispatchEvent(event, name, scope) {
            var self = this;
            name = name || event.type;
            scope = scope || self;
            self.log.push(name);
            if (self.callbacks.hasOwnProperty(name)) {
                for (var i = 0; i < self.callbacks[name].length; i++) {
                    if (event.propagationStopped) { break; }
                    if (isFunction(self.callbacks[name][i])) {
                        event.pageHandler = self.callbacks[name][i];
                        self.callbacks[name][i].apply(scope, [event]);
                        event.pageHandler = null;                            
                    }
                }
            }
    }

    function ContentEvent(self, type, values) {
        var event = this;
        event.target = self;
        event.type = type;
        event.cancelable = true;
        event.defaultPrevented = false;   
        event.propagationStopped = false;
        event.preventDefault = preventDefault;
        event.stopPropagation = stopPropagation;
        event.remove = remove;
        event.timeStamp = new Date().getTime();

        // merge with payload
        if (values !== undefined) {
            event = Object.assign(event, values);
        }

        function preventDefault() {
                if (event.cancelable) {
                    event.defaultPrevented = true;
                }
            }

        function stopPropagation() {
                event.propagationStopped = true;                    
            }

        function remove() {
        event.target.removeEventListener(event.type, event.pageHandler)
        }

    }


    function happened(event, yesCb, noCb) {
        if (this.log.includes(event)) {
            if (isFunction(yesCb)) {
                yesCb.bind(this, yesCb)();
            }
            return true;
        }
        else {
            if (isFunction(noCb)) {
                noCb.bind(this, noCb)();
            }
            return false;
        }

    }

     /**
     * @name checkQuery
     * @description iterate over the properties
     * of the query property of a StorageItem,
     * in case the operator is not supported
     * in the implementation
     * or the query does not have the correct format
     * must throw an exception
     * @param {supported} Array
     * @return null
     */
    function checkQuery(supported) {
        var object = this.query.filter;

        if (!Array.isArray(supported) || typeof supported == "undefined") {
            throw "an array of supported operators was not provided"; 
        } 

        var validations = {
            "=": function(val) {
                var type = typeof val;
                return (type == "string" || type == "number");
            },
            ">": function(val) {
                var type = typeof val;
                return (type == "number");
            },
            ">=": function(val) {
                var type = typeof val;                
                return (type == "number");
            },
            "<": function(val) {
                var type = typeof val;
                return (type == "number");
            },
            "<=": function(val) {
                var type = typeof val;
                return (type == "string");
            },
            "<=": function(val) {
                var type = typeof val;
                return (type == "string");
            },
            "<>": function(val) {
                var type = typeof val;
                return (type == "string" || type == "number");
            },
            "!=": function(val) {
                var type = typeof val;
                return (type == "string" || type == "number");
            },
            "LIKE": function(val) {
                var type = typeof val;
                return (type == "string");
            },
            "CONTAINS": function(val) {
                var type = typeof val;
                return (type == "string");
            },
            "BETWEEN": function(val) {
                var type = typeof val;
                return (type == "string" && val.includes(","));
            },

        }
        
        for (var key in object) {
            if (object.hasOwnProperty(key)) {
                var element = object[key]; 
                if (!element.hasOwnProperty('op')) {
                    throw "missing operator in " + key; 
                }
                if (!element.hasOwnProperty('value')) {
                    throw "missing value in " + key; 
                }
                if (!supported.includes(element.op)) {
                    throw "unsopported operator: " + element.op;                         
                }
                if (!validations.hasOwnProperty(element.op)) {
                    throw "no validation was found for this operator: " + element.op;                        
                }
                if (!validations[element.op](element.value)) {
                    throw "the value is not valid: " + element.value + ", using the operator: " + element.op;                        
                }

            }
        }            
    }

    function isFunction(functionToCheck) {
        var getType = {};
        return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
    }

    /**
     * @param {Object} dst Destination object.
     * @param {...Object} src Source object(s).
     * @returns {Object} Reference to `dst`.
     */
    function merge(dst) {
        return baseExtend(dst, slice.call(arguments, 1), true);
    }

    function baseExtend(dst, objs, deep) {
        for (var i = 0, ii = objs.length; i < ii; ++i) {
            var obj = objs[i];
            if (!isObject(obj) && !isFunction(obj)) continue;
            var keys = Object.keys(obj);
            for (var j = 0, jj = keys.length; j < jj; j++) {
            var key = keys[j];
            var src = obj[key];

            if (deep && isObject(src)) {
                if (isDate(src)) {
                dst[key] = new Date(src.valueOf());
                } else if (isRegExp(src)) {
                dst[key] = new RegExp(src);
                } else if (src.nodeName) {
                dst[key] = src.cloneNode(true);
                } else if (isElement(src)) {
                dst[key] = src.clone();
                } else {
                if (!isObject(dst[key])) dst[key] = isArray(src) ? [] : {};
                baseExtend(dst[key], [src], true);
                }
            } else {
                dst[key] = src;
            }
            }
        }
        return dst;
    }
})();