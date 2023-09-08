const express = require("express");
const router = express.Router();
const User = require("../models/User");
const PushTopic = require("../models/PushTopic");
const PushNotification = require("../models/PushNotification");
const Temple = require("../models/Temple");
require('dotenv').config();
const fetchapp = require("../middlewares/fetchapp");
const fetchuser = require("../middlewares/fetchuser");
const fs = require('fs');
const { uploadFile, deleteFile, updateFile } = require("../utilities/digitalOceanSpaces")
const cron = require("node-cron")

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
// multer part end --------------------

// firebase setup start
var admin = require("firebase-admin");
const { getMessaging } = require('firebase-admin/messaging')

// var serviceAccount = require("./config/firebase.json");
var serviceAccount = require("../config/mandhiram.json");
// var serviceAccount = require("../config/firebase.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

// firebase setup end

// subscribe to a new topic
router.post("/subscribe",upload.any(), fetchuser, async (req, res) => {
    let success = false;
    const { topic } = req.body;
    try {
        const id = req.user;
        // checking if the user exists or not
        let user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success, message: "User not found" })
        }

        let topicWithoutSpace = topic.replaceAll(' ', '-');
        // subscribed to the topic 
        if(user.pushToken.length>50){
        await getMessaging().subscribeToTopic([user.pushToken], topicWithoutSpace)
    }
    else{
        return res.status(400).json({success , message:"Device token is not valid"})
    }

        // checking if the topic exists 
        
        let pushTopic = await PushTopic.findOne({ name: topic });
        if (!pushTopic) {
            pushTopic = await PushTopic.create({
                name: topic,
                subscribers: [user._id.toString()]
            })
        }
        else {
            pushTopic = await PushTopic.findOneAndUpdate({ name: topic }, { $push: { subscribers: user._id.toString() } }, { new: true })
        }

        // updating the user subscribedTopics
        user = await User.findByIdAndUpdate(id, { $push: { subscribedTopics: topic } }, { new: true })
        success = true;
        return res.json({ success, message: `Successfully subscribed for ${topic} notification` })


    } catch (error) {
        console.log(error.message);
        return res.status(500).send({ success, message: "Internal server error" });
    }
})


// unSubscribe from a old topic
router.post("/unsubscribe",upload.any(), fetchuser, async (req, res) => {
    let success = false;
    const { topic } = req.body;
    try {
        const id = req.user;
        // checking if the user exists or not
        let user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success, message: "User not found" })
        }


        // unsubscribe from a topic 
        let topicWithoutSpace = topic.replaceAll(' ', '-');
        if(user.pushToken.length>50){
            await getMessaging().unsubscribeFromTopic([user.pushToken], topicWithoutSpace)
        }
        else{
            return res.status(400).json({success , message:"Device token is not valid"})
        }
        

        // updating the topic 

        await PushTopic.findOneAndUpdate({ name: topic }, { $pull: { subscribers: user._id.toString() } }, { new: true })


        // updating the user subscribedTopics
        user = await User.findByIdAndUpdate(id, { $pull: { subscribedTopics: topic } }, { new: true })
        success = true;
        return res.json({ success, message: `Successfully unSubscribed for ${topic} notification` })


    } catch (error) {
        console.log(error.message);
        return res.status(500).send({ success, message: "Internal server error" });
    }
})


// send notification topic wise
router.post("/send",upload.any(), fetchapp, async (req, res) => {
    let success = false;
    const { title , body ,topic , time } = req.body;
    try {
        const app = req.app;

        // fetching the temple by the topic
        let temple = await Temple.findOne({name:topic})
        if(!temple){
            return res.status(404).json({success, message:"Temple not found"})
        }
        

        // create a new PushNotification
        let pushNotification = await PushNotification.create({
            topic,
            title,
            body,
            time:new Date(time).getTime(),
            isSent:false
        })

        success = true;
        return res.json({ success, message: `Successfully saved notification for ${topic} subscribers` })


    } catch (error) {
        console.log(error.message);
        return res.status(500).send({ success, message: "Internal server error" });
    }
})


// send notification to all users
router.post("/sendall",upload.any(), fetchapp, async (req, res) => {
    let success = false;
    const { title , body ,time } = req.body;
    try {
        const app = req.app;

        
        // create a new PushNotification
        let pushNotification = await PushNotification.create({
            topic:"All",
            title,
            body,
            time:new Date(time).getTime(),
            isSent:false
        })
        success = true;
        return res.json({ success, message: `Successfully saved notification for all users` })


    } catch (error) {
        console.log(error.message);
        return res.status(500).send({ success, message: "Internal server error" });
    }
})

const sendAll = async(title , body)=>{
    // getting all user pushTokens
    const registrationTokens = [];
    let users = await User.find();
    for (let index = 0; index < users.length; index++) {
        const user = users[index];
        if(user.pushToken!==""){
            registrationTokens.push(user.pushToken)
        }
        
    }

    const message= {
        notification: { title, body },
          tokens:registrationTokens
    }
    // send message to a topic
    let response =  await getMessaging().sendMulticast(message);
    return response.successCount;

}

const send = async(title , body , topic)=>{
    let topicWithoutSpace = topic.replaceAll(' ', '-');
        const message= {
            notification: { title, body  },
              topic:topicWithoutSpace
        }
        // send message to a topic
        await getMessaging().send(message)
}


// checking if the user is subscribed for this notification
router.post("/issubscribed" ,upload.any(), fetchuser , async(req,res)=>{
    let success = false;
    const {topic} = req.body;
    try {
        const id = req.user;
        // checking if the user exists or not
        let user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success, message: "User not found" })
        }

        user = await User.findOne({$and:[{_id:id},{ subscribedTopics: { $elemMatch: { $eq: topic } } }]})
        let isSubscribed = false;
        if(user){
            isSubscribed=true
        }

        success = true;
        return res.json({ success, message: isSubscribed })




    } catch (error) {
        console.log(error.message);
        return res.status(500).send({ success, message: "Internal server error" });
    }
})


// get all pushTopics
router.get("/fetchall" , fetchapp , async(req,res)=>{
    let success = false;
    try {
        const app = req.app;
        // getting all the pushTopics
        let pushTopics = await PushTopic.find();
        success = true;
        return res.json({success , message:pushTopics})

    } catch (error) {
        console.log(error.message);
        return res.status(500).send({ success, message: "Internal server error" });
    }
})


// get all pushNotifications
router.get("/fetchallnotifications" , fetchapp , async(req,res)=>{
    let success = false;
    try {
        const app = req.app;
        // getting all the pushNotifications
        let pushNotifications = await PushNotification.find();
        success = true;
        return res.json({success , message:pushNotifications})

    } catch (error) {
        console.log(error.message);
        return res.status(500).send({ success, message: "Internal server error" });
    }
})

// add a topic
// router.post("/add" ,async(req,res)=>{
//     let success = false;
//     const {topic} = req.body;
//     try {
//         let pushTopic = await PushTopic.create({
//             name: topic,
//             subscribers: []
//         })
//         success = true;
//         return res.json({success , message:"Added"})
//     } catch (error) {
//         console.log(error.message);
//         return res.status(500).send({ success, message: "Internal server error" });
//     }
// })

// checking if any notification is scheduled within 1 hour after every 1 hour
cron.schedule("*/60 * * * *", async () => {
    // finding all the push notifications
    let currentTime = new Date().getTime();
    let minimumTime = currentTime - 7200000;
    let maximumTiume = currentTime + 7200000;
    let pushNotifications = await PushNotification.find({$and:[{ isSent:false},{time:{$gte:minimumTime}},{time:{$lte:maximumTiume}}]});
    for (let index = 0; index < pushNotifications.length; index++) {
        const pushNotification = pushNotifications[index];
        if(pushNotification.topic === "All"){
            sendAll(pushNotification.title , pushNotification.body)
        }
        else{
            send(pushNotification.title , pushNotification.body , pushNotification.topic)
        }
        PushNotification.findByIdAndUpdate(pushNotification._id,{$set:{isSent:true}},{new:true})
    }
})













module.exports = router;