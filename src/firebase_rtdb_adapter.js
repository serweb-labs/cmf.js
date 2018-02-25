(function() {
'use strict';
    window.firebaseRtdbAdapter = firebaseRtdbAdapter;

    /**
     * @name firebaseRtdbAdapter
     * 
     * @implement adapterInterface
     * 
     * @description used by StorageItem 
     * and StorageCollection,describes a
     * way to communicate with
     * Firebase Realtime Database
     * 
     * @documentation: attention, in the testing phase!
     * make sure that the firebase rules write to any user
     *  {
     *   "rules": {
     *       ".read": "true",
     *       ".write": "true"
     *     }
     *   }    
     */
    function firebaseRtdbAdapter(firebaseConfig) {

        var self = this;

        // initialize        
        firebase.initializeApp((firebaseConfig || {}));

        /*******************************
        *              API
        ********************************/

        // interface        
        this.getContent = getContent;
        this.getCollection = getCollection;
        this.createContent = createContent;
        this.updateContent = updateContent;
        this.deleteContent = deleteContent;      
        self.supportedOps = ["=", ">", ">=", "<", "<=", "<>", "!=", "LIKE", "CONTAINS", "BETWEEN"];
        
        /**
         * @name getCollection
         * @description get a collection by contenttype
         * @param {content} StoreCollection
         * @return Promise
         */
        function getCollection(content, ignoreCache) {
            return new Promise((resolve, reject) => {
                content.checkQuery(self.supportedOps);

                var ct = firebase.database().ref(content.uri).orderByKey();
                var count = 0;

                // optimization
                if (Object.keys(content.query).length == 0) {
                    ct.limitToFirst(content.limit);
                }

                // suscribe                
                ct.on('value', function(result) {
                    count++;
                    var values = result.val();                
                    var data = toSet(values);
                    var items = [];
                    var first = (content.limit * content.page) - content.limit + 1;
                    var last = (content.limit * content.page);

                    // var from = Date.now();
                    for (var item of data) {
                        let relations = digestRelations(content, item);
                        var val = {values: item, relations: relations};

                        if (filterQuery(content, val)) {
                            // add to collection                
                            items.push(val);     

                            // pagination
                            if (content.query.filter.key == "id" && items.length >= last) {
                                break;
                            }    
                        }
                    }
                    // var to = Date.now();                    
                    // console.log("op", (to - from), items.length)

                    if (count == 1) {                        
                        resolve({items: orderAndPaginate(content, items, first, last)});
                    }
                    else {                       
                        content.next({items: orderAndPaginate(content, items, first, last)});
                    }
                });
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
                var ct = firebase.database().ref(content.uri);
                var count = 0;                
                // suscribe
                ct.on('value', function(result) {
                    count++;
                    var values = result.val();
                    var relations = digestRelations(content, result.val());
                    if (count == 1) {
                        resolve({values: values, relations: relations});
                    }
                    else {
                        content.next({values: values, relations: relations});
                    }
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
            content.data.values.created = firebase.database.ServerValue.TIMESTAMP;
            content.data.values.changed = firebase.database.ServerValue.TIMESTAMP;
            return new Promise((resolve, reject) => {
                var ct = firebase.database().ref(content.contenttype);
                var ref = ct.push();
                content.data.values.id = ref.key;
                ref.set(content.data.values).then(function(){
                    resolve({data: content.data.values})
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
            content.data.values.changed = firebase.database.ServerValue.TIMESTAMP;            
            return new Promise((resolve, reject) => {
                var ct = firebase.database().ref(content.uri);
                ct.set(content.data.values).then(function(){
                    var result = content.data;
                    resolve({data: result})
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
                var ct = firebase.database().ref(content.uri);
                ct.remove().then(function(){
                    resolve()
                })
            });
        }

        /*******************************
        *           INTERNALS
        ********************************/

        function parse(data) {
            return JSON.parse(data);
        }

        function digestRelations(content, data){            
            var schema  = content.schema.relations;
            var relations = {};
            for (var key in schema) {
                if (!relations.hasOwnProperty(key)){
                    relations[key] = [];
                }
                if (schema.hasOwnProperty(key)) {
                    if (data.hasOwnProperty(key)) {
                        let uri = schema[key].contenttype + "/" + data[key];
                        relations[key].push(uri)
                    }
                }
            }

            return relations;
        }

        function filterQuery(content, data) {
            var object = content.query.filter;
            for (var key in object) {
                if (object.hasOwnProperty(key)) {
                    var item = object[key];
                    var val =  data.values[key];           
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

        function toSet(object){
            var mySet = new Set()
            for (var key in object) {
                if (object.hasOwnProperty(key)) {
                    mySet.add(object[key]);                    
                }
            }
            return mySet;
        }

        function toArray(object){
            var arr = [];
            for (var key in object) {
                if (object.hasOwnProperty(key)) {
                    arr.push(object[key]);                    
                }
            }
            return arr;
        }
    }
})();