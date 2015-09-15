  Template.layout.onRendered(function () {
    var template = this;
    slideout = new Slideout({
      'panel': template.$('#content').get(0),
      'menu': template.$('#slideout-menu').get(0),
      'padding': 256,
      'tolerance': 70
    });
  });

  Template.layout.events({
  // Speedup focus on input for mobile devices
  'touchend input': function(e) {
    $(e.target).focus();
  },
  'touchend textarea': function(e) {
    $(e.target).focus();
  },  
    'click .header--button-menu-wrapper': function(e) {
        e.preventDefault();
        slideout.toggle();
    }
});