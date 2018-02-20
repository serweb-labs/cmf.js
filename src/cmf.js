(function() {
'use strict';
    window.cmf = cmf;
    /**
     * @name cmf
     * @description get, parse and set shared data
     */

    function cmf() {


        /************************************
         *
         *          CONFIGURATION
         *
         ************************************/      

        var container = newContainer();
        var api = new firebaseRtdbAdapter();
        var schema = new SchemaStatement();
        var views = new ViewsStatement();

        /************************************
         *
         *          BOOTSTRAPING
         *
         ************************************/
        container.register('api', api);
        
        container.register('schemaStatement', schema);
        
        container.register('viewsStatement', views);        
        
        container.service('schema', function(){
            return new SchemaService(this.schemaStatement)
        });

        container.service('views', function(){
            return new ViewsService(this.viewsStatement)
        });
        
        container.service('store', function(){
            return store.bind(null, this);
        });

        container.factory('storeItem', function($ct, $id, $name){
            return StoreCollection.bind(this, $ct, $id, $name);
        });

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
        });

        return container;
    }
})();