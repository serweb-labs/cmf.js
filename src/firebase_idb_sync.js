'use strict';
/**
 * @name firebaseIdbSync
 * @description define de schema of model
 */

function firebaseIdbSync(firebaseConfig, IdbManager, queue, schema) {

    // initialize        
    var stores = {};
    this.sync = sync;
    var api = null;
    var db = IdbManager("db_store", schema.version());
    firebase.initializeApp((firebaseConfig || {}));

    function sync() {
        syncAll().then(syncListeners)
    }

    function syncAll() {
        var syncQueue = queue();
        schema.keys().forEach(function (contenttype) {
            // initial sync down to up
            syncQueue.add(downToUp, contenttype)

            // initial sync up to down
            syncQueue.add(upToDown, contenttype)

        });
        return syncQueue.execute()
    }

    function syncListeners() {
        schema.keys().forEach(function (contenttype) {          
            // suscribe indexed db events (down to up)            
            db.getInstance(contenttype, true).watch(changes => {
                // An object store that we're observing has changed.
                changes.records.forEach(function(records, objectStoreName) {
                    records.forEach(function(change) {
                        // do something with change.type and change.key
                        var type = change.type;
                        // switch (type) {
                        //     case 'put':
                        //         var values = change.value;
                        //         var obj = new cmf.firebaseObjects("tasks", values.id);
                        //         obj.setRaw(values)
                        //         obj.save();
                        //     case 'add':
                        //         var values = change.value;
                        //         var obj = new cmf.firebaseObjects("tasks", values.id);
                        //         obj.setRaw(values)
                        //         obj.save();
                        //     case 'delete':
                        //         var values = change.value;
                        //         var obj = new cmf.firebaseObjects("tasks", values.id);
                        //         obj.remove();
                        //     break;
                        // }
                        console.log('change on "', change.key, '"');                            
                    });
                });
            })
    
            // suscribe firebase events (up to down)             
            var ct = firebase.database().ref(contenttype).orderByKey();

            ct.on('child_removed', function(item) {
                tryRemove(contenttype, item.val())
                    .then(() => { console.log("removed: ok") })
            });
    
            ct.on('child_added', function(item) {
                tryCreate(contenttype, item.val())
                    .then(() => { console.log("created: ok") })
            });
              
            ct.on('child_changed', function(item) {
                tryUpdate(contenttype, item.val())
                    .then(() => { console.log("updated: ok") })
            });
        })
    }

    function downToUp(contenttype) {
        return new Promise((resolve, reject) => {
            // initial sync down to up
            db.getInstance(contenttype).iterate().then((items)=>{
                items.forEach(item => {
                    // existe en firebase?
                        // crear
                    // es mas reciente que en firebase?
                        // actualizar
                    // se debe borrar en firebase?
                        // borrar
                    console.log("----foreach")
                    resolve("ok")
                })
            })
        })
    }

    function upToDown(contenttype) {
        return new Promise((resolve, reject) => {
            var ct = firebase.database().ref(contenttype).orderByKey();
            var changed = Date.now();

            ct.once('value', function (result) {
                var values = result.val();
                var collection = toSet(values);
                if (collection.length == 0) {
                    resolve("ok");
                    return;
                }
                
                var myQueue = queue()              

                collection.forEach(item => {
                    var item = { id: item.id, values: item, relations: digestRelations(contenttype, item) };
                    db.getInstance(contenttype).keys().then(data => {
                        if (!data.includes(item.id)) {
                            myQueue.add(tryCreate, contenttype, item)
                                .then(() => { console.log("created: ok") })
                        }
                        else if (item.values.changed > changed) {
                            myQueue.add(tryUpdate, contenttype, item)
                                .then(() => { console.log("updated: ok") })
                        }
                    })
                    myQueue.execute().then(resolve)                          
                })

                changed = Date.now();
            });
        })
    }

    function tryUpdate(contenttype, item) {
        return new Promise((resolve, reject) => {
            db.getInstance(contenttype).getItem(item.id)
                .then((old) => {
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
            // TODO: safe set
            // item.setAttr(item, "values.changed") = Date.now; 
            try {
                item.values.changed = Date.now();
                db.getInstance(contenttype).setItem(item.id, item)
                    .then(data => resolve(data))
                    .catch(data => reject(data))
            } catch(reject) {
                reject("unknow error")
            }
        });
    }

    function tryRemove(contenttype, data) {
        return new Promise((resolve, reject) => {
            try {
                item.values.changed = Date.now();
                db.getInstance(contenttype).removeItem(data.key)
                    .then(data => resolve(data))
                    .catch(data => reject(data))
            } catch(reject) {
                reject("unknow error")
            }
        });
    }


    function digestRelations(ct, data) {
        var relations = {};
        var dm = schema.get(ct).relations;
        for (var key in dm) {
            if (dm.hasOwnProperty(key)) {
                if (!relations.hasOwnProperty(key)) {
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

    function toSet(object) {
        var mySet = new Set()
        for (var key in object) {
            if (object.hasOwnProperty(key)) {
                mySet.add(object[key]);
            }
        }
        return mySet;
    }

}