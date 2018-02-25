'use strict';
/**
 * @name firebaseIdbSync
 * @description define de schema of model
 */

function firebaseIdbSync(firebaseConfig) {
    
    // initialize        
    var stores = {};    
    this.sync = sync;
    var api = null;
    var schema = null;
    firebase.initializeApp((firebaseConfig || {}));    

    function createInstance(ct) {
        var m = this;

        m.obj = {
            ro: () => new Promise((resolve, reject) => {
                api.getDb().then(db => {
                    resolve(db.transaction([ct], "readonly").objectStore(ct))
                });
            }),
            rw: () => new Promise((resolve, reject) => {
                api.getDb().then(db => {
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
                let a =r.openCursor()
                a.onsuccess = (e) => {
                    let r = e.target.result;
                    if (r) {k.push(r.key); r.continue();} else { resolve(k) }
                }
                a.onerror = reject;
            });
        });

        m.setItem = (key, value) => new Promise((resolve, reject) => {
            m.keys().then(keys => {
                m.obj.rw().then((r)=> {
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
        
        m.iterate = (filter, query) => new Promise((resolve, reject) => {
            let v = [];
            m.obj.ro().then(r => {
                let a =r.openCursor(query)
                a.onsuccess = (e) => {
                    let r = e.target.result
                    if(filter(r)) {
                        v.push(r);
                    }
                    if (r) { r.continue();} else { resolve(v) }
                }
                a.onerror = reject;
            });
        });

    }


    function sync(_api, _schema) {
        api = _api;
        schema = _schema;
        schema.keys().forEach(function(contenttype) {
            
            var ct = firebase.database().ref(contenttype).orderByKey();
            var changed = Date.now();
    
            stores[contenttype] = new createInstance(contenttype);
    
            // suscribe                
            ct.on('value', function(result) {            
                var values = result.val();                
                var collection = toSet(values);
                collection.forEach(function(item){
                    var item = {id: item.id, values: item, relations: digestRelations(contenttype, item)};
                    if (item.values.changed > changed) {
                        stores[contenttype].keys().then(data => {
                            if (data.includes(item.id)) {
                                tryUpdate(contenttype, item)
                                .then(()=> {console.log("update: ok")})                         
                            }
                            else {
                                tryCreate(contenttype, item)
                                .then(()=> {console.log("create: ok")})
                            }
                        })                    
                    }                
                })            
    
                changed = Date.now();
            });
    
        }, this);
    }

    function tryUpdate(contenttype, item) {
        return new Promise((resolve, reject) => {
            stores[contenttype].getItem(item.id)
            .then((old)=> {
                item.values.changed = Date.now();
                if (old.values.changed == item.values.changed) {
                    reject();
                }
                else {
                    stores[contenttype].setItem(item.id, item)
                    .then(data => resolve(data))
                    .catch(data => reject(data))
                }
            })
            .catch(data => reject(data))
        });
    }

    function tryCreate(contenttype, item) {
        return new Promise((resolve, reject) => {
            item.values.changed = Date.now();
            stores[contenttype].setItem(item.id, item)
            .then(data => resolve(data))
            .catch(data => reject(data))            
        });
    }

    
    function digestRelations(ct, data){            
        var relations = {};
        var dm = schema.get(ct).relations;
        for (var key in dm) {
            if (dm.hasOwnProperty(key)) {
                if (!relations.hasOwnProperty(key)){
                    relations[key] = [];
                }
                if (data.hasOwnProperty(key)) {
                    let uri = dm[key].contenttype + "/" + data[key];
                    relations[key].push(uri)
                }
            }
        }

        return relations;
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

}