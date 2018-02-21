(function() {
'use strict';
    window.cmf = cmf;
    /**
     * @name cmf
     * @description get, parse and set shared data
     */

    function cmf() {

        function person(api, schema){
            this.api = api;
            this.schema = schema;
        }

        /************************************
         *
         *          CONFIGURATION
         *
         ************************************/      

        var container = new Container();

        /************************************
         *
         *          BOOTSTRAPING
         *
         ************************************/
        

        container.value({
            name: "firebaseConfig",
            value: {
                apiKey: "xxxxxxxxxxxxxxxxxxxxxxxxxxx",
                authDomain: "xxxxxx.firebaseapp.com",
                databaseURL: "https://xxxxxx.firebaseio.com/",
                storageBucket: "bucket.appspot.com"
            }
        });

         container.service({
            name: "api",
            di: ['firebaseConfig'],
            init: firebaseRtdbAdapter
        });

        container.service({
            name: "schemaStatement",
            init: SchemaStatement
        });

        container.service({
            name: "schema",
            init: SchemaService
        });
        
        container.service({
            name: "viewsStatement",
            init: ViewsStatement
        });

        container.service({
            name: "views",
            init: ViewsService
        });

        container.service({
            name: "StoreItem",
            di: false,
            init: function() {
                var container = this;
                var config = {
                    api: this.api,
                    schema: this.schema,
                    init: function() {
                        container.value({ name: this.uri, value: this});
                    }
                };
                return StoreItem.bind(null, config);
            }
        });

        container.service({
            name: "StoreCollection",
            di: false,
            init: function() {
                var container = this;
                var config = {
                    api: this.api,
                    schema: this.schema,
                    init: function() {
                        container.value({ name: this.uri, value: this});
                    }
                };
                return StoreCollection.bind(null, config);
            }
        });

        container.service({
            name: "person",
            init: person
        });

        /*
        container.factory('storeItem', function($ct, $id, $name){
            return StoreCollection.bind(this, $ct, $id, $name);
        }, false);

        container.factory('storeItem1', function($ct, $id, $name){
            return new StoreCollection(this, $ct, $id, $name);
        });

        container.factory('storeItem2', function(...args){
            return new StoreCollection(this, ...args);
        });

        container.factory('storeItem3', function(...args){
            return new StoreCollection.apply(this, args);
        });

        container.register('storeCollection', function(){
            return StoreCollection.bind(null, config);
        });*/

        return container;
    }
})();