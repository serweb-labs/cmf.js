(function() {
'use strict';
    window.rolesBasedAccessControl = rolesBasedAccessControl;

    /**
     * @name rolesBasedAccessControl
     * @description implementation of an RBAC
     */       
    function rolesBasedAccessControl(authentication) { 
        var self = this; 
        self.isAllowed = isAllowed; 
        self.isAllowedByUser = isAllowedByUser; 
        self.hasRole = hasRole; 
        self.hasRoles = hasRoles; 

        // ============= PERMISSIONS =============
        // the key must be the content type
        //
        // the value can be
        // - an array of roles (about which it will be checked)
        // - a check function that returns true or false
        //
        // for the check function, the parameters will be passed in the following order:
        // 1- the user object
        // 2- the name of the thing
        // 3- the permission to check (normally it is not used)
        // 4- if the user sent an object to review it
        // will pass here (usually used in author check)

        self.permissions = { 
            "all": { 
                view: ["authenticated", "content:assigned", "admin"], 
                edit: ["content:assigned", "admin", "content:owner"], 
                create: ["authenticated", "admin"], 
                delete: ["content:owner"] 
            }
        }

        self.roles = [
            "admin",
            "authenticated",
            "content:owner",
            "content:assigned"            
        ]

        // A role that is also relative to the content
        // (as "content:owner"), is a "special" role
        // and should start with "content:",
        // otherwise the "content" object will not be passed
        self.specialRoles = {        
            "content:owner": function(user, role, content){  
                if (typeof content.author == 'undefined') { return false; }
                return (content.author == user.getRaw().id);                
            }, 
            "content:assigned": function(user, role, content){
                if (typeof content.company == 'undefined') { return false; }
                if (typeof user.getRaw().company == 'undefined') { return false; }
                return content.company == user.getRaw().company;  
            },
        } 

        /**
         * @return bool
         * @arg content: object, ex. {type: 'campaign', 'author': 99, 'nid': 898},
         * with the properties type (mandatory), author, assigned, or any other.
         * @arg permission: string, permission required.
         */
        function isAllowed(content, permission){ 
            return isAllowedByUser(authentication.getUser(), content, permission); 
        } 

        /** 
         * @return bool 
         * @arg object, the user content. 
         * @arg content: object, ex. {type: 'campaign', 'author': 99, 'nid': 898},
         * with the properties type (mandatory), author, assigned, or any other.
         * @arg permission: string, permission required.
         */ 
        function isAllowedByUser(user, content, permission) {
            var contenttype; 
            var allowedRoles; 

            if (typeof content != 'object') { return false }; 
            contenttype = content.type; 

            if (typeof contenttype == 'undefined') { return false }; 
            if (!self.permissions.hasOwnProperty(contenttype)) { return false }; 
            if (!self.permissions[contenttype].hasOwnProperty(permission)) { return false };                  
                
            allowedRoles = self.permissions[contenttype][permission]; 

            if (!Array.isArray(allowedRoles)) { 
                return false; 
            }                 
                
            if (isFunction(allowedRoles)) { 
                return allowedRoles(user, content, permission) 
            } 

            // search at least one match
            for (var role of allowedRoles) {
                if (self.roles.includes(role)) { 
                    // special roles inject content 
                    if (role.includes("content:")) { 
                        if (self.specialRoles[role](user, role, content)) { 
                            return true; 
                        } 
                    } 
                    // normal roles 
                    else if (user.hasRole(role)) {
                        return true;                         
                    } 
                }                 
            } 
                            
            return false; 
        }

        /**
         * @description: check if a user has a role
         * @return bool: the roles that need the content to check
         * are considered special roles, therefore will return false
         */
        function hasRole(role, userId){ 
            var user = authentication.getUser(userId);
            if (!self.roles.includes(role)) { 
                return false; 
            } 
            if (role.includes("content:")) { 
                console.error("this method can not check special roles"); 
                return false; 
            } 
            return user.hasRole(role); 
        } 

        /**
         * @description: check if a user has an array role
         * @return bool: the roles that need the content to check
         * are considered special roles, therefore will return false
         */
        function hasRoles(roles, userId){ 
            var match = roles.filter(function(role) { 
                return hasRole(role, userId); 
            }); 
            return (match.length > 0); 
        } 

        function isFunction(functionToCheck) { 
            return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]'; 
        } 

    }
})();