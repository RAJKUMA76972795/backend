const express = require("express");
const router = express.Router();
const DailyFeed = require("../models/DailyFeed");
const Temple = require("../models/Temple");
require('dotenv').config();
const fetchapp = require("../middlewares/fetchapp");
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


router.post("/add" , fetchapp , imageUpload , async(req , res)=>{
  let success = false;
  const {templeId,title ,description} = req.body;
  try {
    const app = req.app;

    // checking if the temple exists or not
    let temple = await Temple.findById(templeId);
    if (!temple) {
      return res.status(404).json({ success, message: "Temple not found" })
    }
   
    let images=[];
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
    //  create a new dailyFeed
    let dailyFeed = await DailyFeed.create({
      templeId:templeId,
      title:title,
      description:description?description:"",
      images:images,
      date : new Date(req.body.date).getTime()
  }) 
  success = true;
  return res.json({success , message:"DailyFeed added successfully"})
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})

// fetch all dailyFeed
router.get("/fetchall" , fetchapp , async(req , res)=>{
    let success = false;
    try {
      const app = req.app;
      // finding all dailyFeed
      let dailyFeeds = await DailyFeed.find();
      dailyFeeds.sort(function (a, b) { return b.date - a.date });
      
      success = true;
      return res.json({success , message:dailyFeeds})
        
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ success, message: "Internal server error" });
    }
})

// fetch temple specific dailyFeed
router.get("/fetch" , fetchapp , async(req , res)=>{
  let success = false;
  const {templeId} = req.query;
  try {
    const app = req.app;
    // finding the dailyFeed
    let dailyFeed = await DailyFeed.find({templeId});
    success = true;
    return res.json({success , message:dailyFeed})
      
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})



// update a dailyFeed
router.put("/update/:id" , fetchapp , upload.any() , async(req , res)=>{
  let success = false;
  let {title,description,date} = req.body;
  const {id} = req.params;
  try {
    const app = req.app;
    // checking if the dailyFeed is exists or not
    let dailyFeed = await DailyFeed.findById(id);
    if(!dailyFeed){
      return res.status(404).json({success , message:"DailyFeed not found"})
    }

    let newDailyFeed ={};
    if(title){
      newDailyFeed.title = title;
    }
    if(description){
      newDailyFeed.description=description;
    }
    if(description){
      newDailyFeed.date=new Date(date).getTime();
    }

    // update the dailyFeed
    dailyFeed = await DailyFeed.findByIdAndUpdate(id ,{$set:newDailyFeed},{new:true})
    success = true;
    return res.json({success , message:"DailyFeed updated successfully"});
      
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})

// delete a dailyFeed
router.delete("/delete/:id" , fetchapp , upload.any() , async(req , res)=>{
  let success = false;
  const {id} = req.params;
  try {
    const app = req.app;
    // checking if the dailyFeed is exists or not
    let dailyFeed = await DailyFeed.findById(id);
    if(!dailyFeed){
      return res.status(404).json({success , message:"DailyFeed not found"})
    }
    // deleteing the existing images
    for (let index = 0; index < dailyFeed.images.length; index++) {
      const element = dailyFeed.images[index];
      const oldPicture = element.substring(43);
      await deleteFile(oldPicture);
    }
      
    // delete the dailyFeed
    dailyFeed = await DailyFeed.findByIdAndDelete(id)
    success = true;
    return res.json({success , message:"DailyFeed deleted successfully"});
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})

// add a image
router.post("/image/add" , fetchapp , upload.single("image") , async(req , res)=>{
  let success = false;
  const {dailyFeedId} = req.body;
  try {
    const app = req.app;
    
    if (!req.file) {
      return res.status(400).json({ success, message: "File needs to be uploaded" })
    }
    // check if the dailyFeed exists or not
    let dailyFeed = await DailyFeed.findById(dailyFeedId);
    if (!dailyFeed) {
      return res.status(404).json({ success, message: "DailyFeed not found" });
    }

    if(dailyFeed.images.length<10){
      // updating the dailyFeed
      await uploadFile(req.file.filename);
      dailyFeed = await DailyFeed.findByIdAndUpdate(dailyFeedId, { $push: { images: `https://temple.nyc3.digitaloceanspaces.com/${req.file.filename}` } }, { new: true })
      const path = req.file.filename;

      fs.unlink(path, (err) => {
        if (err) {
          console.error(err)
          return
        }
      })
   
    success = true;
    return res.json({success , message:"DailyFeed image added successfully"})
    }
    else{
      const path = req.file.filename;

      fs.unlink(path, (err) => {
        if (err) {
          console.error(err)
          return
        }
      })
      return res.status(400).json({success , message:"You can not upload more than 10 images"})
    }
    
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})

// update an image
router.put("/image/update" , fetchapp , upload.single("image") , async(req , res)=>{
  let success = false;
  const {dailyFeedId ,oldImageLink} = req.body;
  try {
    const app = req.app;
    
    if (!req.file) {
      return res.status(400).json({ success, message: "File needs to be uploaded" })
    }
    // check if the dailyFeed exists or not
    let dailyFeed = await DailyFeed.findById(dailyFeedId);
    if (!dailyFeed) {
      return res.status(404).json({ success, message: "DailyFeed not found" });
    }

    // getting all images list
    let images = dailyFeed.images;
    for (let index = 0; index < images.length; index++) {
      const element = images[index];
      if(element===oldImageLink){
        const oldPicture = oldImageLink.substring(43);
        await updateFile(oldPicture ,req.file.filename);
        images[index] = `https://temple.nyc3.digitaloceanspaces.com/${req.file.filename}`
        const path = req.file.filename;

        fs.unlink(path, (err) => {
          if (err) {
            console.error(err)
            return
          }
        })
      }
    }
// updating the dailyFeed
dailyFeed = await DailyFeed.findByIdAndUpdate(dailyFeedId , {$set:{images:images}},{new:true});
   
    success = true;
    return res.json({success , message:"DailyFeed image updated successfully"})
    
    
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})


// delete an image
router.delete("/image/delete" , fetchapp , upload.any() , async(req , res)=>{
  let success = false;
  const {dailyFeedId ,oldImageLink} = req.body;
  try {
    const app = req.app;
    
    // check if the dailyFeed exists or not
    let dailyFeed = await DailyFeed.findById(dailyFeedId);
    if (!dailyFeed) {
      return res.status(404).json({ success, message: "DailyFeed not found" });
    }

    // deleting old image from dailyFeed
    dailyFeed = await DailyFeed.findByIdAndUpdate(dailyFeedId , {$pull:{images:oldImageLink}},{new:true})
    
    
    // deleting the old image from server
    const oldPicture = oldImageLink.substring(43);
    await deleteFile(oldPicture);
   
    success = true;
    return res.json({success , message:"DailyFeed image deleted successfully"})
    
    
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})







module.exports = router;