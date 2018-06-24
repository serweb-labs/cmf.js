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
    function indexedDBAdapter(schema, idsGenerator, firebaseIdbSync, IdbManager, _) {
        
        var self = this;
        var mydb = null;
        var opened = false;        
        var softDelete = true;
        var observers = {};
        var collections = {};
        var db = IdbManager("db_store", schema.version());
        firebaseIdbSync.sync();
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

         /**
         * @name getCollection
         * @description get a collection by contenttype
         * @param {content} StoreCollection
         * @return Promise
         */
        function getCollection(content, ignoreCache) {
            return new Promise((resolve, reject) => {  
                var instance = db.getInstance(content.contenttype);
                instance.watch(observerFunction)
                content.checkQuery(self.supportedOps);
     
                var first = (content.limit * content.page) - content.limit + 1;
                var last = (content.limit * content.page);
                var filters = (Object.keys(content.query).length > 0);

                instance.iterate(undefined, filterQuery.bind(undefined, content))
                    .then((items)=>{
                        if (!collections.hasOwnProperty(content.contenttype)) {
                            collections[content.contenttype] = [];
                        }
                        collections[content.contenttype].push(content);
                        resolve({items: orderAndPaginate(content, items, first, last)});
                    })

            })              
        }


        /**
         * @name getContent
         * @description get a item by id
         * @param {content} StoreItem
         * @return Promise
         */
        function getContent(content, ignoreCache) {            
            return new Promise((resolve, reject) => {
                var instance = db.getInstance(content.contenttype);
                instance.getItem(content.id)
                    .then(event => {
                        var data = event.target.result;                
                        content.next({values: data.values, relations: data.relations});   
                    })
                    .catch(event => {
                        reject('unknow error');
                    })
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
                var instance = db.getInstance(content.contenttype);
                // set
                var key = idsGenerator();
                var ts = Date.now();
                content.data.values.created = ts;
                content.data.values.changed = ts;
                content.data.values.id = key;
                content.data.id = key;
                // commit
                instance.setItem(content.data.id, content.data)
                    .then(event => {
                        resolve({data: content.data});  
                    })
                    .catch(event => {
                        reject('unknow error');
                    })
                
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
                var instance = db.getInstance(content.contenttype);
                instance.getItem(content.id)
                    .then(result => {
                        // set
                        var data = content.data;
                        data.values.changed = Date.now();
                        data.id = data.values.id;
                        // commit     
                        instance.setItem(data.id, data)
                            .then(event => {
                                resolve({data: data});  
                            })
                            .catch(event => {
                                reject('unknow error');
                            }) 
                    }) 
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
                var instance = db.getInstance(content.contenttype);
                instance.removeItem(content.id)
                    .then((result)=>{
                        resolve("ok")
                    })
            });
        }
       
        /*******************************
        *           INTERNALS
        ********************************/
        
               
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

        function filterQuery(content, val) {
            var object = content.query.filter;
            for (var key in object) {
                if (object.hasOwnProperty(key)) {
                    var item = object[key];
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