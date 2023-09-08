const express = require("express");
const router = express.Router();
const Nearby = require("../models/Nearby");
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
  const {templeId ,title ,description} = req.body;
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
    //  create a new nearby
    let nearby = await Nearby.create({
      templeId:templeId,
      title:title,
      description:description?description:"",
      images:images
  }) 
  success = true;
  return res.json({success , message:"Nearby added successfully"})
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})

// fetch all nearby
router.get("/fetchall" , fetchapp , async(req , res)=>{
    let success = false;
    try {
      const app = req.app;
      // finding all nearby
      let nearbys = await Nearby.find();
      nearbys.reverse();
      success = true;
      return res.json({success , message:nearbys})
        
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ success, message: "Internal server error" });
    }
})

// fetch temple specific nearby
router.get("/fetch" , fetchapp , async(req , res)=>{
  let success = false;
  const {templeId} = req.query;
  try {
    const app = req.app;
    // finding the puja
    let nearby = await Nearby.find({templeId});
    success = true;
    return res.json({success , message:nearby})
      
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})



// update a nearby
router.put("/update/:id" , fetchapp , upload.any() , async(req , res)=>{
  let success = false;
  let {title ,description} = req.body;
  const {id} = req.params;
  try {
    const app = req.app;
    // checking if the nearby is exists or not
    let nearby = await Nearby.findById(id);
    if(!nearby){
      return res.status(404).json({success , message:"Nearby not found"})
    }

    let newNearby ={};
    if(title){
      newNearby.title = title;
    }
    if(description){
      newNearby.description=description;
    }

    // update the nearby
    nearby = await Nearby.findByIdAndUpdate(id ,{$set:newNearby},{new:true})
    success = true;
    return res.json({success , message:"Nearby updated successfully"});
      
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})

// delete a nearby
router.delete("/delete/:id" , fetchapp , upload.any() , async(req , res)=>{
  let success = false;
  const {id} = req.params;
  try {
    const app = req.app;
    // checking if the nearby is exists or not
    let nearby = await Nearby.findById(id);
    if(!nearby){
      return res.status(404).json({success , message:"Nearby not found"})
    }
    // deleteing the existing images
    for (let index = 0; index < nearby.images.length; index++) {
      const element = nearby.images[index];
      const oldPicture = element.substring(43);
      await deleteFile(oldPicture);
    }
      
    // delete the nearby
    nearby = await Nearby.findByIdAndDelete(id)
    success = true;
    return res.json({success , message:"Nearby deleted successfully"});
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})

// add a image
router.post("/image/add" , fetchapp , upload.single("image") , async(req , res)=>{
  let success = false;
  const {nearbyId} = req.body;
  try {
    const app = req.app;
    
    if (!req.file) {
      return res.status(400).json({ success, message: "File needs to be uploaded" })
    }
    // check if the nearby exists or not
    let nearby = await Nearby.findById(nearbyId);
    if (!nearby) {
      return res.status(404).json({ success, message: "Nearby not found" });
    }

    if(nearby.images.length<10){
      // updating the nearby
      await uploadFile(req.file.filename);
      nearby = await Nearby.findByIdAndUpdate(nearbyId, { $push: { images: `https://temple.nyc3.digitaloceanspaces.com/${req.file.filename}` } }, { new: true })
      const path = req.file.filename;

      fs.unlink(path, (err) => {
        if (err) {
          console.error(err)
          return
        }
      })
   
    success = true;
    return res.json({success , message:"Nearby image added successfully"})
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
  const {nearbyId ,oldImageLink} = req.body;
  try {
    const app = req.app;
    
    if (!req.file) {
      return res.status(400).json({ success, message: "File needs to be uploaded" })
    }
    // check if the nearby exists or not
    let nearby = await Nearby.findById(nearbyId);
    if (!nearby) {
      return res.status(404).json({ success, message: "Nearby not found" });
    }

    // getting all images list
    let images = nearby.images;
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
// updating the nearby
nearby = await Nearby.findByIdAndUpdate(nearbyId , {$set:{images:images}},{new:true});
   
    success = true;
    return res.json({success , message:"Nearby image updated successfully"})
    
    
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})


// delete an image
router.delete("/image/delete" , fetchapp , upload.any() , async(req , res)=>{
  let success = false;
  const {nearbyId ,oldImageLink} = req.body;
  try {
    const app = req.app;
    
    // check if the nearby exists or not
    let nearby = await Nearby.findById(nearbyId);
    if (!nearby) {
      return res.status(404).json({ success, message: "Nearby not found" });
    }

    // deleting old image from nearby
    nearby = await Nearby.findByIdAndUpdate(nearbyId , {$pull:{images:oldImageLink}},{new:true})
    
    
    // deleting the old image from server
    const oldPicture = oldImageLink.substring(43);
    await deleteFile(oldPicture);
   
    success = true;
    return res.json({success , message:"Nearby image deleted successfully"})
    
    
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})








module.exports = router;