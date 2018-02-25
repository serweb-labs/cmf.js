'use strict';
/**
 * @name SchemaService
 * @description Views handlers

    */

function SchemaService(schemaStatement) {

    var self = this;

    self.set = set;
    self.get = get;
    self.keys = keys;
    self.version = version;
    self.statement = schemaStatement || {};

    function version(){
        return self.statement._version || null;
    }

    function keys(){
        var keys = new Set(Object.keys(self.statement));
        keys.delete('_version');
        return keys;
    }

    function set(statement) {
        self.statement = statement;
        self.version = statement.version;
        self.keys = Object.keys(statement);
    } 

    function get(contenttype) {     
        if (self.statement.hasOwnProperty(contenttype)) {
            return self.statement[contenttype];
        }
        return false;
    }
}