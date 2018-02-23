(function() {
'use strict';
    window.indexedDBAdapter = indexedDBAdapter;
    /**
     * @name data.factory
     * @description get, parse and set shared data
     */
    function indexedDBAdapter() {

        /*******************************
        *              API
        ********************************/

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
        const dbPromise = idb.open('keyval-store', 1, upgradeDB => {
            upgradeDB.createObjectStore('keyval');
          });

          const dbPromise2 = idb.open('keyval-store', 2, upgradeDB => {
            // Note: we don't use 'break' in this switch statement,
            // the fall-through behaviour is what we want.
            switch (upgradeDB.oldVersion) {
              case 0:
                upgradeDB.createObjectStore('keyval');
              case 1:
                upgradeDB.createObjectStore('objs', {keyPath: 'id'});
            }
          });
          
          const idbKeyval = {
            get(key) {
              return dbPromise.then(db => {
                return db.transaction('keyval')
                  .objectStore('keyval').get(key);
              });
            },
            set(key, val) {
              return dbPromise.then(db => {
                const tx = db.transaction('keyval', 'readwrite');
                tx.objectStore('keyval').put(val, key);
                return tx.complete;
              });
            },
            delete(key) {
              return dbPromise.then(db => {
                const tx = db.transaction('keyval', 'readwrite');
                tx.objectStore('keyval').delete(key);
                return tx.complete;
              });
            },
            clear() {
              return dbPromise.then(db => {
                const tx = db.transaction('keyval', 'readwrite');
                tx.objectStore('keyval').clear();
                return tx.complete;
              });
            },
            keys() {
              return dbPromise.then(db => {
                const tx = db.transaction('keyval');
                const keys = [];
                const store = tx.objectStore('keyval');
          
                // This would be store.getAllKeys(), but it isn't supported by Edge or Safari.
                // openKeyCursor isn't supported by Safari, so we fall back
                (store.iterateKeyCursor || store.iterateCursor).call(store, cursor => {
                  if (!cursor) return;
                  keys.push(cursor.key);
                  cursor.continue();
                });
          
                return tx.complete.then(() => keys);
              });
            }
          };

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

            dbPromise2.then(db => {
                return db.transaction('objs')
                  .objectStore('objs').getAll();
              }).then(data => {
                var items = [];                
                data.forEach((item) => {
                    let relations = digestRelations(content, item);
                    items.push({values: item, relations: relations})
                })
                console.log(items);
                content.next({items: items});  
                
              });

              /*
              var values = result.val();                
              var data = toArray(values)
              var items = [];*/

        

              
 
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
            return new Promise((resolve, reject) => {            
                var timestamp = Date.now() / 1000 | 0;

                idbKeyval.set(timestamp, content.data).then(function(){
                    resolve(content.data)                
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