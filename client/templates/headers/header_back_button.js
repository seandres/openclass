Template.headerBackButton.events({
	
	'click .header--button-back': function(e) {
		e.preventDefault();
		history.back();
  	}
});