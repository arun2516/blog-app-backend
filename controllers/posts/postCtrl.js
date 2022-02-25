const Post = require("../../model/post/Post");
const Filter = require("bad-words")
const expressAsyncHandler = require("express-async-handler");
const validateMongodbId = require("../../utils/validateMongodbID");
const User = require("../../model/user/User");
const cloudinaryUploadImg = require("../../utils/cloudinary");
const fs = require("fs");

//Create Posts

const createPostCtrl = expressAsyncHandler(async(req,res)=>{
    const {_id}=req.user
    validateMongodbId(req.body.user);

    //check for bad words 
    const filter = new Filter();
    const isProfane = filter.isProfane(req.body.title, req.body.description,);

    //Block user 
    if(isProfane){
     await User.findByIdAndUpdate(_id,{
        isBlocked:true,
    });
    throw new Error("creating failed because it contains Profane Words and you have been blocked");
}

//1.get the oath to img
const localPath = `public/images/posts/${req.file.filename}`;
//2.upload to cloudinary
const imgUploaded = await cloudinaryUploadImg(localPath);
    try{
        // const post = await Post.create({...req.body,image:imgUploaded?.url,
        // user:_id,
        // });
        res.json(imgUploaded);
        //remove uploaded img 
        fs.unlinkSync(localPath);
    }catch(error){
        res.json(error);
    }
});


//---------------------------------
//Fetch all posts
//--------------------------------
const fetchPostsCtrl = expressAsyncHandler(async(req,res)=>{
    try{
        const posts = await Post.find({}).populate('user');
        res.json(posts);
    }catch(error){

    }
    
})

//----------------------------------------
//fetch a single post 
//----------------------------------------

const fetchPostCtrl = expressAsyncHandler(async(req,res)=>{
    const {id}=req.params;
    validateMongodbId(id);
    try{
        const post = await Post.findById(id).populate('user').populate("disLikes").populate("likes");
        //update number of views 
        await Post.findByIdAndUpdate(id,{
            $inc:{numViews:1},
        },{new:true});
        res.json(post);
    }catch(error){
        res.json(error);
    }
    
})

//----------------------------------------------
//update post
//----------------------------------------------

const updatePostCtrl = expressAsyncHandler(async(req,res)=>{

    const {id} = req.params;
    validateMongodbId(id);
    try{
        const post = await Post.findByIdAndUpdate(id,{
            ...req.body,
            user:req.user?._id,
        },{new:true});
        res.json(post);
    }catch(error){
        res.json(error)
    }

});

//----------------------------------------
//Delete post
//----------------------------------------

const deletePostCtrl=expressAsyncHandler(async(req,res)=>{
    const{id}=req.params;
    validateMongodbId(id);
    try{
        const post = await Post.findByIdAndDelete(id);
        res.json(post)
    }catch(error){
        res.json(error)
    }
});

//-------------------------------------
//Likes
//-------------------------------------

const toggleAddLikeToPostCtrl = expressAsyncHandler(async(req,res)=>{

    //1.find the post to be likes 
    const {postId}=req.body
    const post = await Post.findById(postId);
    //2.find the login user 
    const loginUserId = req?.user?._id;
    //3.find is this user has liked this post?
    const isLiked = post?.isLiked;
    //4. check if this user has dislikes this post
    const alreadyDisliked = post?.disLikes?.find(userId=>userId?.toString() === loginUserId?.toString());
    
    //remove the user from dislikes array if exists 
    if(alreadyDisliked){
        const post = await Post.findByIdAndUpdate(postId,{
            $pull:{disLikes:loginUserId},
            isDisLiked:false,
        },{new:true});
        res.json(post);
    }
    //toggle
    //remove the user if he has liked the post
    if(isLiked){
        const post = await Post.findByIdAndUpdate(postId,{
            $pull:{likes:loginUserId},
            isLiked:false,

        },{new:true});
        res.json(post);
    }else{
        //add to Likes
        const post = await Post.findByIdAndUpdate(postId,{
            $push:{likes:loginUserId},
            isLiked:true,
        },{new:true});
        res.json(post);
    }
   
});

//------------------------------
//dislikes
//----------------

const toggleAddDislikeToPostCtrl = expressAsyncHandler(async(req,res)=>{
    //1.find the post to be isDisLiked
    const{postId} = req.body;
    const post = await Post.findById(postId);
    //2.find the login user 
    const loginUserId = req?.user?._id;
    //3.check if this user has already disLikes
    const isDisLiked = post?.isDisLiked;
    //4.check if already like this post
    const alreadyLiked = post?.likes?.find(userId=>userId.toString() === loginUserId?.toString());
    // remove this user from likes array if it exists
    if(alreadyLiked){
        const post = await Post.findOneAndUpdate(postId, {
            $pull:{likes:loginUserId},
            isLiked:false,
        },{new:true});
        res.json(post);
    }
    //toggling
    //remove this user from dislikes if already isliked
    if(isDisLiked){
        const post = await Post.findByIdAndUpdate(postId, {
            $pull:{disLikes:loginUserId},
            isDisLiked:false,
        },{new:true});
        res.json(post);
    }else{
        const post = await Post.findByIdAndUpdate(postId,{
            $push:{disLikes:loginUserId},
            isDisLiked:true,
        },{new:true});
        res.json(post);
    }

})




module.exports ={
    createPostCtrl, 
    fetchPostsCtrl,
     fetchPostCtrl,
      updatePostCtrl,
      deletePostCtrl,
      toggleAddLikeToPostCtrl,
      toggleAddDislikeToPostCtrl
     };