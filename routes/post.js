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
const imageUpload = upload.fields([{ name: 'images', maxCount: 10 }])
// multer part end --------------------

const { getMessaging } = require('firebase-admin/messaging')

// post a post
router.post("/add", fetchuser, imageUpload, async (req, res) => {
    let success = false;
    let { templeId, isText, text, isLink, link, isFile } = req.body;

    try {
        const id = req.user;

        // checking if the user exists or not
        let user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success, message: "User not found" })
        }
        // checking if the temple exists or not
        let temple = await Temple.findById(templeId);
        if (!temple) {
            return res.status(404).json({ success, message: "Temple not found" })
        }

        // checking if the user is a moderator of this temple
        let postModerator = await PostModerator.findOne({ $and: [{ templeId }, { userId: id }] });
        if (!postModerator && !user.isAdmin) {
            return res.status(404).json({ success, message: "You do not have access to create a post of this temple" })
        }

        if (isText) {
            if (!text) {
                return res.status(400).json({ success, message: "Text is required" })
            }
            isLink = false;
            isFile = false;
            link = "";
            file = []
        }

        if (isLink) {
            if (!link) {
                return res.status(400).json({ success, message: "Link is required" })
            }
            isText = false;
            isFile = false;
            text = "";
            file = []
        }

        if (isFile) {
            if (!req.files) {
                return res.status(400).json({ success, message: "File is required" })
            }
            isLink = false;
            isText = false;
            link = "";
            text = ""
        }




        let images = [];
        for (let index = 0; index < req.files.images?.length; index++) {
            const element = req.files.images[index];
            await uploadFile(element.filename);
            images.push(`https://temple.nyc3.digitaloceanspaces.com/${element.filename}`)
            fs.unlink(element.filename, (err) => {
                if (err) {
                    console.error(err)
                    return
                }
            })
        }

        // create a new blog
        let post = await Post.create({
            templeId,
            postModerator: id,
            isText,
            text,
            isLink,
            link,
            isFile,
            file: images,
            createdAt: new Date().getTime(),
            updatedAt: new Date().getTime()
        })

        let topicWithoutSpace = temple.name.replaceAll(' ', '-');
        const message= {
            notification: { title:`New Message for ${temple.name}`, body:"Click here to know more" },
              topic:topicWithoutSpace
        }
        // send message to a topic
        await getMessaging().send(message)


        success = true;
        return res.json({ success, message: post })


    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ success, message: "Internal server error" });
    }
})


// fetch all the posts by user templewise
router.get("/fetchall", fetchuser, async (req, res) => {
    let success = false;
    const { templeId } = req.query;
    try {
        const id = req.user;
        // fetching all posts 
        let posts = await Post.find({ templeId });
        for (let index = 0; index < posts.length; index++) {
            let isLiked = 0;
            if (posts[index].like.includes(id)) {
                isLiked = 1;
            }
            let postModeratorName = "";
            // console.log(posts)
            if (posts[index].postModerator) {

                let postModerator = await User.findById(posts[index].postModerator);
                postModeratorName = postModerator.isAdmin?"Admin":postModerator.name;
            }

            // let isBookMarked = 0;
            // let user = await User.findById(id);
            // let blogId = blogs[index]._id.toString()
            // if (user.blogs.includes(blogId)) {
            //     isBookMarked = 1;
            // }
            posts[index] = { ...posts[index]._doc, like: posts[index]._doc.like.length, comment: posts[index]._doc.comment.length, share: posts[index]._doc.share.length, isLiked: isLiked, time: (new Date().getTime() - posts[index]._doc.createdAt), postModeratorName }

        }
        posts.reverse();
        success = true;
        return res.json({ success, message: posts })
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ success, message: "Internal server error" });
    }
})

// fetch all the blogs by admin
router.get("/fetchallpost", fetchapp, async (req, res) => {
    let success = false;
    try {
        const app = req.app;
        // fetching all posts
        let posts = await Post.find();
        for (let index = 0; index < posts.length; index++) {
            let postModeratorName;
            let postModerator = await User.findById(posts[index].postModerator);
            postModeratorName = postModerator.name;
            posts[index] = { ...posts[index]._doc, like: posts[index]._doc.like.length, comment: posts[index]._doc.comment.length, share: posts[index]._doc.share.length, date: new Date(posts[index]._doc.date).toLocaleDateString('sv'), postModeratorName }

        }
        posts.reverse();
        success = true;
        return res.json({ success, message: posts })
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ success, message: "Internal server error" });
    }
})

// fetch a single blogs
router.get("/fetch/:id", fetchuser, async (req, res) => {
    let success = false;
    const { id } = req.params;
    try {
        const userId = req.user;

        // fetching the blog
        let post = await Post.findById(id);
        if (!post) {
            return res.status(404).json({ success, message: post })
        }
        let isLiked = 0;
        if (post.like.includes(userId)) {
            isLiked = 1;
        }
        // let isBookMarked = 0;
        // let user = await User.findById(userId);
        // if (user.blogs.includes(id)) {
        //     isBookMarked = 1;
        // }
        blog = { ...blog._doc, isLiked: isLiked }
        success = true;

        return res.json({ success, message: post })
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ success, message: "Internal server error" });
    }
})

// update a blog
router.put("/update/:id", fetchapp, upload.single("image"), async (req, res) => {
    let success = false;
    let { title, description, mapLink, location, distance } = req.body;
    const { id } = req.params;
    try {
        const app = req.app;
        // checking if the store is exists or not
        let store = await Store.findById(id);
        if (!store) {
            return res.status(404).json({ success, message: "Store not found" })
        }

        let newStore = {};
        if (title) {
            newStore.title = title;
        }
        if (description) {
            newStore.description = description;
        }
        if (mapLink) {
            newStore.mapLink = mapLink;
        }
        if (location) {
            newStore.location = location;
        }
        if (distance) {
            newStore.distance = distance;
        }


        // update the store
        store = await Store.findByIdAndUpdate(id, { $set: newStore }, { new: true })
        success = true;
        return res.json({ success, message: "Store updated successfully" });

    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ success, message: "Internal server error" });
    }
})


// delete a blog
router.delete("/delete/:id", fetchuser, async (req, res) => {
    let success = false;
    const { id } = req.params;
    try {


        const userId = req.user;
        // checking if the post is exists or not
        let post = await Post.findById(id);
        if (!post) {
            return res.status(404).json({ success, message: "Post not found" })
        }
        // checking if the user is exists or not
        let user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success, message: "User not found" })
        }

        // checking if the user is a moderator of this temple
        let postModerator = await PostModerator.findOne({ $and: [{ templeId: post.templeId }, { userId }] });
        if (!postModerator && !user.isAdmin) {
            return res.status(404).json({ success, message: "You do not have access to delete a post of this temple" })
        }
        // deleteing the existing images
        for (let index = 0; index < post.file.length; index++) {
            const element = post.file[index];
            const oldPicture = element.substring(43);
            await deleteFile(oldPicture);
        }

        // delete the store
        post = await Post.findByIdAndDelete(id)
        success = true;
        return res.json({ success, message: "Post deleted successfully" });

    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ success, message: "Internal server error" });
    }
})



// comment on a blog
router.put("/comment", fetchuser, upload.any(), async (req, res) => {
    let success = false;
    const { postId, parentId, comment } = req.body;
    try {
        const userId = req.user;
        // console.log(userId)
        // checking if the user present or not
        let user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success, message: "User not found" })
        }

        // checking if the post present or not
        let post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ success, message: "Post not found" })
        }
        // checking if the parent is present or not
        if (parentId && parentId !== null) {
            let parentComment = await PostComment.findById(parentId);
            if (!parentComment) {
                return res.status(404).json({ success, message: "Parent comment not found" })
            }
        }

        // creating a new blogComment
        let postComment = await PostComment.create({
            userId: userId,
            postId: postId,
            parentId: parentId ? parentId : null,
            comment: comment
        })

        // add _id of the new blogComment to the comment array of blog model
        post = await Post.findByIdAndUpdate(postId, { $push: { comment: postComment._id.toString() } }, { new: true })

        success = true;
        return res.json({ success, message: postComment })
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ success, message: "Internal server error" });
    }
})

// delete a comment of a post by the user
router.delete("/comment", fetchuser, upload.any(), async (req, res) => {
    let success = false;
    const { postCommentsId } = req.body;
    try {
        const userId = req.user;
        // fetching the postComments
        let postComment = await PostComment.findById(postCommentsId);
        if (!postComment) {
            return res.status(404).json({ success, message: "postComment not found" });
        }
        if (postComment.userId !== userId) {
            return res.status(400).json({ success, message: "It is not your comment so you can not delete it" })
        }

        // getting blogId from the blogComment
        let postId = postComment.postId;

        // creating an array to add all blogComments id to be deleted including parent and reply
        let postCommentsArray = [postCommentsId];
        // getting all the blogComments as this blogCommentsId as parentId
        let replyComments = await PostComment.find({ parentId: postCommentsId })
        if (replyComments.length > 0) {
            for (let index = 0; index < replyComments.length; index++) {
                const element = replyComments[index];
                postCommentsArray.push(element._id)
            }
        }

        // deleting all the blogComments from BlogComment collection and also remove them from BlogIds comment array
        for (let index = 0; index < postCommentsArray.length; index++) {
            const element = postCommentsArray[index];

            // removing them from blogIds comment array
            console.log(element)
            let post = await Post.findByIdAndUpdate(postId, { $pull: { comment: element } }, { new: true })
            console.log(post)
            // deleting each blogComment from BlogComment collection
            await PostComment.findByIdAndDelete(element);

        }

        success = true;
        return res.json({ success, message: "Comment deleted successfully" })

    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ success, message: "Internal server error" });
    }
})

// delete a comment of a blog by the admin
router.delete("/commentforadmin", fetchapp, upload.any(), async (req, res) => {
    let success = false;
    const { postCommentsId } = req.body;
    try {
        const app = req.app;
        // fetching the blogComments
        let postComment = await PostComment.findById(postCommentsId);
        if (!postComment) {
            return res.status(404).json({ success, message: "postComment not found" });
        }


        // getting blogId from the blogComment
        let postId = postComment.blogId;

        // creating an array to add all blogComments id to be deleted including parent and reply
        let postCommentsArray = [postCommentsId];
        // getting all the blogComments as this blogCommentsId as parentId
        let replyComments = await PostComment.find({ parentId: postCommentsId })
        if (replyComments.length > 0) {
            for (let index = 0; index < replyComments.length; index++) {
                const element = replyComments[index];
                postCommentsArray.push(element._id)
            }
        }

        // deleting all the blogComments from BlogComment collection and also remove them from BlogIds comment array
        for (let index = 0; index < postCommentsArray.length; index++) {
            const element = postCommentsArray[index];

            // removing them from postIds comment array
            console.log(element)
            let post = await Post.findByIdAndUpdate(postId, { $pull: { comment: element } }, { new: true })
            console.log(post)
            // deleting each blogComment from BlogComment collection
            await PostComment.findByIdAndDelete(element);

        }

        success = true;
        return res.json({ success, message: "Comment deleted successfully" })

    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ success, message: "Internal server error" });
    }
})

// get allcommenter of a post for app
router.post("/comment", fetchuser, upload.any(), async (req, res) => {
    let success = false;
    const { postId } = req.body;
    try {
        const userId = req.user;
        console.log(userId)
        // console.log(userId)
        // checking if the post exists or not
        let post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ success, message: "Post not found" })
        }
        // console.log(blog);
        let commenters = [];
        let isCommented = 0;

        for (let index = 0; index < post.comment.length; index++) {
            isCommented = 0;
            const postCommentId = post.comment[index];
            let postComment = await PostComment.findById(postCommentId);
            let commenterId = postComment.userId;
            let commenter = await User.findById(commenterId)
            if (commenterId === userId) {
                isCommented = 1;
            }
            commenter = { ...commenter._doc, comment: postComment.comment, isCommented: isCommented, _id: postCommentId }
            commenters.push(commenter);
        }
        commenters.reverse();

        success = true;
        return res.json({ success, message: commenters })
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ success, message: "Internal server error" });
    }
})

// get allcommenter of a post for admin
router.post("/commentforadmin", fetchapp, upload.any(), async (req, res) => {
    let success = false;
    const { postId } = req.body;
    try {
        const app = req.app;
        // console.log(userId)
        // checking if the post exists or not
        let post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ success, message: "Post not found" })
        }
        // console.log(blog);
        let commenters = [];


        for (let index = 0; index < post.comment.length; index++) {

            const postCommentId = post.comment[index];
            let postComment = await PostComment.findById(postCommentId);
            let commenterId = postComment.userId;
            let commenter = await User.findById(commenterId)
            commenter = { ...commenter._doc, comment: postComment.comment, _id: postCommentId }
            commenters.push(commenter);
        }
        commenters.reverse();

        success = true;
        return res.json({ success, message: commenters })
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ success, message: "Internal server error" });
    }
})

// like a blog
router.put("/like", fetchuser, upload.any(), async (req, res) => {
    let success = false;
    const { postId } = req.body;
    try {
        const userId = req.user;

        // checking if the user present or not
        let user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success, message: "User not found" })
        }

        // checking if the post present or not
        let post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ success, message: "Post not found" })
        }


        // cheking if the userId is already in the like array of blog model or not
        post = await Post.findOne({ $and: [{ _id: postId }, { like: { $elemMatch: { $eq: userId } } }] });
        if (post) {
            console.log("yes")
            // remove the userId from the like array of the blog
            post = await Post.findByIdAndUpdate(postId, { $pull: { like: userId } }, { new: true });
        }
        else {
            // add userId of the user to the like array of blog model

            post = await Post.findByIdAndUpdate(postId, { $push: { like: userId } }, { new: true })
        }


        success = true;
        return res.json({ success, message: post })
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ success, message: "Internal server error" });
    }
})

// get allliker of a blog
router.post("/like", fetchapp, upload.any(), async (req, res) => {
    let success = false;
    const { postId } = req.body;
    try {
        // checking if the blog exists or not
        let post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ success, message: "Post not found" })
        }
        let likers = [];
        for (let index = 0; index < post.like.length; index++) {
            const likerId = post.like[index];
            let liker = await User.findById(likerId);
            likers.push(liker);
        }

        success = true;
        return res.json({ success, message: likers })
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ success, message: "Internal server error" });
    }
})

// react on a post
router.put("/react", fetchuser, upload.any(), async (req, res) => {
    let success = false;
    const { postId, number } = req.body;
    try {
        const userId = req.user;

        // checking if the user present or not
        let user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success, message: "User not found" })
        }

        // checking if the post present or not
        let post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ success, message: "Post not found" })
        }


        // cheking if the userId is already in the like array of blog model or not
        post = await Post.findOne({ $and: [{ _id: postId }, { reaction: { $elemMatch: { userId } } }] });
        // console.log(post)
        if (post) {
            // console.log("yes")
            // remove the userId from the like array of the blog
            post = await Post.findOneAndUpdate({ $and: [{ _id: postId }, { reaction: { $elemMatch: { userId } } }] }, { $set: { reaction: { userId, number } } }, { new: true });
        }
        else {
            // add userId of the user to the like array of blog model

            post = await Post.findByIdAndUpdate(postId, { $push: { reaction: { userId, number } } }, { new: true })
        }


        success = true;
        return res.json({ success, message: post })
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ success, message: "Internal server error" });
    }
})

// get allreactor of a post
router.post("/react", fetchapp, upload.any(), async (req, res) => {
    let success = false;
    const { postId } = req.body;
    try {
        // checking if the blog exists or not
        let post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ success, message: "Post not found" })
        }
        let reactors = [];
        for (let index = 0; index < post.reaction.length; index++) {
            const reactorId = post.reaction[index].userId;
            let reactor = await User.findById(reactorId);
            reactor = { ...reactor._doc, number: post.reaction[index].number }
            reactors.push(reactor);
        }

        success = true;
        return res.json({ success, message: reactors })
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ success, message: "Internal server error" });
    }
})


module.exports = router;