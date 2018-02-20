'use strict';
/**
 * @name SchemaStatement
 * @description define de schema of model
 */
function SchemaStatement() {

    /**********************************
    - contenttypes index
    /**********************************
    - tasks
    - users
    ***********************************/

    var self = this;

    /**
     * @name: tasks
     *
     */
    self.tasks = {
        "name": "tasks",
        "fields": {
            "title": {
                "type": "string",
                "required": true                
            },
            "id": {
                "type": "string",
            },
            "type": {
                "type": "string",
                "multiple": false,
                "values": [
                    "home",
                    "work",
                    "personal"
                ]
            },
            "completed": {
                "type": "boolean",   
                "default": false
            },
            "created": {
                "type": "integer"
            },
            "changed": {
                "type": "integer"
            }
        },
        "relations": {
            "owner": {
                "contenttype": "users",
                "multiple": false
            }
        }
    };

    /**
     * @name: users
     *
     */
    self.users = {
        "name": "users",
        "fields": {
            "id": {
                "type": "string",
                "required": true
            },
            "name": {
                "type": "string",
            },
            "email": {
                "type": "email"
            },
            "created": {
                "type": "integer"
            },
            "changed": {
                "type": "integer"
            }
        },
    };


}