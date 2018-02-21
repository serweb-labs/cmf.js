'use strict';
/**
 * @name SchemaService
 * @description Views handlers

    */

function SchemaService(schemaStatement) {

    var self = this;

    self.set = set;
    self.get = get;
    self.statement = schemaStatement || {};

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