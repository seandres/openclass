if(Meteor.isServer) {


fs = Npm.require('fs');
// function to encode file data to base64 encoded string
function base64_encode(file) {
		// read binary data

		var bitmap = fs.readFileSync(file);
		// convert binary data to base64 encoded string
		return new Buffer(bitmap).toString('base64');
}

// function to create file from base64 encoded string
function base64_decode(base64str, file) {
		// create buffer object from base64 encoded string, it is important to tell the constructor that the string is base64 encoded
		var bitmap = new Buffer(base64str, 'base64');
		// write buffer to file
		fs.writeFileSync(file, bitmap);
		console.log('******** File created from base64 encoded string ********');
}

/*

newshortUrl(blogId, shortUrl, i) 
si i = 0
	var toAppend = ''
else
	var toAppend = '-'+i

si shortUrl != null (on propose un shortUrl)
	-> si shortUrl+toAppend existe deja dans la table des shortUrls
			newshortUrl(blogId, shortUrl, i+1)
		else
			shortUrl.insert(blogId, shortUrl+toAppend)
			return shortUrl+toAppend


*/

Meteor.methods({
	


		// #########################
		// Meteor.call('sendBlog', {blogId: this._id} );
		// Send blog from Box to main Server
		// "Client" side of the synchronisation
		// #########################
		sendBlog: function(blogAttributes) {
			console.log("On est ici");
			// On peut vérifier que celui qui a cliqué sur le bouton est le owner du journal ou un admin
			check(blogAttributes, {
					blogId: String,
					serverOwner: String
			});

			// Idée:
			// CLIENT  -> envoie  {blogID: , title: } sur Meteor.http.call("POST",  "http://129.194.238.122:3000/api/blogs/", ...)
			// SERVER  -> on cree un writestream unique (timestamp?) pour recevoir toutes les images plus tard
			//         -> reponds le handle du writestream null (le blog n'existait pas) ou [{postID, lastEditionDate:}, ... ] (le blog existait)
			//         -> 
			// CLIENT  -> choisi les posts qu'il veux envoyer (pour l'instant on envoie tout)
			//         -> on cree un tableau [{imageName: , imageData: }, ...]
			//         -> on cree un readStream que l'on envoie sur le serveur
			// SERVER  -> pour chaque post qui n'existait pas encore il ajoute le tag dans la collection avec le blogId qui correspond
			//         -> pour chaque image du 

			// Recupère les données du blog
			var serverIp = Meteor.settings.syncServerIP;
//      var serverIp = "http://127.0.0.1:3000";
		console.log("Ici on à l'adresse du serveur : "+serverIp);

			// ################
			// On envoie le blog pour voir s'il existe deja s'il existe on recoit la liste de tous les posts
			// ################
			var user = this.userId;
			var serverOwner = blogAttributes.serverOwner;
			var blog  = Blogs.findOne(blogAttributes.blogId);
			// console.log("CLIENT - SEND BLOG : Le blog avant qu'il soit envoyé "+blog._id);
			blog = JSON.stringify(blog);

			Meteor.http.call("POST",  serverIp+"/api/blogs/",
				{params:{blog: blog, userDoingCopy: user, serverOwner: serverOwner}}, function (error,result) {
					 if(error){
							console.log('CLIENT - SEND BLOG : Error http.call blogs '+error);
					 } else {
						console.log("##### Données reçues : "+result.data.params.result);
							// On recoit null ou alors [{postId: , lastEditionDate: }, ...]
							// ici on peut choisir quels posts envoyer au serveur selon la date de dernière édition et leur _id
							if (result.data.params.error) {
								console.log("CLIENT - SEND BLOG : error sendBlog returned from SERVER "+result.data.params.error);
							} else if (result.data.params.result) {
								// ################
								// Le blog existe déjà sur le serveur
								// Il faut mettre à jour les posts que l'on souhaite sur le client et envoyer au serveur les posts qui doivent être modifiés
								// ################
								console.log("CLIENT - SEND BLOG : Il y a déjà un journal avec cet ID -> le client determine le merge");

								// Ici on mets a jour le titre du blog s'il à été modifié sur le serveur
								if (result.data.params.result.blogName !== undefined) {
									console.log("CLIENT - SEND BLOG : le nom du blog sur le serveur à changé... lui donner le nom suivant : "+result.data.params.result.blogName)
								} else {
									console.log("CLIENT - SEND BLOG : le nom du blog sur le serveur n'a pas changé par contre si le blog est updaté il faut changer la date d'update: ")
								}

								// On met à jour les paramètres du blog

								if (result.data.params.result.commentsAllowed !== undefined) {
									Blogs.update(blogAttributes.blogId, {$set: {commentsAllowed: result.data.params.result.commentsAllowed}});
								}

								if (result.data.params.result.postEditPermissions !== undefined) {
									Blogs.update(blogAttributes.blogId, {$set: {postEditPermissions: result.data.params.result.postEditPermissions}});
								}

								if (result.data.params.result.createUserAllowed !== undefined) {
									Blogs.update(blogAttributes.blogId, {$set: {createUserAllowed: result.data.params.result.createUserAllowed}});
								}

																// serverPosts: Tous les posts sur le serveur
								// clientPosts:  Tous les posts sur le client
								var serverPosts = JSON.parse(result.data.params.result.posts);
								var clientPosts = Posts.find({blogId: blogAttributes.blogId}).fetch();

								// On récupère le tableau des posts effacés du client
								// TODO.. a implementer!!!!
								var clientOldPostsIds = Blogs.findOne(blogAttributes.blogId).oldPosts;
								var serverOldPostsIds = result.data.params.result.oldPosts;
								console.log("############# les posts effacés du client "+clientOldPostsIds);
								console.log("############# les posts effacés du serveur "+serverOldPostsIds);

								// les ids des posts du serveur
								var serverPostsIds = [];
								var serverPostsItem = 0;
								while (serverPostsItem < serverPosts.length) {
									serverPostsIds.push(serverPosts[serverPostsItem]._id);
									//console.log("##### id du serveur : "+serverPosts[serverPostsItem]._id);
									serverPostsItem++;
								}

								// les ids des posts du client
								var clientPostsIds = [];
								var clientPostsItem = 0;
								while (clientPostsItem < clientPosts.length) {
									clientPostsIds.push(clientPosts[clientPostsItem]._id);
									//console.log("##### id du client : "+clientPosts[clientPostsItem]._id);
									clientPostsItem++;
								}
/* // A reflechir a cela!!
								// On enlève des posts du serveur, tous les posts qui ont déjà été effacés sur le client
								serverPostsIds = _.difference(serverPostsIds, clientOldPostsIds);
								// On enlève des posts du client, tous les posts qui ont déjà été effacés sur le serveur
								clientPostsIds = _.difference(clientPostsIds, serverOldPostsIds);
*/
								// Un peut de théorie
								// allC = tous les posts du client
								// oldC = les vieux posts du client
								// allS = tous les posts du serveur
								// oldS = les vieux posts du serveur
								// I = posts en commun de allC et allS
								// -> avec ceux la ils faut faire le merge pour determiner s'il faut envoyer sur le client ou serveur
								// (posts a envoyer au serveur : C) C = allC - I - oldS
								// (posts a envoyer au client : S)  S = allS - I - oldC
								// (posts a effacer du serveur : remS) remS = S - oldC
								// (posts a effacer du client :  remC) remC = C - oldS



								// ce qui est commun dans les 2 devra être vérifié plus en détails pour faire un update
								var intersectionIds = _.intersection(clientPostsIds, serverPostsIds);
								//console.log("intersectionIds "+intersectionIds);

								// posts sur le serveur mais pas sur le client = il faut ajouter au client
								var addToClientIds = _.difference(serverPostsIds, intersectionIds, clientOldPostsIds);
								//console.log("addToClientIds "+addToClientIds);

								// posts sur le client mais pas sur le serveur = il faut ajouter au serveur
								var addToServerIds = _.difference(clientPostsIds, intersectionIds, serverOldPostsIds);
								//console.log("addToServerIds "+addToServerIds);

								// posts a enlever du client (intersection des posts du client et ceux supprimés du serveur)
								var removeFromClientIds = _.intersection(clientPostsIds, serverOldPostsIds)
								console.log("les id des blogs a enlever du client : "+removeFromClientIds)


								// posts a enlever du server (intersection des posts du serveur et ceux supprimés du client)
								var removeFromServerIds = _.intersection(serverPostsIds, clientOldPostsIds)
								console.log("les id des blogs a enlever du serveur : "+removeFromServerIds)

								// pour les posts présent sur les deux on regarde le lastEditTime
								// si serverEditTime est le plus récent on ajoute au client
								// si clientEditTime est le plus récent on ajoute au serveur
								// on cree [{id: "postId", serverPost: {}, clientPost: {}}]
								var postsToMerge = [];
								for (i = 0; i < intersectionIds.length; i++) {
									// il faut trouver la version du client
									var clientVersion = clientPosts.filter(function(element){
											if (element._id == intersectionIds[i]){
													return true;
											} else {
													return false;
											}
									});
									// le json du client est clientVersion[0]

									// il faut trouver le json du serveur
									var serverVersion = serverPosts.filter(function(element){
											if (element._id == intersectionIds[i]){
													return true;
											} else {
													return false;
											}
									});
									// le json du client est serverVersion[0]

									// On crée un json avec
									// {id: i, serverPost: serverVersion[0], clientPost: clientVersion[0]}
									postsToMerge.push({id: i, serverPost: serverVersion[0], clientPost: clientVersion[0]});
								}
								//console.log("Nombre de post a Merger :"+postsToMerge.length);
								//console.log("Voici un post : "+postsToMerge[0].serverPost);

								// Pour chaque element de postsToMerge on regarde la date de updated existe
								for (i = 0; i < postsToMerge.length; i++) {
									if (postsToMerge[i].serverPost.modified && postsToMerge[i].clientPost.modified) {
										console.log("##### SERVER POST : "+postsToMerge[i].serverPost.modified);
																				console.log("##### CLIENT POST : "+postsToMerge[i].clientPost.modified);

										// Les deux on été modifiés on compare pour trouver le plus récent
										if (postsToMerge[i].serverPost.modified == postsToMerge[i].clientPost.modified) {
																					console.log("----##### 2");

											// les deux ont la même date de last modification donc on ne fait rien...
										} else if (postsToMerge[i].serverPost.modified < postsToMerge[i].clientPost.modified) {
																					console.log("----##### 3");

											// le post du client est plus récent on ajoute alors l'id au tableau addToServerIds
											addToServerIds.push(postsToMerge[i].clientPost._id)
										} else {
																					console.log("----##### no post"+postsToMerge[i].id);

											// le post du serveur est plus récent on ajoute alors l'id au tableau addToClientIds
											addToClientIds.push(postsToMerge[i].serverPost._id)
											// ATTENTION... si le raspberry n'a pas la date correcte... ce sera faussé.. ?
										}
									} else if (postsToMerge[i].serverPost.modified) {
																				console.log("----##### 5");

										// le post à été modifié seulement sur le serveur on ajoute donc l'id au tableau addToClientIds
										addToClientIds.push(postsToMerge[i].serverPost._id)
									} else if (postsToMerge[i].clientPost.modified) {
																				console.log("----##### 6");

										// le post à été modifié seulement sur le client on ajoute donc l'id au tableau addToServerIds
										addToServerIds.push(postsToMerge[i].clientPost._id)
									} else {
																				console.log("----##### 7");

										// aucun n'a été modifié.. on ne fait rien
									}
								}




								// on recrée le json des posts a envoyer sur le serveur
								var postsToCopyOnServer = [];
								var clientPostsItem = 0;
								while (clientPostsItem < clientPosts.length) {
									if (addToServerIds.indexOf(clientPosts[clientPostsItem]._id) > -1) {
										postsToCopyOnServer.push(clientPosts[clientPostsItem]);
										//console.log("Il faut ajouter au serveur: "+clientPosts[clientPostsItem].body);
									}
									clientPostsItem++;
								}


								console.log("###LES POSTS : "+addToClientIds[0]);

								// on recrée le json des posts a copier sur le client
								var postsToCopyOnClient = [];
								var serverPostsItem = 0;
								while (serverPostsItem < serverPosts.length) {
									if (addToClientIds.indexOf(serverPosts[serverPostsItem]._id) > -1) {
										postsToCopyOnClient.push(serverPosts[serverPostsItem]);
										console.log("on l'ajoute quand meme non");
										//console.log("Il faut ajouter au client: "+serverPosts[serverPostsItem].body);
									}
									serverPostsItem++;
								}
/*
								// on recrée le json des posts a effacer du serveur
								var postsToRemoveFromServer = [];
								var serverPostsItem = 0;
								while (serverPostsItem < serverPosts.length) {
									if (removeFromServerIds.indexOf(serverPosts[serverPostsItem]._id) > -1) {
										postsToRemoveFromServer.push(serverPosts[serverPostsItem]);
										//console.log("Il faut ajouter au serveur: "+clientPosts[clientPostsItem].body);
									}
									serverPostsItem++;
								}

								// on recrée le json des posts a effacer du client
								var postsToRemoveFromClient = [];
								var clientPostsItem = 0;
								while (clientPostsItem < clientPosts.length) {
									if (removeFromClientIds.indexOf(clientPosts[clientPostsItem]._id) > -1) {
										postsToRemoveFromClient.push(clientPosts[clientPostsItem]);
										//console.log("Il faut ajouter au serveur: "+clientPosts[clientPostsItem].body);
									}
									clientPostsItem++;
								}
*/
								// ###################
								// On supprime les posts à enlever du client 
								// ###################     
								var postItem = 0;
								while (postItem < removeFromClientIds.length) {
										Posts.remove(removeFromClientIds[postItem]);
									postItem++;
								};

								
								console.log("######postsToCopyOnServer : "+postsToCopyOnServer.length);
								var postItem = 0;
								while (postItem < postsToCopyOnServer.length) {
									console.log("CLIENT - Copy On Server :  "+postItem+": "+postsToCopyOnServer[postItem].body);
									postItem++;
								};

								console.log("######postsToCopyOnClient : "+postsToCopyOnClient.length);

								var postItem = 0;
								while (postItem < postsToCopyOnClient.length) {
									console.log("CLIENT - Copy On Client :  "+postItem+": "+postsToCopyOnClient[postItem].body);
									postItem++;
								};
								// ###################
								// On insère les post et les images à copier sur le client 
								// ###################     
								var postItem = 0;
								while (postItem < postsToCopyOnClient.length) {
									// Si le post existe deja on l'update (normalement ici il n'y a que de l'insert)
									// Si il n'existe pas on le crée
									// TODO petit bug ici?
								 //console.log("On essaie d'upsert le post id "+postsToCopyOnClient[postItem]._id);
								 // upsert ne marche pas sur le raspberry..?
										Posts.upsert(postsToCopyOnClient[postItem]._id, {$set: postsToCopyOnClient[postItem]});
										// TODO utiliser la fonction pour controler le owner du post..
										//Posts.insert(postsToCopyOnClient[postItem]);
									postItem++;
								};

								// On a les records sur le serveur

								// On filtre  pour récupérer seulement les images dont 'metadata.postId' = un des id de addToClientIds
								//var imagesToGetFromServer = serverImages.filter(function(element){
								var serverImages = JSON.parse(result.data.params.result.images);

								console.log("SERVER - Images : "+serverImages.length);


								// On enregistre les images du client sur le serveur / TODO : envoyer seulement les nouvelles
								var image = 0;
								while (image < serverImages.length) {
									console.log("Image ID : "+serverImages[image].imageId);

									var path = process.env.PWD+"/.uploads/"+serverImages[image].imageId;
									console.log("Path to image : "+path);

									//fs.createReadStream(path);
									console.log("Adresse de l'image : "+serverIp+"/upload/"+serverImages[image].imageId);
									console.log("Request : "+request(serverIp+"/upload/"+serverImages[image].imageId));
									request(serverIp+"/upload/"+serverImages[image].imageId).pipe(fs.createWriteStream(path));

									var imageInCollection = Images.findOne({imageId:serverImages[image].imageId})
									if (!imageInCollection)
										Images.insert({imageId:serverImages[image].imageId});

									image++;
								}





								// On filtre serverImages pour récupérer seulement les images dont 'metadata.postId' = un des id de addToClientIds
								// console.log("############### Au total il y a "+serverImages.length+" images sur le serveur")
								// var imagesToGetFromServer = serverImages.filter(function(element){
								//   if (addToClientIds.indexOf(element.metadata.postId) > -1) {
								//       return true;
								//   } else {
								//       return false;
								//   }
								// });
								//console.log("############### On souhaite en récupérer "+imagesToGetFromServer.length+" depuis le serveur")
								// On insère les records et les images sur le client
								// var imageItem = 0;
								// while (imageItem < imagesToGetFromServer.length) {
								//   // Si l'image existe deja on l'update (normalement ici il n'y a que de l'insert)
								//   try {
								//     //Mongo.Collection.get("cfs.images.filerecord").upsert(imagesToGetFromServer[imageItem]._id, {$set: imagesToGetFromServer[imageItem]});
								//     Mongo.Collection.get("cfs.images.filerecord").insert(imagesToGetFromServer[imageItem]);
								//   } catch (error) {
								//     console.log("SERVER - BlogCopy : erreur upsert Erreur: "+error);
								//     //console.log("SERVER - BlogCopy : erreur upsert "+images[imageItem].original.name+" Erreur: "+error);
								//   }
								//   var insertedImage = Images.findOne(imagesToGetFromServer[imageItem]._id);
								//   console.log("######### On doit récupérer sur le serveur l'image "+imagesToGetFromServer[imageItem].original.name);
								//   // On la récupère en utilisant un stream
								//   //readstream("url du thumb").pipe(insertedImage.createWriteStream("thumbs"));
								//   // TODO.. y a t il besoin d'un token?
								//   request(serverIp+insertedImage.url()+"?store=thumbs").pipe(insertedImage.createWriteStream("thumbs"));
								//   //readstream("url de l'image").pipe(insertedImage.createWriteStream("images"));
								//   request(serverIp+insertedImage.url()+"?store=images").pipe(insertedImage.createWriteStream("images"));
								//   imageItem++;
								// };






								// ###################
								// On envoie les posts et les images que le serveur n'a pas
								// ###################
								// postsToCopyOnServer
								var postCounter = postsToCopyOnServer.length;
								postsToCopyOnServer = JSON.stringify(postsToCopyOnServer);
								// On filtre serverImages pour récupérer seulement les images dont 'metadata.postId' = un des id de addToServerIds
								// var images = Images.find({'metadata.blogId': blogAttributes.blogId}).fetch();
								// var imagesToCopyOnServer = images.filter(function(element){
								//   if (addToServerIds.indexOf(element.metadata.postId) > -1) {
								//       console.log("Copy to server : On veux envoyer l'image "+element.original.name);
								//       return true;
								//   } else {
								//       return false;
								//   }
								// });
								// var imagesToCopyOnServerString = JSON.stringify(imagesToCopyOnServer);
								var removeFromServerIds = JSON.stringify(removeFromServerIds);

								// On envoit tous les auteurs du serveur TODO : envoyer seulement les nouveaux
								// var authors = Authors.find({blogId: blogAttributes.blogId}).fetch();
								// console.log("On a les auteurs : "+authors.length);
								// authors = JSON.stringify(authors);
								// Authors.upsert()


								var authors = JSON.parse(result.data.params.result.authors);


								console.log("ICI auteurs : "+authors.length);
								var author = 0;
								while (author < authors.length) {
									console.log("CLIENT : on ajoute l'auteur : "+authors[author]._id);
									Authors.upsert(authors[author]._id, {$set: authors[author]});
									author++;
								}

								var clientAuthors = Authors.find({blogId: blogAttributes.blogId}).fetch();
								clientAuthors = JSON.stringify(clientAuthors);

								console.log("Auteurs du CLIENT : "+clientAuthors);



								var categories = JSON.parse(result.data.params.result.categories);

								console.log("ICI catégories : "+categories.length);
								var categorie = 0;
								while (categorie < categories.length) {
									console.log("CLIENT : on ajoute la catégorie : "+categories[categorie]._id);
									Categories.upsert(categories[categorie]._id, {$set: categories[categorie]});
									categorie++;
								}

								var clientCategories = Categories.find({blogId: blogAttributes.blogId}).fetch();
								clientCategories = JSON.stringify(clientCategories);

								console.log("Catégories du CLIENT : "+clientCategories);


								var tags = JSON.parse(result.data.params.result.tags);

								console.log("ICI tags : "+tags.length);
								var tag = 0;
								while (tag < tags.length) {
									console.log("CLIENT : on ajoute le tags : "+tags[tag]._id);
									Tags.upsert(tags[tag]._id, {$set: tags[tag]});
									tag++;
								}

								var clientTags = Tags.find({blogId: blogAttributes.blogId}).fetch();
								clientTags = JSON.stringify(clientTags);

								console.log("Tags du CLIENT : "+clientTags);


								Meteor.http.call("POST",  serverIp+"/api/posts/",
									{params:{blogId: blog._id, blogCode: blog.blogCode, authors: clientAuthors, categories: clientCategories, tags: clientTags, blogTitle: blog.title,posts: postsToCopyOnServer, postsToRemove: removeFromServerIds, userDoingCopy: user}}, function (error,result) {
										if (error) {
											console.log('CLIENT - SEND BLOG : Error http.call posts '+error);
										} else {
											// tous les posts on été envoyés
											console.log("CLIENT - SEND BLOG : On a envoyé juste les posts necessaires. Il y en avait "+postCounter);



											// var imageToCopyOnServerIds = [];
											// var imageItem = 0;
											// while (imageItem < imagesToCopyOnServer.length) {
											//   imageToCopyOnServerIds.push(imagesToCopyOnServer[imageItem]._id);
											//   imageItem++;
											// }
											//pour chaque image de imageToCopyOnServerIds il on envoie l'image



											// On envoi toutes les images TODO : seulement les nouvelles images
												var images = Posts.find({blogId: blogAttributes.blogId,imageId:{$ne: false}, postFromCloud:false}).forEach(function(post){
												var file = process.env.PWD+"/.uploads/"+post.imageId;
												var base64image = base64_encode(file);
												console.log("CLIENT - SEND BLOG : On veux envoyer l'image "+post.imageId);
												Meteor.http.call("POST",  serverIp+"/api/image/",
												{params:{imageData: base64image, imageName: post.imageId}}, function (error,result) {
													if (error) {
														console.log('CLIENT - SEND BLOG : Error http.call image '+error);
													} else {
														// tous les posts on été envoyés
													}
												});
											});


											// var images = Images.find({_id: { $in: imageToCopyOnServerIds}}).forEach(function(image){
											//   var file = process.env.PWD+"/.meteor/local/cfs/files/images/"+image.copies.images.key;
											//   var base64image = base64_encode(file);
											//   console.log("CLIENT - SEND BLOG : On veux envoyer l'image "+image.copies.images.key);
											//   Meteor.http.call("POST",  serverIp+"/api/image/",
											//   {params:{imageData: base64image, imageName: image.copies.images.key, store: "images"}}, function (error,result) {
											//     if (error) {
											//       console.log('CLIENT - SEND BLOG : Error http.call image '+error);
											//     } else {
											//       // tous les posts on été envoyés
											//     }
											//   });


											//   var file = process.env.PWD+"/.meteor/local/cfs/files/thumbs/"+image.copies.images.key;
											//   var base64image = base64_encode(file);
											//   console.log("CLIENT - SEND BLOG : On veux envoyer le thumb "+image.copies.images.key);
											//   Meteor.http.call("POST",  serverIp+"/api/image/",
											//   {params:{imageData: base64image, imageName: image.copies.images.key, store: "thumbs"}}, function (error,result) {
											//     if (error) {
											//       console.log('CLIENT - SEND BLOG : Error http.call image '+error);
											//     } else {
											//       // tous les posts on été envoyés
											//     }
											//   });

											// });        
										}
								});
												 


							} else {
								// ##################
								// Il n'y a pas le journal sur le serveur.. on envoie tous les posts
								// ##################
								console.log("CLIENT - SEND BLOG : Pas de journal sur le serveur -> on envoie tout")
								var posts = Posts.find({blogId: blogAttributes.blogId}).fetch();

								var authors = Authors.find({blogId: blogAttributes.blogId}).fetch();
								console.log("On a les auteurs : "+authors.length);
								authors = JSON.stringify(authors);

								var categories = Categories.find({blogId: blogAttributes.blogId}).fetch();
								console.log("On a les catégories : "+categories.length);
								categories = JSON.stringify(categories);

								var tags = Tags.find({blogId: blogAttributes.blogId}).fetch();
								console.log("On a les tags : "+tags.length);
								tags = JSON.stringify(tags);

								//var images = Images.find({'metadata.blogId': blogAttributes.blogId}).fetch();
								posts = JSON.stringify(posts);
								//images = JSON.stringify(images);
								Meteor.http.call("POST",  serverIp+"/api/posts/",
									{params:{blogId: blog._id, blogTitle: blog.title,posts: posts, authors: authors, categories: categories, tags: tags, userDoingCopy: user}}, function (error,result) {
										if (error) {
											console.log('CLIENT - SEND BLOG : Error http.call posts '+error);
										} else {
											// tous les posts on été envoyés
											console.log("CLIENT - SEND BLOG : Tous les posts sont envoyés");

											var images = Posts.find({blogId: blogAttributes.blogId,imageId:{$ne: false}, postFromCloud:false}).forEach(function(post){
												var file = process.env.PWD+"/.uploads/"+post.imageId;
												var base64image = base64_encode(file);
												console.log("CLIENT - SEND BLOG : On veux envoyer l'image "+post.imageId);
												Meteor.http.call("POST",  serverIp+"/api/image/",
												{params:{imageData: base64image, imageName: post.imageId}}, function (error,result) {
													if (error) {
														console.log('CLIENT - SEND BLOG : Error http.call image '+error);
													} else {
														// tous les posts on été envoyés
													}
												});

											});



											// //pour chaque posts qui a une image il faut envoyer l'image
											// var images = Images.find({'metadata.blogId': blogAttributes.blogId}).forEach(function(image){
											//   var file = process.env.PWD+"/.meteor/local/cfs/files/images/"+image.copies.images.key;
											//   var base64image = base64_encode(file);
											//   console.log("CLIENT - SEND BLOG : On veux envoyer l'image "+image.copies.images.key);
											//   Meteor.http.call("POST",  serverIp+"/api/image/",
											//   {params:{imageData: base64image, imageName: image.copies.images.key, store: "images"}}, function (error,result) {
											//     if (error) {
											//       console.log('CLIENT - SEND BLOG : Error http.call image '+error);
											//     } else {
											//       // tous les posts on été envoyés
											//     }
											//   });


											//   var file = process.env.PWD+"/.meteor/local/cfs/files/thumbs/"+image.copies.images.key;
											//   var base64image = base64_encode(file);
											//   console.log("CLIENT - SEND BLOG : On veux envoyer le thumb "+image.copies.images.key);
											//   Meteor.http.call("POST",  serverIp+"/api/image/",
											//   {params:{imageData: base64image, imageName: image.copies.images.key, store: "thumbs"}}, function (error,result) {
											//     if (error) {
											//       console.log('CLIENT - SEND BLOG : Error http.call image '+error);
											//     } else {
											//       // tous les posts on été envoyés
											//     }
											//   });

											// });    



										}
								});
						




							}
							// On envoie tous les posts pour l'instant pour faire simple

						}
				 }

			);
		},

		// ##############################
		// Receive : blogId blogTitle
		// Returns : null or all posts
		// ##############################
		doesBlogExist: function(blogAttributes) {

			//console.log("doesBlogExist : Infos recues: "+Object.keys(blogAttributes));
			var blog = JSON.parse(blogAttributes.blog);
			//console.log("SERVER - doesBlogExist : blogId: "+blog._id);
			console.log("SERVER - doesBlogExist : Titre du blog: "+blog.title);


			var owner = Accounts.findUserByEmail(blogAttributes.serverOwner);
			console.log("### SERVER : on doit avoir l'ID : "+owner._id);
			if (owner != undefined) { // le propriétaire du blog sur le client n'existe pas ici
			//   return "Erreur"
			// } else {
				// On recherche s'il y a un blog qui correspond à cet id
				var serverBlog = Blogs.findOne(blog._id);
				if (serverBlog == undefined) { // le blog n'existe pas encore
					// le blog n'existe pas encore, alors on l'insert tel quel 
					// TODO decider que faire si le blog owner n'existe pas!
					console.log("SERVER - doesBlogExist : le blog n'existe pas sur le serveur");

						console.log("SERVER - doesBlogExist : On insert le blog car il n'était pas présent et le propriétaire"+owner._id+"existe");
						//if (blog.shortUrl !== undefined) {blog.shortUrl = Meteor.call('newShortUrl', blog._id, blog.shortUrl)}
						//var myBlog = Blogs.insert({_id: blog._id, title: blog.title, blogCode: blog.blogCode, commentsAllowed: blog.commentsAllowed, postEditPermissions: blog. postEditPermissions, createUserAllowed:blog.createUserAllowed, userId: owner._id, author: blogAuthor,submitted: blog.submitted},function(err){console.log("pas ici?");});
						var myBlog = Blogs.insert({_id: blog._id, title: blog.title, blogCode: blog.blogCode, userId: owner._id,submitted: blog.submitted, commentsAllowed: blog.commentsAllowed, postEditPermissions: blog.postEditPermissions, createUserAllowed: blog.createUserAllowed});

					// On retourne null si le blog n'existait pas.
					// TODO retourner la shortUrl
					// return {shortUrl: blog.shortUrl };
					return null;
				} else { // le blog existe deja

					console.log("SERVER - doesBlogExist : Le blog existe déjà sur le serveur");

					console.log("###"+blog.modified+"###"+serverBlog.modified);

					if (blog.modified || serverBlog.modified) { // les deux sont modifiés et on compare
						if (blog.modified > serverBlog.modified || serverBlog.modified == undefined) { // la version client est la plus récente
								console.log("#####SERVER : BLOG mis a jour");
								Blogs.update(serverBlog._id, {$set: {title: blog.title, modified: blog.modified,commentsAllowed: blog.commentsAllowed, postEditPermissions: blog. postEditPermissions, createUserAllowed:blog.createUserAllowed}});
							} else if (blog.modified < serverBlog.modified  || blog.modified == undefined) { // la version serveur est la plus récente
								console.log("#####SERVER : BLOG serveur est plus récente");
								var commentsAllowed = serverBlog.commentsAllowed;
								var postEditPermissions = serverBlog.postEditPermissions;
								var createUserAllowed = serverBlog.createUserAllowed;
								console.log("#####SERVER : "+commentsAllowed);
						}
					}

					// TODO : On renomme le blog s'il a changé de nom (en comparant modification date)
					if (blog.title != serverBlog.title) {
						console.log("SERVER - doesBlogExist : les deux blogs on un titre différent.. ");
						// Vérifier qui est le plus récent des 2 et remplacer l'ancien
						if (blog.modified && serverBlog.modified) { // les deux sont modifiés et on compare
							if (blog.modified > serverBlog.modified) { // la version client est la plus récente
								// On update le titre du blog 
								console.log("#####SERVER : BLOG mis a jour");
								// TODO on a besoin de mettre à jour le modified? -> il faudrait le mettre à jour plutôt avec now 
								Blogs.update(serverBlog._id, {$set: {title: blog.title, modified: blog.modified,commentsAllowed: blog.commentsAllowed, postEditPermissions: blog. postEditPermissions, createUserAllowed:blog.createUserAllowed}});
							} else if (blog.modified < serverBlog.modified) { // la version serveur est la plus récente.. on renvoie le nouveau nom du blog
								var newBlogName = serverBlog.title;
							} else {
								// les deux blogs n'ont pas été modifiés mais pourtant ils ont un titre différent..modified
								console.log("BUG : les deux blogs ont des noms différents pourtant aucun n'a été mis à jour -> on renome le blog serveur");
								// TODO mettre modified à la date de maintenant
								Blogs.update(serverBlog._id, {$set: {title: blog.title, modified: blog.modified,commentsAllowed: blog.commentsAllowed, postEditPermissions: blog. postEditPermissions, createUserAllowed:blog.createUserAllowed}});
							}
						} else if (blog.modified) { // seulement le blog client est modifié on mets à jour le serveur
							// TODO mettre modified à la date de maintenant
							Blogs.update(serverBlog._id, {$set: {title: blog.title, modified: blog.modified,commentsAllowed: blog.commentsAllowed, postEditPermissions: blog. postEditPermissions, createUserAllowed:blog.createUserAllowed}});
						} else if (serverBlog.modified) { // seulement le blog serveur est modifié on renvoie le nouveau nom au client
							var newBlogName = serverBlog.title;
														console.log("#####SERVER : BLOG mis a jour mais de l'autre côté");

						}
					}
					console.log("Ça passe ici 1");
					var serverPosts = Posts.find({blogId: blog._id}).fetch();
					var oldPosts = serverBlog.oldPosts;
					serverPosts = JSON.stringify(serverPosts);
					//var posts = Posts.find({blogId: blogAttributes.blogId}).fetch();
					console.log("Ça passe ici 1.5");

					var serverImages = Posts.find({blogId: blog._id,imageId:{$ne: false},postFromCloud:true}).fetch();// Workaround sync bug !!! (add postFromCloud)
					//var serverImages = []; // Workaround sync bug !!!
					serverImages = JSON.stringify(serverImages);
					console.log("SERVER : Server images : "+serverImages);

					//var serverImages = Images.find({'metadata.blogId': blog._id}).fetch();
					console.log("Ça passe ici 1.6");



				//console.log("Est-ce que c'est ca ? "+blogAttributes.authors);




					var serverAuthors = Authors.find({blogId: blog._id}).fetch();
					serverAuthors = JSON.stringify(serverAuthors);

					var serverCategories = Categories.find({blogId: blog._id}).fetch();
					serverCategories = JSON.stringify(serverCategories);


									//console.log("Ça passe ici 2 : "+ serverTags.length);


					var serverTags = Tags.find({blogId: blog._id}).fetch();
					serverTags = JSON.stringify(serverTags);

					//console.log("Ça passe ici 2 : "+ serverTags.length);


					//console.log("SERVER - doesBlogExist : Le blog existe déja.. il y a "+serverImages.length+" images");

					return {posts: serverPosts, images: serverImages, authors: serverAuthors, categories: serverCategories, tags: serverTags, blogName: newBlogName, commentsAllowed: commentsAllowed, postEditPermissions: postEditPermissions, createUserAllowed:createUserAllowed, oldPosts: oldPosts};
			}
		} else {
			console.log("SERVER - doesBlogExist : l'utilisateur n'existe pas");
			return "no-user"
			}
		},
		blogCopy: function(blogAttributes) {
			console.log("ON RECOIT ICI : "+blogAttributes);






			//console.log("BlogCopy : Infos recues: "+Object.keys(blogAttributes));
			if (blogAttributes.postsToRemove !== undefined) {
				// ###################
				// On supprime les posts à enlever du serveur
				// ################### 
			var postsToRemove = JSON.parse(blogAttributes.postsToRemove);
				console.log("Il faut enlever "+postsToRemove.length+" posts");   
				var postItem = 0;
				while (postItem < postsToRemove.length) {
						Posts.remove(postsToRemove[postItem]);
					postItem++;
				};
			}
			var posts = JSON.parse(blogAttributes.posts);

			var postItem = 0;
			while (postItem < posts.length) {
				console.log("SERVER - BlogCopy : Contenu du post "+postItem+": "+posts[postItem].body);
				// Si le post existe deja on l'update
				// Si il n'existe pas on le crée
				// faire une fonction pour tester le user du post sur le serveur.. et retourner le user du blog si celui du post n'existe pas
					Posts.upsert(posts[postItem]._id, {$set: posts[postItem]});
				postItem++;
			};




			var authors = JSON.parse(blogAttributes.authors);
			console.log("SERVER - BlogCopy : nombre d'auteurs "+blogAttributes.authors.length);
			var author = 0;
			while (author < authors.length) {
				console.log("ID auteur : "+authors[author]._id);
				Authors.upsert(authors[author]._id, {$set: authors[author]});
				author++;
			}

			var categories = JSON.parse(blogAttributes.categories);
			console.log("SERVER - BlogCopy : nombre de catégories "+blogAttributes.categories.length);
			var categorie = 0;
			while (categorie < categories.length) {
				console.log("ID categorie : "+categories[categorie]._id);
				Categories.upsert(categories[categorie]._id, {$set: categories[categorie]});
				categorie++;
			}

			var tags = JSON.parse(blogAttributes.tags);
			console.log("SERVER - BlogCopy : nombre de tags "+blogAttributes.tags.length);
			var tag = 0;
			while (tag < tags.length) {
				console.log("ID tags : "+tags[tag]._id);
				Tags.upsert(tags[tag]._id, {$set: tags[tag]});
				tag++;
			}


			var images = JSON.parse(blogAttributes.images);
			console.log("SERVER - BlogCopy : nombre d'images "+images.length);
			var imageItem = 0;
			while (imageItem < images.length) {
				// Si l'image existe deja on l'update
				// Si elle n'existe pas on le crée
					console.log("SERVER - BlogCopy : on insert l'image "+images[imageItem].original.name);
					console.log("cfs.images.filerecord.upsert("+images[imageItem]._id+", {$set: "+images[imageItem]+"});");

					try {
						Mongo.Collection.get("cfs.images.filerecord").upsert(images[imageItem]._id, {$set: images[imageItem]});
					} catch (error) {
						console.log("SERVER - BlogCopy : erreur upsert "+images[imageItem].original.name+" Erreur: "+error);
					}
					/*
					cfs.images.filerecord.upsert(images[imageItem]._id, {$set: images[imageItem]}, function(error, cursor) {
							if (error) {
								console.log("SERVER - BlogCopy : erreur upsert "+images[imageItem].original.name+" Erreur: "+error);
							} else {
								console.log("SERVER - BlogCopy : upsert SUCESS"+images[imageItem].original.name);
							}
					});
					*/

				imageItem++;
			};

		},
		imageCopy: function(imageAttributes) {
			console.log("SERVER - imageCopy : Infos recues: "+Object.keys(imageAttributes));
			console.log("SERVER - imageCopy : Nom de l'image: "+imageAttributes.imageName);
			var path = process.env.PWD+"/.uploads/"+imageAttributes.imageName;
			var tempPath = process.env.PWD+"/.uploads/temp-sync-"+imageAttributes.imageName;
			console.log("SERVER - imageCopy : chemin "+path);

			// On dépose l'image avec un nom temporaire.
			//console.log("on depose l'image temporaire");
			base64_decode(imageAttributes.imageData, path);
			//console.log("-> image déposée");
			console.log("on fait un readstream avec l'image "+path);
			// On cree un readstream avec cette image
			//var readStream = fs.createReadStream(tempPath);

			var readStream = fs.createReadStream(path); // J'ai bidouillé et ça semble fonctionner, mais je ne comprends pas pourquoi !

			console.log("-> readstream fait");


			var imageInCollection = Images.findOne({imageId:imageAttributes.imageName})
			if (!imageInCollection)
				Images.insert({imageId:imageAttributes.imageName});

			//console.log("on recherche l'image "+imageAttributes.imageName+" dans la base de donnée");
			// On récupère l'objet image
			// var syncedImage = Images.findOne({'copies.images.key': imageAttributes.imageName});
			// console.log("-> voila l'image "+syncedImage.original.name);
			// //console.log("on fait le write stream");
			// // On cree le writestream de destination
			// var writeStream = syncedImage.createWriteStream(imageAttributes.store)
			// //console.log("-> write stream fait");

			// console.log("on pipe dans le createWriteStream("+imageAttributes.store+")");
			// readStream.pipe(writeStream);
			// //console.log("-> ############################ pipe fait");

			// writeStream.on('finish', function() {
			//     // Il faut effacer l'image une fois que le stream est fini
			//     // console.log("################################# Il faut effacer l'image "+tempPath)
			//     fs.unlinkSync(tempPath);
			// });



		}

	 //   return [{postId: "post1", lastEditionDate: "1 janvier 2012"}, {postId: "post2", lastEditionDate: "3 mai 2014"}, {postId: "post3", lastEditionDate: "12 avril 2015"}];
	/*    console.log("Il y a "+blogAttributes.posts.length+" posts dans le blog "+blogAttributes.blog.title);
			console.log("Le propriétaire du blog est "+blogAttributes.blog.userId);
			console.log("Dans les posts il y a "+Object.keys(blogAttributes.posts));
			console.log("Il y a "+blogAttributes.posts.length);
			if (Users.findOne(blogAttributes.userId)) {
				console.log("l'utilisateur existe")
			} else {
				console.log("l'utilisateur n'existe pas.. Il faudra changer le propriétaire du blog")
			}*/
/*      var postItem = 0;
			while (postItem < blogAttributes.posts.length) {
					console.log("     contenu du post: "+ blogAttributes.posts[postItem].body)
					// regarder si image id et si oui inserer image puis changer l'id pour l'id précedent.. (beark)
					console.log("     Et les keys du post: "+ Object.keys(blogAttributes.posts[postItem]))
					if (blogAttributes.posts[postItem].imageData) {
						base64_decode(blogAttributes.posts[postItem].imageData, "/Users/morands/Downloads/"+blogAttributes.posts[postItem].imageName)
					}


					postItem++;
			}


			var imageItem = 0;
			while (imageItem < blogAttributes.images.length) {
					console.log("     données de l'image: "+ Object.keys(blogAttributes.images[imageItem]))
					var file = "./public/cfs/files/images/"+blogAttributes.images[imageItem].copies.images.key;
					console.log("le path de l'image est "+file);
 */         //console.log("le chemin du process est "+process.env.PWD);

//################## Upload de l'image
/*

	 var newFile = new FS.File(file);
			//newFile.metadata = {blogId: template.data.blog._id, timestamp: template.data.timestamp};
			newFile.metadata = {blogId: blogAttributes.blog._id};
			// TODO On ajoute le timestamp a l'image pour retrouver l'image lorsque l'on envoie le formulaire et la lier au post

			imageId = Images.insert(newFile, function (err, fileObj) {
				console.log("On ajoute l'image Id dans la session: "+imageId._id);
			});
*/
//##################

/*
					imageItem++;
			}


			var tagItem = 0;
			while (tagItem < blogAttributes.tags.length) {
					console.log("     données du tag: "+ Object.keys(blogAttributes.tags[tagItem]))
					tagItem++;
			}

*/
});
}

/*
Pour la synchronisation:
- CLIENT : envoie une demande de synchro avec blogId, title
- SERVER : reponds une liste postId, lastEditionDate avec la liste des posts qui existent deja
- CLIENT : renvoie la liste des posts à mettre à jour (tous si la liste du serveur est vide) selon reglage : ecraser, merge le content (pas possible avec les images), ne rien faire
- SERVER : reponds success

Question API REST - tout sur la même interface ou alors une interface api/blogs api/posts
-> si plusieurs différentes comme cela on peut choisir de mettre à jour simplement un post?
*/
/*
if (Meteor.isServer) {

	// Global API configuration
	var Api = new Restivus({
		useDefaultAuth: true,
		prettyJson: true
	});

	Api.addCollection(Blogs, {
		excludedEndpoints: ['getAll', 'put', 'delete'],
		routeOptions: {
			authRequired: false
		},
		endpoints: {
			post: {
				authRequired: false,
				action: function () {
					/*
					console.log("queryParams "+Object.keys(this.queryParams));
					console.log("bodyParams "+Object.keys(this.bodyParams));
					console.log("action "+Object.keys(this.action));
					console.log("request "+Object.keys(this.request));
					console.log("urlParams "+Object.keys(this.urlParams));
					*/
/*
					
					console.log("REST : SERVER : On recoit les informations suivantes "+Object.keys(this.bodyParams));
					var reponse = "";
					Meteor.call('blogCopy',this.bodyParams, function(error, result) {
						if(error){
							reponse = {status: 'fail', data: {message: 'Zut ca ne marche pas..!', error: error}}
						}else{
							console.log("REST : result "+ result);
							reponse =  {status: 'success', data: {message: "C'est envoyé.. mais peut être tout a planté? :D", result: result}};
						}
					});
					
					return reponse;*/
/*
					if ( Meteor.call('blogCopy',this.bodyParams)) {
						return {status: 'success', data: {message: "C'est envoyé.. mais peut être tout a planté? :D"}};
					} else {
						return {status: 'fail', message: 'Zut ca ne marche pas..!'}
					}
*/

/*
				}
			}
		}
	});*/

	// Generates: GET, POST on /api/items and GET, PUT, DELETE on
	// /api/items/:id for the Items collection
	//Api.addCollection(Blogs);

	// Generates: POST on /api/users and GET, DELETE /api/users/:id for
	// Meteor.users collection
	/*
	Api.addCollection(Meteor.users, {
		excludedEndpoints: ['getAll', 'put'],
		routeOptions: {
			authRequired: true
		},
		endpoints: {
			post: {
				authRequired: false
			},
			delete: {
				roleRequired: 'admin'
			}
		}
	});
	*/

	// Maps to: /api/articles/:id
/*
	Api.addRoute('articles/:id', {authRequired: true}, {
		get: function () {
			return Articles.findOne(this.urlParams.id);
		},
		delete: {
			roleRequired: ['author', 'admin'],
			action: function () {
				if (Articles.remove(this.urlParams.id)) {
					return {status: 'success', data: {message: 'Article removed'}};
				}
				return {
					statusCode: 404,
					body: {status: 'fail', message: 'Article not found'}
				};
			}
		}
	});
*/
//}





/*

Blogs.attachSchema(new SimpleSchema({
	title: {
		type: String,
		label: "Title",
		max: 200
	},
	userId: {
		type: String,
		label: "UserId"
	},
	author: {
		type: String,
		label: "Author name",
		max: 200
	},
	submitted: {
				type: Date,
				label: "Submission date"
	},
	modified: { // Cela doit être mis a jour dès qu'un post est ajouté/modifié (même simplement un tag ou image)
				type: Date,
				label: "Last modification date",
				optional: true
	},
	shortUrl: { // Url courte du blog (il existe aussi une collection shortUrls({_id: , shortUrl: , blogId: }))
							// Lors de la synchronisation si l'url existe deja sur le serveur on en propose une autre en ajoutant un numéro à la fin
							// et on retourne l'url raccourcie
				type: String,
				label: "Short Url",
				optional: true
	},
	password:  // le blog peut être protégé par un mot de passe (si mot de passe ok on ajoute dans la session que l'on a accès a ce blog)
	writeprotected: // le blog est simplement consultable mais on ne peut plus le modifier

}));
*/
