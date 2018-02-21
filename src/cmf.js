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

        return container;
    }
})();