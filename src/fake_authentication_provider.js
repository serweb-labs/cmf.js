(function() {
'use strict';
    window.fakeAuthenticationProvider = fakeAuthenticationProvider;    
    /**
     * @name fakeAuthenticationProvider
     * @description fake authentication provider
     */       
    function fakeAuthenticationProvider(authentication) { 
        var self = this;

        self.getUser = getUser;
        self.logout = logout;
        self.login = login;
        
        authentication.registerProvider("fake", this, true);

        function login(payload){
            return true;
        }

        function logout(){
            return true;
        }

        function getUser(userId){            
            return {
                 name: "admin",
                 roles: ["admin", "authenticated"],
                 company: "60f34d9c-8c4c-4b80-9d85-d88e6db55e26",
                 id: "aac4e32e-2bfe-43eb-b03b-61a265c9a328",
                 hasRole: function(role){
                    return this.roles.includes(role);
                 },
                 getRaw: function(){
                    return JSON.parse(JSON.stringify(this));
                 }
            }            
        }

    }
})();