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
            this.time = Date.now();
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
        

         /* firebase config object */
        container.value({
            name: "firebaseConfig",
            value: {
                apiKey: "xxxxxxxxxxxxxxxxxxxxxxxxxxx",
                authDomain: "xxxxxx.firebaseapp.com",
                databaseURL: "https://xxxxxx.firebaseio.com/",
                storageBucket: "bucket.appspot.com"
            }
        });

        /* firebase api adapter for Store */
        /*
        container.service({
            name: "api",
            di: ['firebaseConfig'],
            target: firebaseRtdbAdapter
        });*/

        /* indexedDb adapter for Store */
        container.service({
            name: "api",
            target: indexedDBAdapter
        });

        /* indexedDb to firebase sync,
            work with indexedDb api adapter */
        container.service({
            name: "firebaseIdbSync",
            target: firebaseIdbSync
        });

        /* safe chronologic unique keys */
        container.service({
            name: "idsGenerator",
            di: false,
            target: function(){
                return generatePushID;
            }
        });

        /* lodash */
        container.service({
            name: "_",
            di: false,
            target: function(){
                return _;
            }
        });

        container.service({
            name: "schemaStatement",
            target: SchemaStatement
        });

        container.service({
            name: "schema",
            target: SchemaService
        });
        
        container.service({
            name: "viewsStatement",
            target: ViewsStatement
        });

        container.service({
            name: "views",
            target: ViewsService
        });

        container.service({
            name: "authorization",
            target: rolesBasedAccessControl
        });

        container.service({
            name: "authentication",
            target: authentication
        });
        
        container.service({
            name: "fakeAuthenticationProvider",
            di: false,
            lazy: false,
            target: function() {                
                return new fakeAuthenticationProvider(this.authentication);
            }
        });

        container.factory({
            name: "IdbManager",
            di: false,
            target: function(name, version) {
                return new IdbManager(this.schema, name, version)
            }
        });
      

        container.service({
            name: "StoreItem",
            di: false,
            target: function() {
                var container = this;
                var config = {
                    api: this.api,
                    schema: this.schema,
                    init: function() {
                        container.value({ name: this.uri, target: this});
                    }
                };
                return StoreItem.bind(null, config);
            }
        });

        container.service({
            name: "StoreCollection",
            di: false,
            target: function() {
                var container = this;
                var config = {
                    api: this.api,
                    schema: this.schema,
                    init: function() {
                        container.value({ name: this.uri, target: this});
                    }
                };
                return StoreCollection.bind(null, config);
            }
        });

        container.service({
            name: "person",
            target: person
        });
      
        container.factory({
            name: "queue",
            di: false,
            target: function(){
                return new Seq();
            }
        });

        return container;
    }
})();