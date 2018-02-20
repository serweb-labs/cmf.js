(function() {
'use strict';
    window.firebaseRtdbAdapter = firebaseRtdbAdapter;
    /**
     * @name data.factory
     * @description get, parse and set shared data
     */
    function firebaseRtdbAdapter() {

        /*******************************
        *              API
        ********************************/

        // attention, in the testing phase!
        // make sure that the firebase rules write to any user
        // {
        //    "rules": {
        //        ".read": "true",
        //        ".write": "true"
        //   }
        // }

        // Set the configuration for your app
        // TODO: Replace with your project's config object
        var config = {
            apiKey: "myApikey",
            authDomain: "myproject.firebaseapp.com",
            databaseURL: "https://myproject.firebaseio.com",
            storageBucket: "bucket.appspot.com"
        };
        
        firebase.initializeApp(config);


        // content
        this.getContent = getContent;
        this.getCollection = getCollection;
        this.createContent = createContent;
        this.updateContent = updateContent;
        this.deleteContent = deleteContent;

        
        // Helpers
        this.parse = parse;
        this.addToCache = addToCache;
        this.clearCache = clearCache;
        this.removeToCache = removeToCache;        

        var objects = {}

        /*******************************
        *           INTERNALS
        ********************************/

        function parse(data) {
            return JSON.parse(data);
        }

        /**
         * @name getCollection
         * @description get a item by id
         * @param {string} id
         * @return promise
         */
        function getCollection(content, ignoreCache) {
            var ct = firebase.database().ref(content.uri);
            // suscribe                
            ct.on('value', function(result) {
                var values = result.val();                
                var data = toArray(values)
                var items = [];

                data.forEach((item) => {
                    let relations = digestRelations(content, item);
                    items.push({values: item, relations: relations})
                })

                content.next({items: items});                   
            });
        }

        /**
         * @name getContent
         * @description get a item by id
         * @param {string} id
         * @return promise
         */
        function getContent(content, ignoreCache) {
            var ct = firebase.database().ref(content.uri);
            // suscribe
            ct.on('value', function(result) {
                var values = result.val();
                var relations = digestRelations(content, result.val());
                content.next({values: values, relations: relations});
            });              
        }

        /**
         * @name createContent
         * @description create a item
         * @param {string} id
         * @return promise
         */
        function createContent(content) {
            content.data.values.created = firebase.database.ServerValue.TIMESTAMP;
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
         * @name createContent
         * @description create a item by id
         * @param {string} id
         * @return promise
         */
        function updateContent(content) {
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
         * @param {string} id
         * @return promise
         */
        function deleteContent(content) {
            return new Promise((resolve, reject) => {
                var ct = firebase.database().ref(content.uri);
                ct.remove().then(function(){
                    resolve()
                })
            });
        }

        /**
         * @name addToCache
         * @description add to cache
         * @param {string} id
         * @return promise
         */
        function addToCache(contenttype, id, data) {

        }

        /**
         * @name removeToCache
         * @description remove a item of cache
         * @param {string} id
         * @return promise
         */
        function removeToCache() {
        }

        /**
         * @name clearCache
         * @description clear all cache
         * @param {string} id
         * @return promise
         */
        function clearCache() {
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