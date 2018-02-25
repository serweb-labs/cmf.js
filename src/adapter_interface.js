(function() {
'use strict';
    window.adapterInterface = adapterInterface;
    /**
     * @name adapterInterface
     * @description used by StorageItem 
     * and StorageCollection,describes a
     * generic way to communicate
     * with your api / database / backend
     */
    function adapterInterface(schema, idsGenerator) {        

        var self = this;

        /*******************************
         *              API
         ********************************/
        
        // content intarface
        self.getContent = getContent;
        self.getCollection = getCollection;
        self.createContent = createContent;
        self.updateContent = updateContent;

        /*******************************
        *       QUERY OPERATORS
        ********************************/

        // = (equal to)
        // > (greather than)
        // < (less than)
        // >= (greather than or equal to)
        // <=  (less than or equal to)
        // <>  (no equal to)
        // !=  (no equal to)
        // LIKE  (contain to)
        // CONTAINS (contain to)
        // BETWEEN (from x to y)

        // example in content.query
        //  {
        //    name: {op: "=", value: "peter"},
        //    created: {op: ">", value: 1419536371},
        //    changed: {op: "<", value: 1419536371},
        //    title: {op: "LIKE", value: "thing"},
        //    deleted: {op: "<>", value: 0},
        //    from_date: {op: "BETWEEN", value: "1419536371,1519536230"},
        //  }

        // Your adapter must implement the operators,
        // As the possibilities of implementing all supported
        // operators may vary according to the type of
        // database / backed / api for which the adapter is writing,
        // in the following property you can declare which operators
        // support the implementation:
        self.supportedOps = ["=", ">", ">=", "<", "<=", "<>", "!=", "LIKE", "CONTAINS", "BETWEEN"]


        /**
         * @name getCollection
         * @description get a collection by contenttype
         * @param {content} StoreCollection
         * @return Promise
         */
        function getCollection(content) {            
            //  return new Promise((resolve, reject) => {
            //    /* mandatory check */
            //    content.checkQuery(self.supportedOps);
            //    /* things */
            //    resolve(items: [{values:{}, relations:{}}])
            //  });        
        }

        /**
         * @name getContent
         * @description get a item by id
         * @param {content} StoreItem
         * @return Promise
         */
        function getContent(content) {
            //  return new Promise((resolve, reject) => {
            //    /* things */
            //    resolve({values:{}, relations:{}})
            //  });   
        }

        /**
         * @name createContent
         * @description create a item
         * @param {content} StoreItem
         * @return Promise
         */
        function createContent(content) {
            //  return new Promise((resolve, reject) => {
            //    /* things */
            //    resolve({values:{}, relations:{}})
            //  });
        }

        /**
         * @name updateContent
         * @description update a item by id
         * @param {content} StoreItem
         * @return Promise
         */
        function updateContent(content) {           
            //  return new Promise((resolve, reject) => {
            //    /* things */
            //    resolve({values:{}, relations:{}})
            //  });
        }

        /**
         * @name deleteContent
         * @description remove a item by id
         * @param {content} StoreItem
         * @return Promise
         */
        function deleteContent(content) {
            //  return new Promise((resolve, reject) => {
            //    /* things */
            //    resolve("ok")
            //  });
        }
       
        /*******************************
        *           INTERNALS
        ********************************/
        // Helpers funcions
    }
})();