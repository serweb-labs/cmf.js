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
            target: firebaseRtdbAdapter
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

        return container;
    }
})();