const express = require("express");
const router = express.Router();
const Timing = require("../models/Timing");
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

    // check if any timing is already exists for this temple
    let timing = await Timing.findOne({templeId})
    if(timing){
      for (let index = 0; index < req.files.images?.length; index++) {
        const element = req.files.images[index];
        fs.unlink(element.filename, (err) => {
          if (err) {
            console.error(err)
            return
          }
        })
      }
      return res.status(400).json({success , message:"You can not enter more than 1 timing for a temple "})
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
    //  create a new timing
    timing = await Timing.create({
      templeId:templeId,
      title:title,
      description:description?description:"",
      images:images
  }) 
  success = true;
  return res.json({success , message:"Timing added successfully"})
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})

// fetch all timing
router.get("/fetchall" , fetchapp , async(req , res)=>{
    let success = false;
    try {
      const app = req.app;
      // finding all timing
      let timings = await Timing.find();
      timings.reverse();
      success = true;
      return res.json({success , message:timings})
        
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ success, message: "Internal server error" });
    }
})

// fetch temple specific timing
router.get("/fetch" , fetchapp , async(req , res)=>{
  let success = false;
  const {templeId} = req.query;
  try {
    const app = req.app;
    // finding the timing
    let timing = await Timing.find({templeId});
    success = true;
    return res.json({success , message:timing})
      
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})



// update a timing
router.put("/update/:id" , fetchapp , upload.any() , async(req , res)=>{
  let success = false;
  let {title,description} = req.body;
  const {id} = req.params;
  try {
    const app = req.app;
    // checking if the timing is exists or not
    let timing = await Timing.findById(id);
    if(!timing){
      return res.status(404).json({success , message:"Timing not found"})
    }

    let newTiming ={};
    if(title){
      newTiming.title = title;
    }
    if(description){
      newTiming.description=description;
    }

    // update the timing
    timing = await Timing.findByIdAndUpdate(id ,{$set:newTiming},{new:true})
    success = true;
    return res.json({success , message:"Timing updated successfully"});
      
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})

// delete a timing
router.delete("/delete/:id" , fetchapp , upload.any() , async(req , res)=>{
  let success = false;
  const {id} = req.params;
  try {
    const app = req.app;
    // checking if the timing is exists or not
    let timing = await Timing.findById(id);
    if(!timing){
      return res.status(404).json({success , message:"Timing not found"})
    }
    // deleteing the existing images
    for (let index = 0; index < timing.images.length; index++) {
      const element = timing.images[index];
      const oldPicture = element.substring(43);
      await deleteFile(oldPicture);
    }
      
    // delete the timing
    timing = await Timing.findByIdAndDelete(id)
    success = true;
    return res.json({success , message:"Timing deleted successfully"});
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})

// add a image
router.post("/image/add" , fetchapp , upload.single("image") , async(req , res)=>{
  let success = false;
  const {timingId} = req.body;
  try {
    const app = req.app;
    
    if (!req.file) {
      return res.status(400).json({ success, message: "File needs to be uploaded" })
    }
    // check if the timing exists or not
    let timing = await Timing.findById(timingId);
    if (!timing) {
      return res.status(404).json({ success, message: "Timing not found" });
    }

    if(timing.images.length<10){
      // updating the timing
      await uploadFile(req.file.filename);
      timing = await Timing.findByIdAndUpdate(timingId, { $push: { images: `https://temple.nyc3.digitaloceanspaces.com/${req.file.filename}` } }, { new: true })
      const path = req.file.filename;

      fs.unlink(path, (err) => {
        if (err) {
          console.error(err)
          return
        }
      })
   
    success = true;
    return res.json({success , message:"Timing image added successfully"})
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
  const {timingId ,oldImageLink} = req.body;
  try {
    const app = req.app;
    
    if (!req.file) {
      return res.status(400).json({ success, message: "File needs to be uploaded" })
    }
    // check if the timing exists or not
    let timing = await Timing.findById(timingId);
    if (!timing) {
      return res.status(404).json({ success, message: "Timing not found" });
    }

    // getting all images list
    let images = timing.images;
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
// updating the timing
timing = await Timing.findByIdAndUpdate(timingId , {$set:{images:images}},{new:true});
   
    success = true;
    return res.json({success , message:"Timing image updated successfully"})
    
    
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})


// delete an image
router.delete("/image/delete" , fetchapp , upload.any() , async(req , res)=>{
  let success = false;
  const {timingId ,oldImageLink} = req.body;
  try {
    const app = req.app;
    
    // check if the timing exists or not
    let timing = await Timing.findById(timingId);
    if (!timing) {
      return res.status(404).json({ success, message: "Timing not found" });
    }

    // deleting old image from timing
    timing = await Timing.findByIdAndUpdate(timingId , {$pull:{images:oldImageLink}},{new:true})
    
    
    // deleting the old image from server
    const oldPicture = oldImageLink.substring(43);
    await deleteFile(oldPicture);
   
    success = true;
    return res.json({success , message:"Timing image deleted successfully"})
    
    
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})







module.exports = router;