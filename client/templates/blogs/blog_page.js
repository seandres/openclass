function resetPostInterval() { // Reset interval of post subscription
	if (Session.get('postsServerNonReactive') > 10) {
		Session.set('postsToSkip',Session.get('postsServerNonReactive') - 10);
		Session.set('postsLimit',10);
	}
	else {
		Session.set('postsToSkip',0);
		Session.set('postsLimit',Session.get('postsServerNonReactive'));
	}
}


Template.blogPage.onCreated(function() {

	viewport = document.querySelector("meta[name=viewport]");
	viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=4');

	var blogId = this.data.blog._id;
	Session.set('blogId',this.data.blog._id);
	Session.set('author','');
	Session.set('tag','');
	Session.set('category','');
	Session.set('postsServerNonReactive', Counts.findOne().count); // Set a non-reactive counter of posts -> here = all server posts
	resetPostInterval();

	Deps.autorun(function() { // Autorun to reactively update subscription (filtering + interval of loaded posts)

		var postsToSkip = Session.get('postsToSkip');
		var postsLimit = Session.get('postsLimit');

		var filters = {blogId:Session.get('blogId')};
		if (Session.get('author') != "")
			filters = {blogId:blogId, author:Session.get('author')}
		else if (Session.get('category') != "")
			filters = {blogId:blogId, category:Session.get('category')}
		else if (Session.get('tag') != "")
			filters = {blogId:blogId, tags:Session.get('tag')}
 		// Interval of posts subscription : load every posts from "postsToSkip" (skip) to "postsLimit" (limit)
 		// By default, load the 10 last posts (skip : total posts - 10 / limit : 10)
		Meteor.subscribe('posts', filters, postsToSkip, postsLimit, function() {
    		$("img").unveil(); // TODO : check if lazy load is really necessary...
    		$("img").trigger("unveil");
		});
	});
});


Template.blogPage.helpers({

	posts: function() {
		if (this.blog !== undefined)
			return Posts.find({},{sort: {submitted: -1}});
		else return null
	},
	loadMore: function() { // Check if user can load more posts
		return (Session.get('postsToSkip') >= 10)
	},
	codePanelState: function() {
		return (this.blog.codePanel)
	},
	ownBlog: function() {
		if (this.blog.userId === Meteor.userId() || Roles.userIsInRole(Meteor.userId(), ['admin']) === true)
				return true;
	},
	// Check if server posts  > client posts (if reactive is on)
	newMessages: function() {
		if (!Session.get('isReactive'))
		{
			var nbPosts = Session.get('postsServerNonReactive');
			var postsReactiveCount;

			if (Session.get('author') !== "") {
				var author = Session.get('author');
				postsReactiveCount = Authors.findOne({name:author}).nRefs;  
			}
			else if (Session.get('category') !== "") {
				var category = Session.get('category');
				postsReactiveCount = Category.findOne({name:category}).nRefs;  
			}
			else if (Session.get('tag') !== "") {
				var tag = Session.get('tag');
				postsReactiveCount = Tags.findOne({name:tag}).nRefs;  
			}
			else {
				postsReactiveCount = Counts.findOne().count;
			}

			if (nbPosts < postsReactiveCount && nbPosts != 0)
				return (postsReactiveCount - nbPosts);
			else
				return false;
		}
	},
	isReactive: function() {
		return Session.get('isReactive');
	},
	updateAlert: function() {
		if (Meteor.user().profile) {
			if (Meteor.user().profile.lastAlert >= 1)
				return false
			else
				return true
		}
		else return true
	}
});


Template.blogPage.events({
	'click .button-ok-update-alert': function() {
		Meteor.users.update(Meteor.user()._id, {$set: {"profile.lastAlert": 1}});
	},
	'click .button-send-to-api': function(e, template) {
			e.preventDefault();

			Meteor.call('sendBlog', {blogId: template.data.blog._id} );
		},
	'click .hideCodePanel': function(e) {
		e.preventDefault();

		$( "#codePanel" ).hide();

		Blogs.update(this.blog._id, {$set : {codePanel : 0}});         
	},
	'click .blog-page--button-reactive': function(e) {
		e.preventDefault();

		Session.set('isReactive', true)        
	},
	'click .blog-page--button-stop-reactive': function(e) {
		e.preventDefault();

		Session.set('isReactive', false)        
	},
		// If user want to load more posts, it moves the interval (skip : -10 / limit : +10)
		'click .blog-page--load-more': function(e) {
			e.preventDefault();
			
			Session.set('postsToSkip',Session.get('postsToSkip')-10);
			Session.set('postsLimit',Session.get('postsLimit')+10);
	},
	'click .blog-page--refresh': function(e) {
		e.preventDefault();

		if (Session.get('author') !== "") {
			var author = Session.get('author');
			Session.set('postsServerNonReactive', Authors.findOne({name:author}).nRefs);
		}
		else if (Session.get('category') !== "") {
			var category = Session.get('category');
			Session.set('nbPosts',Posts.find({category: category}).fetch().length); 
		}
		else if (Session.get('tag') !== "") {
			var tag = Session.get('tag');
			Session.set('nbPosts',Posts.find({tags: tag}).fetch().length); 
		}
		else
			Session.set('postsServerNonReactive', Counts.findOne().count);

		resetPostInterval();
	}  
});