'use strict';
/**
 * @name SchemaService
 * @description Views handlers

    */

function SchemaService(statement) {

    var self = this;

    self.set = set;
    self.get = get;
    self.statement = statement || {};

    function set(statement) {
        self.statement = statement;
    } 

    function get(contenttype) {     
        if (self.statement.hasOwnProperty(contenttype)) {
            return self.statement[contenttype];
        }
        return false;
    }
}