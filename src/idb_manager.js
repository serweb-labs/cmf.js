(function() {
    'use strict';
        window.IdbManager = IdbManager;
    
        /**
         * @name indexedDBAdapter
         * @implement adapterInterface
         * @description used by StorageItem 
         * and StorageCollection,describes a
         * way to communicate with indexedDB
         */
        function IdbManager(schema, dbName, version) {
            
            var self = this;
            var mydb = null;
            var objects = {}
            var waiting = [];
            var observers = {};
    
            /*******************************
            *              API
            ********************************/
            self.name = dbName
            self.getInstance = getInstance;            
            self.opened = false;
    
    
            function getDb() {
                return new Promise((resolve, reject) => {
                    if (mydb !== null) {                    
                        resolve(mydb);
                    }
                    else {
                        waiting.push({resolve: resolve, reject: reject});
                    }
                    if (!self.opened) {
                        openDb();
                    }
                });  
            }
    
            function openDb() {
                self.opened = true;
                var req = indexedDB.open(self.name, version);
                req.onsuccess = function (evt) {     
                    mydb = req.result;
                    waiting.forEach(function(handler){
                        handler.resolve(mydb);
                    })
                };
    
                req.onerror = function (evt) {  
                    waiting.forEach(function(handler){
                        handler.reject("unknow error");                    
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
    
            function createInstance(ct) {                
                if (typeof ct === "undefined") {
                    throw "ct can not be undefined"
                }
                var m = this;
                m.observer = false;
                m.obj = {
                    ro: () => new Promise((resolve, reject) => {
                        getDb().then(db => {
                            resolve(db.transaction([ct], "readonly").objectStore(ct))
                        });
                    }),
                    rw: () => new Promise((resolve, reject) => {
                        getDb().then(db => {
                            resolve(db.transaction([ct], "readwrite").objectStore(ct))
                        });
                    })
                };
        
                m.getItem = (id) => new Promise((resolve, reject) => {
                    m.obj.ro().then(r => {
                        let l = r.get(id)
                        l.onsuccess = (e) => resolve(e.target.result);
                        l.onerror = reject;
                    });
                });
        
                m.keys = () => new Promise((resolve, reject) => {
                    let k = [];
                    m.obj.ro().then(r => {
                        let a = r.openCursor()
                        a.onsuccess = (e) => {
                            let r = e.target.result;
                            if (r) { k.push(r.key); r.continue(); } else { resolve(k) }
                        }
                        a.onerror = reject;
                    });
                });
        
                m.setItem = (key, value) => new Promise((resolve, reject) => {
                    m.keys().then(keys => {
                        m.obj.rw().then((r) => {
                            let res = (e) => resolve(e.target.result);
                            if (keys.includes(key)) {
                                r.put(value).onsuccess = res
                            }
                            else {
                                r.add(value).onsuccess = res
                            }
                        });
        
                    })
                })
        
                m.removeItem = (key) => new Promise((resolve, reject) => {
                    let v = [];
                    m.obj.rw().then(r => {
                        let a = r.delete(key)
                        a.onsuccess = (e) => {
                            let r = e.target.result
                            resolve(r)
                        }
                        a.onerror = reject;
                    });
                });
    
                m.watch = function(fn) {
                    if (!m.observer) {
                        m.obj.ro().then(r => {
                            let obs = r.transaction.observe(fn);
                            m.observer = true;
                            obs.oncomplete = function() {}
                        });
                    }
                }
        
                m.iterate = (query, filter) => new Promise((resolve, reject) => {
                    let v = [];
                    if (typeof filter === 'undefined') {
                        filter = () => true;
                    }
                    m.obj.ro().then(r => {
                        let a = r.openCursor(query)
                        a.onsuccess = (e) => {
                            let r = e.target.result
                            if (r === null) {
                                resolve(v)
                                return;
                            }
                            else if (filter(r)) {
                                v.push(r.value);
                            }
                            r.continue();
                        }
                        a.onerror = reject;
                    });
                });
            }
    
            function getInstance(ct, newInstance) {
                if (newInstance) {
                    return new createInstance(ct);
                }
                if (!objects.hasOwnProperty(ct)) {
                    objects[ct] = new createInstance(ct);
                }
                return objects[ct];
            }
   
        }
    })();