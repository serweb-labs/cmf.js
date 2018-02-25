(function() {
'use strict';
    window.indexedDBAdapter = indexedDBAdapter;

    /**
     * @name indexedDBAdapter
     * @implement adapterInterface
     * @description used by StorageItem 
     * and StorageCollection,describes a
     * way to communicate with indexedDB
     */
    function indexedDBAdapter(schema, idsGenerator, firebaseIdbSync, schemaStatement, _) {
        
        var self = this;
        var mydb = null;
        var opened = false;        
        var softDelete = true;
        var observers = {};
        var collections = {};

        /*******************************
        *              API
        ********************************/

        // content intarface
        self.getContent = getContent;
        self.getCollection = getCollection;
        self.createContent = createContent;
        self.updateContent = updateContent;
        self.deleteContent = deleteContent;
        self.supportedOps = ["=", ">", ">=", "<", "<=", "<>", "!=", "LIKE", "CONTAINS", "BETWEEN"];
        
        self.getDb = getDb;
        self.db = null;
        self.waiting = [];
        self.opened = false;

        // sync
        firebaseIdbSync.sync(self, schema);

        /**
         * @name getCollection
         * @description get a collection by contenttype
         * @param {content} StoreCollection
         * @return Promise
         */
        function getCollection(content, ignoreCache) {
            return new Promise((resolve, reject) => {                
                content.checkQuery(self.supportedOps);                            
                getDb().then(function(db){
                    var objectStore = db.transaction([content.contenttype], "readonly").objectStore(content.contenttype);
                    var items = [];
                    var first = (content.limit * content.page) - content.limit + 1;
                    var last = (content.limit * content.page);
                    var filters = (Object.keys(content.query).length > 0);

                    var onNext = function (){

                        if (!observers.hasOwnProperty(content.contenttype)) {
                            var txn = db.transaction([content.contenttype], 'readonly');
                            var control = txn.observe(observerFunction);
                            txn.oncomplete = function() {
                                observers[content.contenttype] = true;
                            }
                        }

                        if (!collections.hasOwnProperty(content.contenttype)) {
                            collections[content.contenttype] = [];
                        }
                        
                        collections[content.contenttype].push(content);
                        resolve({items: orderAndPaginate(content, items, first, last)});     
                    }

                    var request = objectStore.openCursor(); 
                     
                    request.onerror = function(event) {
                        reject('unknow error');
                    };

                    request.onsuccess = function(event) {
                        var cursor = event.target.result;
                        var advance = false;
                        if(cursor) {
                            if (!filters && !advance) {
                                advance = true;
                                cursor.advance(first);
                            }
                            if (filterQuery(content, cursor)){
                                items.push(cursor.value);                                
                                if (content.query.filter.key == "id" && items.length >= last) {                                    
                                    onNext();
                                    return;    
                                }      
                            }                            
                            cursor.continue();                            
                        }
                        else {
                            onNext();                          
                        }
                    };

                })              
            });     
        }

        /**
         * @name getContent
         * @description get a item by id
         * @param {content} StoreItem
         * @return Promise
         */
        function getContent(content, ignoreCache) {
            return new Promise((resolve, reject) => {
                getDb().then(function(db){                    
                    var objectStore = db.transaction([content.contenttype], "readonly").objectStore(content.contenttype);
                    var request = objectStore.get(content.id);         
                    request.onerror = function(event) {
                        reject('unknow error');
                    };
                    request.onsuccess = function(event) {
                        var data = event.target.result;                
                        content.next({values: data.values, relations: data.relations});                    
                    };
                });
            });           
        }

        /**
         * @name createContent
         * @description create a item
         * @param {content} StoreItem
         * @return Promise
         */
        function createContent(content) {
            return new Promise((resolve, reject) => {
                getDb().then(function(db){
                    var key = idsGenerator();
                    var ts = Date.now();
                    content.data.values.created = ts;
                    content.data.values.changed = ts;
                    content.data.values.id = key;
                    content.data.id = key;
                    var objectStore = db.transaction([content.contenttype], "readwrite").objectStore(content.contenttype);
                    var request = objectStore.add(content.data);
                    request.onsuccess = function(event) {
                        resolve({data: content.data});    
                    };               
                    request.onerror = function(event) {
                        reject('unknow error');
                    };
                });
            });
        }

        /**
         * @name updateContent
         * @description update a item by id
         * @param {content} StoreItem
         * @return Promise
         */
        function updateContent(content) {           
            return new Promise((resolve, reject) => {
                getDb().then(function(db){
                    var objectStore = db.transaction([content.contenttype], "readwrite").objectStore(content.contenttype);
                    var request = objectStore.get(content.id);                
                    request.onerror = function(event) {
                        reject('unknow error');
                    };                
                    request.onsuccess = function(event) {
                        var data = request.result;
                        data = content.data;
                        data.values.changed = Date.now();
                        data.id = data.values.id;                        
                        var requestUpdate = objectStore.put(data);
                        requestUpdate.onerror = function(event) {
                            reject('unknow error');
                        };
                        requestUpdate.onsuccess = function(event) {
                            resolve({data: event.target.result});                 
                        };
                    };
                });
            });

        }

        /**
         * @name deleteContent
         * @description remove a item by id
         * @param {content} StoreItem
         * @return Promise
         */
        function deleteContent(content) {
            return new Promise((resolve, reject) => {
                getDb().then(function(db){
                    var request = db.transaction([content.contenttype], "readwrite")
                    .objectStore(content.contenttype)
                    .delete(content.id);
                    request.onsuccess = function(event) {
                        resolve("ok")                    
                    };
                });
            });
        }
       
        /*******************************
        *           INTERNALS
        ********************************/
        
        function getDb() {
            return new Promise((resolve, reject) => {
                if (mydb !== null) {                    
                    resolve(mydb);
                }
                else {
                    self.waiting.push({resolve: resolve, reject: reject});
                }
                if (!opened) {
                    openDb();
                }
            });  
        }

        function openDb() {
            opened = true;
            var req = indexedDB.open("db_store", schema.version());
            req.onsuccess = function (evt) {     
                mydb = req.result;
                self.waiting.forEach(function(handlers){
                    handlers.resolve(mydb);
                })
            };

            req.onerror = function (evt) {  
                self.waiting.forEach(function(resolver){
                    handlers.reject("unknow error");                    
                })
            };
        
            req.onupgradeneeded = function (evt) {
                var db = evt.currentTarget.result;

                var arr = Array.from(db.objectStoreNames);
                arr.forEach(function(ct) {
                    if(!schema.keys().has(ct)) {
                        var store = db.deleteObjectStore(ct);
                    }
                });

                schema.keys().forEach(function(ct) {
                    if(!db.objectStoreNames.contains(ct)) {
                        var store = db.createObjectStore(ct, { keyPath: "id" });
                    }
                });                
            };
        }

        function getKeyByOrder(object, from) {
            return new Promise((resolve, reject) => {
                var advance = false;
                var counter = 0;
                var openCursor = object.openCursor();
                
                openCursor.onsuccess = function(event) {
                    var cursor = event.target.result;
                    if(cursor) {
                        counter++;
                        if (!advance && counter < from) {
                            advance = true;
                            cursor.advance(from);
                        }
                        else {
                            resolve(cursor.key);
                        }
                    }
                    else {
                        resolve(null);
                    }
                }
                
                openCursor.onerror = function(event){
                    reject("unknow error");
                }
            });
        }

        function filterQuery(content, cursor) {
            var object = content.query.filter;
            for (var key in object) {
                if (object.hasOwnProperty(key)) {
                    var item = object[key];
                    var val =  cursor.value.values[key];               
                    switch (item.op) {
                        case "=":
                            return val == item.value;
                        case ">":
                            return val > item.value;
                        case ">=":
                            return val >= item.value;
                        case "<":
                            return val < item.value;
                        case "<=":
                            return val < item.value;
                        case "<>":
                        case "!=":
                            return val != item.value;
                        case "LIKE":
                        case "CONTAINS":
                            return val.includes(item.value);
                        case "BETWEEN":
                            var sp = val.split(",");
                            return (item.value > sp[0] && item.value < sp[1])                
                        default:
                            return false;
                    }
                }
            }
            return true;
        }


        function orderAndPaginate(content, items, first, last) {
            var orderedItems =  _.orderBy(items, function(e) {
                return e.values[content.query.order.value]}, [content.query.order.key]
            );
            return orderedItems.slice((first - 1), last);            
        }

        function observerFunction(changes) {
            // An object store that we're observing has changed.
            changes.records.forEach(function(records, objectStoreName) {
                records.forEach(function(change) {
                // do something with change.type and change.key
                var type = change.type;
                switch (type) {
                    case 'put':
                    case 'add':
                    case 'delete':
                        console.log('key "', change.key, '" added.');
                        collections[objectStoreName].forEach(function(content){
                            content.fetch();
                        });
                    break;
                }
                });
            });
        }

    }
})();