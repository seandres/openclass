Template.postItem.helpers({
    image: function() {
    return Images.findOne(this.imageId);
  },
  image: function() {
    //return Images.findOne({'metadata.blogId': this.blogId, 'metadata.postId': this._id});
    //return Images.findOne(this.imageId);
    
  },
  tags: function(){
    if (this.tags.length > 1 || this.tags[0] != "")
    return this.tags;
  else
    return 0;
  },     
  ownPost: function() {
    //console.log((this.blog._id).author);
        //console.log(Session.get(Template.parentData(1).blog._id).author);


    //if (this.userId === Meteor.userId() || Roles.userIsInRole(Meteor.userId(), ['admin']) === true)
    if (Session.get(Template.parentData().blog._id).author === this.author || Template.parentData().blog.userId === Meteor.userId() || Roles.userIsInRole(Meteor.userId(), ['admin']) === true)
      return true;
    },
  tagQuery: function() {
    return "tags="+this.toString();
  },   
  authorQuery: function() {
    return "author="+this.author.toString();
  },   
  categoryQuery: function() {
    return "category="+this.category.toString();
  },     
  selectedTagClass: function(){
    var tagId = this.toString();
    var selectedTag = Session.get('selectedTag');
    if(tagId == selectedTag){
      return "post-item--tag-selected"
    }
  },
  selectedCategoryClass: function(){
    var categoryId = this.category.toString();
    var selectedCategory = Session.get('selectedCategory');
    if(categoryId == selectedCategory){
      return "post-item--category-selected"
    }
  }
});

Template.postItem.events({
  'click .post-item--button-delete': function(e) {
    e.preventDefault();

    if (confirm("Effacer la publication de "+this.author+"?")) {
      var currentPostId = this._id;
      var currentPost = Posts.findOne(currentPostId);


      // TODO : faire le nettoyage de l'image et des tags dans un hook before remove...

      Meteor.call('tagsEdit', {blogId: this.blogId, newTags: [], oldTags: currentPost.tags}, function(error) {
        if (error) {
          console.log("#### Zut une erreur dans le delete post button ####");
          throwError(error.reason);
        }
     });


      Posts.remove(currentPostId);
      // TODO : remove in one call :D
      image = Images.findOne({'metadata.postId': currentPostId});
      if (image){
        Images.remove(image._id);
      }

      author = Authors.findOne({blogId: this.blogId, name: currentPost.author});
      Authors.update(author._id, {$inc: {nRefs: -1}});
      
      // Images.remove({'metadata.postId': "Mik2bg7nvT7yHEpR2"});
      Router.go('blogPage', {_id: currentPost.blogId});
    }
  }   
});

// Show image in a lightbox with magnificPopup plugin
Template.postItem.rendered = function(){


    // Set default author
  if (!Session.get(Template.parentData(1).blog._id))
  {
    Session.set(Template.parentData(1).blog._id, {author: 'Invité'});    
  }

  $('.post-item--image-wrapper').imagesLoaded(function(){
    $('.post-item--image-link').magnificPopup({
      type:'image',
      closeOnContentClick:'true',
    });
  });


}


