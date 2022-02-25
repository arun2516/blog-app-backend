const expressAsyncHandler = require('express-async-handler');
const sgmail = require("@sendgrid/mail");
const fs = require("fs");
const crypto = require("crypto");
const User = require("../../model/user/User");
const generateToken = require("../../config/token/generateToken");
const validateMongodbId = require("../../utils/validateMongodbID");
const cloudinaryUploadImg = require('../../utils/cloudinary');
sgmail.setApiKey(process.env.SEND_GRID_API_KEY);
//--------------------------------------------------
//register
//--------------------------------------------------


const userRegisterCtrl = expressAsyncHandler(async(req, res)=>{
    // check if user exist
    const userExists = await User.findOne({email: req?.body?.email});
    if(userExists) throw new Error("user already exists");
  
    try{
          //Register User
    const user = await User.create({
        firstName:req?.body?.firstName,
        lastName:req?.body?.lastName,
        email:req?.body?.email,
        password:req?.body?.password,
    });
    res.json(user);

    }catch(error){
        res.json(error);
    }
});

//--------------------------
//Login user
//--------------------------

const loginUserCtrl = expressAsyncHandler(async(req,res)=>{
    const{email,password} = req.body
    // check if user userExists
    const userFound = await User.findOne({email:req?.body?.email});

   // check if password is match
   if(userFound && (await userFound.isPasswordMatched(password))){
       res.json({
           _id:userFound?._id,
           firstName:userFound?.firstName,
           lastName:userFound?.lastName,
           email:userFound?.email,
           profilePhoto:userFound?.profilePhoto,
           isAdmin:userFound?.isAdmin,
           token:generateToken(userFound?._id),
       });
   }
   else{
       res.status(401);
       throw new Error('Invalid Login Credentials');
   }
});

//----------------------------------------------------------
//users
//---------------------------------------------------------=

const fetchUsersCtrl = expressAsyncHandler(async(req,res)=>{
    try{
        const users = await User.find({})
        res.json(users);
    }catch(error){
        res.json(error);
    }
});

//----------------------------------------------------------
//delete users
//--------------------------------------------------------

const  deleteUsersCtrl = expressAsyncHandler(async(req,res)=>{
    const {id} = req.params;
    // check if user id is valid
    validateMongodbId(id);
    try{
        const deletedUser = await User.findByIdAndDelete(id);
        res.json(deletedUser);

    }catch(error){
        res.json(error);
    }
})

//--------------------------------------------------------
//fetch single user details
//--------------------------------------------------------

const fetchUserDetailsCtrl = expressAsyncHandler(async(req,res)=>{
    const {id} = req.params;
    // check if user id is valid
     validateMongodbId(id);

     try{
         const user = await User.findById(id);
         res.json(user);
     }catch(error){
         res.json(error);
     }
})

//--------------------------
//user profile
//--------------------------

const userProfileCtrl = expressAsyncHandler(async(req,res)=>{
    const {id} = req.params;
    validateMongodbId(id);
    try{
        const myProfile = await User.findById(id).populate("posts")
        res.json(myProfile);
    }catch(error){
        res.json(error)
    }
})


//--------------------------
//update profile
//--------------------------

const updateUserCtrl = expressAsyncHandler(async(req,res)=>{
    const{ _id } = req?.user;
    validateMongodbId(_id);

    const user = await User.findByIdAndUpdate(_id,{
        firstName:req?.body?.firstName,
        lastName:req?.body?.lastName,
        email:req?.body?.email,
        bio:req?.body?.bio,
    },{
        new: true,
        runValidators:true,
    });
    res.json(user);
});


//--------------------------
//update password
//--------------------------

const updateUserPasswordCtrl = expressAsyncHandler(async(req,res)=>{
    const {_id} = req.user;
    const{password} = req.body;
    validateMongodbId(_id);

    // find the user by _id
    const user = await User.findById(_id);

    if(password){
        user.password = password;
        const updatedUser = await user.save();
        res.json(updatedUser);
    }
    res.json(user);
});


//--------------------------
//following
//--------------------------

const followingUserCtrl = expressAsyncHandler(async(req,res)=>{
     //1.find the user you want to follow and update its followers field
    //2. update the login user's following field

    const {followId} = req.body;
    const loginUserId = req.user.id;

    // find the target user and check if the login id exist
    const targetUser = await User.findById(followId);

    const alreadyFollowing = targetUser?.followers?.find(user=>user?.toString()===loginUserId.toString());

    if(alreadyFollowing) throw new Error("you have already followed this user")

    ////1.find the user you want to follow and update its followers field
    await User.findByIdAndUpdate(followId,{
        $push:{followers:loginUserId},
        isFollowing:true,
    },{new:true}); 

     //2. update the login user's following field
     await User.findByIdAndUpdate(loginUserId,{
         $push:{following:followId},
     },{new:true});

    res.json("you have successfully followed this user")
});

//--------------------------
//unfollow
//------------------------
const unFollowUserCtrl = expressAsyncHandler(async(req,res)=>{
    const{unFollowId} = req.body;
    const loginUserId = req.user.id;

    await User.findByIdAndUpdate(unFollowId,{
        $pull:{followers:loginUserId},
        isFollowing:false,
    }, {new:true});

    await User.findByIdAndUpdate(loginUserId,{
        $pull:{following:unFollowId},
    },{new:true});

    res.json("you have successfully unfollowed this user")
});



//------------------------
//Block users
//------------------------

const blockUserCtrl = expressAsyncHandler(async(req,res)=>{
    const{id}= req.params;
    validateMongodbId(id);

    const user = await User.findByIdAndUpdate(id,{
        isBlocked:true
    },{new:true}
);
res.json(user);
});

const unBlockUserCtrl = expressAsyncHandler(async(req,res)=>{
    const{id}= req.params;
    validateMongodbId(id);

    const user = await User.findByIdAndUpdate(id,{
        isBlocked:false,
    },{new:true}
);
res.json(user);
})

//--------------------------
//Generate email verification token
//--------------------------

const generateVerificationTokenCtrl = expressAsyncHandler(async(req,res)=>{
    const loginUserId = req.user.id;
    const user = await User.findById(loginUserId);

    try{
        //Generate Token
        const verificationToken = await user.createAccountVerificationToken();
        
        //save the user 
        await user.save();

        //build your message
        const resetURL = `If you were requested to verify your account verify now within 10 minutes, otherwise ignore this message <a href="http://localhost:3000/verify-account/${verificationToken}">Click to Verify Your Account</a>`
        const msg={
            to:"toarun25@gmail.com",
            from:'twentekghana@gmail.com',
            subject:'My first Nodejs email sending',
            html:resetURL,
        };
        await sgmail.send(msg);
        res.json('email sent');
    }catch(error){
        res.json(error);
    }
})

//--------------------------
//account verification
//--------------------------

const accountVerificationCtrl = expressAsyncHandler(async(req,res)=>{
    const {token} = req.body
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    //find this user by token

    const userFound = await User.findOne({
        accountVerificationToken: hashedToken,
        accountVerificationTokenExpires:{$gt:new Date()},
    });
    if(!userFound) throw new Error("Token expires, try again later") 
    //update the property to true
    userFound.isAccountVerified = true;
    userFound.accountVerificationToken = undefined;
    userFound.accountVerificationTokenExpires = undefined;

    await userFound.save()
    res.json(userFound);
});

//---------------------------------------------
//Forget token generator
//---------------------------------------------

const forgetPasswordToken = expressAsyncHandler(async(req,res)=>{
    //find the user by email 
    const {email} = req.body;

    const user = await User.findOne({email: email});
    if(!user) throw new Error("User not found");


    try{
        //create Token
        const token = await user.createPasswordResetToken();
        await user.save();

        //build your message
        const resetURL = `If you were requested to reset your password, reset now within 10 minutes, otherwise ignore this message <a href="http://localhost:3000/reset-password/${token}">Click to Reset your Password</a>`
        const msg={
            to:email,
            from:'twentekghana@gmail.com',
            subject:'Reset Password',
            html:resetURL,
        };

        await sgmail.send(msg);

        res.json({
            msg:`A verification message is successfully sent to ${user?.email}.Reset Now within 10 minutes ${resetURL}`,
        });
    }catch(error){
        res.json(error);
    }
});

//--------------------------
//password reset 
//--------------------------

const passwordResetCtrl = expressAsyncHandler(async(req,res)=>{
    const{token,password} = req.body;
    const hashedToken = crypto.createHash("sha256").update(token).digest('hex');

    //find this user bby Token
    const user = await User.findOne({passwordResetToken:hashedToken,passwordResetExpires:{$gt : Date.now()}
});
    if(!user) throw new Error("Token expired,try again later");

    //update/change the password 
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    res.json(user);
});


//---------------------------------------
//profile phot upload
//-------------------------------------

const profilePhotoUploadCtrl = expressAsyncHandler(async(req,res)=>{
    // find the login user 
    const {_id} = req.user
   
    // 1. get the path to the img
    const localPath = `public/images/profile/${req.file.filename}`;
    //2.upload to cloudinary
    const imgUploaded = await cloudinaryUploadImg(localPath);

    const foundUser = await User.findByIdAndUpdate(_id,
        {
        profilePhoto:imgUploaded?.url,
    },
     {new:true}
    );

    //remove the saved img 
    fs.unlinkSync(localPath);

    res.json(imgUploaded);
})


module.exports = { userRegisterCtrl, loginUserCtrl, fetchUsersCtrl, deleteUsersCtrl, fetchUserDetailsCtrl, userProfileCtrl, updateUserCtrl, updateUserPasswordCtrl, followingUserCtrl, unFollowUserCtrl, blockUserCtrl, unBlockUserCtrl,generateVerificationTokenCtrl, accountVerificationCtrl,forgetPasswordToken,passwordResetCtrl,profilePhotoUploadCtrl };