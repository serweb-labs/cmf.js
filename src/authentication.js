(function() {
'use strict';
    window.authentication = authentication;

    /**
     * @name authentication
     * @description authentication service
     */       
    function authentication() { 
        var self = this;
        var providers = {};
        var currentUser = null;
        var currentProvider = null;

        self.getUser = getUser;
        self.registerProvider = registerProvider;
        self.login = login;
        self.logout = logout;

        function registerProvider(name, provider, current){
            if (!isFunction(provider.login)) {
                throw 'the "login" method was not provided';
            }
            if (!isFunction(provider.logout)) {
                throw 'the "logout" method was not provided';
            }
            if (!isFunction(provider.getUser)) {
                throw 'the "getUser" method was not provided';
            }
            providers[name] = provider;

            if (current) {
                currentProvider = name; 
            }
            return true;
        }

        function login(payload){
            var result; providers[currentProvider].login(payload);
            providers[currentProvider].logout();
            currentUser = null;
            if (result) {
                setCurrentUser(result);
            }
            if (isFunction(self.onLogin)) {
                self.onLogin(result);
            }
             return result;
        }

        function logout(userId){
            providers[currentProvider].logout();
            currentUser = null;
            if (isFunction(self.onLogout)) {
                self.onLogout();
            }
        }

        function getProvider(name){
            return providers[name];
        }

        function getUser(userId){
            return providers[currentProvider].getUser(userId);
        }

        function getCurrentUser(){
            return currentUser;
        }

        function setCurrentUser(user){
            currentUser = user;
        }

        function hasRole(role, userId){
            var user = userId ? getUser(userId) : currentUser;
            return user.hasRole(role);
        }

        function isFunction(functionToCheck) { 
            return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]'; 
        } 

    }
})();