Template.login.events({
    'submit form': function (event) {
        event.preventDefault();
        var username = event.target.username.value;
        var password = event.target.password.value;
        
        Meteor.loginWithPassword(username,password,function(err){
            if(!err) {
                history.back();  
            }
            else
            {      
                Session.set('errorMessage', err.message);
            }
        });
    },
    'click .login--button-submit': function(e) {
        e.preventDefault();
        $('#login--form').submit();
  },    
    'click .login--button-cancel': function(e) {
        e.preventDefault();
        history.back();  
    }
});

Template.login.helpers({
  errorMessage: function() {
    return Session.get('errorMessage');
  }
});