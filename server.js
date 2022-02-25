const express = require("express");
const cors = require('cors')
const dotenv = require("dotenv");
dotenv.config();
const dbconnect = require("./config/db/dbConnect");
const userRoutes = require("./route/users/usersRoute");
const {errorHandler, notFound} = require("./middleWares/error/errorHandler");
const postRoute = require("./route/posts/postRoute");
const emailMsgRoute = require("./route/emailMsg/emailMsgRoute")
const commentRoutes = require("./route/comments/commentRoute");
const categoryRoute = require("./route/category/categoryRoute");

const app = express();
//DB
dbconnect();

app.use(cors())

app.get("/",(req,res)=>{
    res.json({msg:"API for blog Application"});
})

//Middleware
app.use(express.json());

// users route
app.use("/api/users", userRoutes);

//Post Route
app.use("/api/posts", postRoute);

//comment Routes
app.use("/api/comments",commentRoutes);

//email msg
app.use("/api/email",emailMsgRoute);

//category route
app.use("/api/category",categoryRoute);

// error errorHandler
app.use(notFound);
app.use(errorHandler);

//server
const PORT = process.env.PORT || 5000;

app.listen(PORT, console.log(`server is running on port ${PORT}`));

