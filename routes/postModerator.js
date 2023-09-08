const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Post = require("../models/Post");
const PostComment = require("../models/PostComment");
const Temple = require("../models/Temple");
const PostModerator = require("../models/PostModerator");
require('dotenv').config();
const fetchapp = require("../middlewares/fetchapp");
const fetchuser = require("../middlewares/fetchuser");
const fs = require('fs');
const { uploadFile, deleteFile, updateFile } = require("../utilities/digitalOceanSpaces")


//multer setup start ---------------------------------------------------

const multer = require('multer');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, '')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, uniqueSuffix + '-' + file.originalname)
    }
})


const upload = multer({ storage: storage })
// const imageUpload = upload.fields([{ name: 'images', maxCount: 10 }])
// multer part end --------------------

// post a blog
router.post("/add", fetchapp,  async (req, res) => {
    let success = false;
    let { templeId , userId } = req.body;

    try {
        const app = req.app;


        // checking if the temple exist or not
        let temple = await Temple.findById(templeId);
    if (!temple) {
      return res.status(404).json({ success, message: "Temple not found" })
    }

     // checking if the user exist or not
     let user = await User.findById(userId);
     if (!user) {
       return res.status(404).json({ success, message: "User not found" })
     }

    




        // create a new blog
        let postModerator = await PostModerator.create({
            templeId,
            userId
        })


        success = true;
        return res.json({ success, message: user })


    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ success, message: "Internal server error" });
    }
})


// fetch all the moderator
router.get("/fetchall", fetchapp, async (req, res) => {
    let success = false;
    try {
        const app = req.app;
        // fetching all postModerators
        let postModerators = await PostModerator.find();
        for (let index = 0; index < postModerators.length; index++) {
            let postModerator = postModerators[index]
            let temple = await Temple.findById(postModerator.templeId)
            let user = await User.findById(postModerator.userId)
            postModerators[index] = {...postModerators[index]._doc, templeName:temple.name,username:user.name}
        }
        postModerators.reverse();
        success = true;
        return res.json({ success, message: postModerators })
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ success, message: "Internal server error" });
    }
})



// delete a moderator
router.delete("/delete/:id", fetchapp, async (req, res) => {
    let success = false;
    const { id } = req.params;
    try {


        const app = req.app;
    // checking if the postModerator is exists or not
    let postModerator = await PostModerator.findById(id);
    if(!postModerator){
      return res.status(404).json({success , message:"Post not found"})
    }
    
    postModerator = await PostModerator.findByIdAndDelete(id)
    success = true;
    return res.json({success , message:"Post Moderator deleted successfully"});

    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ success, message: "Internal server error" });
    }
})





module.exports = router;