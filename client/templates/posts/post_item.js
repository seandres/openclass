Template.postItem.helpers({
  image: function() {
    return Images.findOne({'metadata.blogId': this.blogId, 'metadata.postId': this._id});
  },
  commaSeparatedTags: function(){
    var str = "";
    _.each(this.tags, function (val) {
    str += val + ", "; 
    });
    //strip off the extra ", " here
    return str.slice(0,-2);
  }
});

Template.postItem.events({
  'click .post-item--button-delete': function(e) {
    e.preventDefault();

    if (confirm("Delete this post?")) {
      var currentPostId = this._id;
      var currentPost = Posts.findOne(currentPostId);
      Posts.remove(currentPostId);
      Router.go('blogPage', {_id: currentPost.blogId});
    }
  }
});

// Show image in a lightbox with magnificPopup plugin
Template.postItem.rendered = function(){
  $('.post-item--image-wrapper').imagesLoaded(function(){
    $('.post-item--image-link').magnificPopup({
      type:'image',
      closeOnContentClick:'true',
    });
  });
}


