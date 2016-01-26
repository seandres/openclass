Template.blogPage.helpers({
  posts: function() {
    var sortPosts = Session.get('sortPosts');
    var sort;
    if(sortPosts == "last")
      sort = -1;
    else
      sort = 1;
    if (Router.current().params.query.tags)
      return Posts.find({tags: {$in: [Router.current().params.query.tags]}}, {sort: {nb: -1}});
    else if (Router.current().params.query.author)
      return Posts.find({author: {$in: [Router.current().params.query.author]}}, {sort: {nb: -1}});
    else if (Router.current().params.query.category)
      return Posts.find({category: {$in: [Router.current().params.query.category]}}, {sort: {nb: -1}});    
    else {
      // check to avoid an exception on changing template
      if (this.blog !== undefined) {
        return Posts.find({},{sort: {nb: -1}});
      } else {
        return null;
      }
    }
  },
  postCount: function() { // return the number of posts
    return Posts.find().count();
  },
  codePanelState: function() {
    return (this.blog.codePanel)
  }
});


Template.blogPage.events({
	'click .button-send-to-api': function(e, template) {
      e.preventDefault();
      //console.log("On clique sur le bouton "+template.data._id)
      Meteor.call('sendBlog', {blogId: template.data.blog._id} );
    },
  'click .hideCodePanel': function(e) {
    $( "#codePanel" ).hide();

    Blogs.update(this.blog._id, {$set : {codePanel : 0}});         

  }
});

Template.blogPage.rendered = function(){
  // Set default author

}