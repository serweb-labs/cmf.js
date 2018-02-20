'use strict';
/**
 * @name ViewsService
 * @description Views handlers

    */

function ViewsService() {

    var self = this;

    self.set = set;
    self.get = get;
    self.getPlaces = getPlaces;
    self.statement = {};
    self.places = {};

    function set(statement) {            
        self.statement = statement;
    }

    function getPlaces() {
        for (var ct in self.statement) {
            if(self.statement.hasOwnProperty(ct)){
                if (!self.statement[ct].hasOwnProperty('places')) { continue;}
                for (var i = 0; i < self.statement[ct].places.length; i++) {
                    if (!self.places.hasOwnProperty(self.statement[ct].places[i])) {
                        self.places[self.statement[ct].places[i]] = [];
                    }
                    self.places[self.statement[ct].places[i]].push(ct)
                }
            }
        }
        return self.places;
    }

    function get(view) {     
        if (self.statement.hasOwnProperty(view)) {
            return self.statement[view];
        }
        return false;
    }
}
