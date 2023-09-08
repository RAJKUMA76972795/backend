const express = require("express");
const router = express.Router();
const AdditionalInfo = require("../models/AdditionalInfo");
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

    // check if any additional info is already exists for this temple
    let additionalInfo = await AdditionalInfo.findOne({templeId})
    if(additionalInfo){
      for (let index = 0; index < req.files.images?.length; index++) {
        const element = req.files.images[index];
        fs.unlink(element.filename, (err) => {
          if (err) {
            console.error(err)
            return
          }
        })
      }
      return res.status(400).json({success , message:"You can not enter more than 1 additional info for a temple "})
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
    //  create a new additionalInfo
    additionalInfo = await AdditionalInfo.create({
      templeId:templeId,
      title:title,
      description:description?description:"",
      images:images
  }) 
  success = true;
  return res.json({success , message:"AdditionalInfo added successfully"})
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})

// fetch all additionalInfo
router.get("/fetchall" , fetchapp , async(req , res)=>{
    let success = false;
    try {
      const app = req.app;
      // finding all additionalInfo
      let additionalInfos = await AdditionalInfo.find();
      additionalInfos.reverse();
      success = true;
      return res.json({success , message:additionalInfos})
        
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ success, message: "Internal server error" });
    }
})

// fetch temple specific additionalInfo
router.get("/fetch" , fetchapp , async(req , res)=>{
  let success = false;
  const {templeId} = req.query;
  try {
    const app = req.app;
    // finding the additionalInfo
    let additionalInfo = await AdditionalInfo.find({templeId});
    success = true;
    return res.json({success , message:additionalInfo})
      
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})



// update a additionalInfo
router.put("/update/:id" , fetchapp , upload.any() , async(req , res)=>{
  let success = false;
  let {title,description} = req.body;
  const {id} = req.params;
  try {
    const app = req.app;
    // checking if the additionalInfo is exists or not
    let additionalInfo = await AdditionalInfo.findById(id);
    if(!additionalInfo){
      return res.status(404).json({success , message:"AdditionalInfo not found"})
    }

    let newAdditionalInfo ={};
    if(title){
      newAdditionalInfo.title = title;
    }
    if(description){
      newAdditionalInfo.description=description;
    }

    // update the additionalInfo
    additionalInfo = await AdditionalInfo.findByIdAndUpdate(id ,{$set:newAdditionalInfo},{new:true})
    success = true;
    return res.json({success , message:"AdditionalInfo updated successfully"});
      
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})

// delete a additionalInfo
router.delete("/delete/:id" , fetchapp , upload.any() , async(req , res)=>{
  let success = false;
  const {id} = req.params;
  try {
    const app = req.app;
    // checking if the additionalInfo is exists or not
    let additionalInfo = await AdditionalInfo.findById(id);
    if(!additionalInfo){
      return res.status(404).json({success , message:"AdditionalInfo not found"})
    }
    // deleteing the existing images
    for (let index = 0; index < additionalInfo.images.length; index++) {
      const element = additionalInfo.images[index];
      const oldPicture = element.substring(43);
      await deleteFile(oldPicture);
    }
      
    // delete the additionalInfo
    additionalInfo = await AdditionalInfo.findByIdAndDelete(id)
    success = true;
    return res.json({success , message:"AdditionalInfo deleted successfully"});
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})

// add a image
router.post("/image/add" , fetchapp , upload.single("image") , async(req , res)=>{
  let success = false;
  const {additionalInfoId} = req.body;
  try {
    const app = req.app;
    
    if (!req.file) {
      return res.status(400).json({ success, message: "File needs to be uploaded" })
    }
    // check if the additionalInfo exists or not
    let additionalInfo = await AdditionalInfo.findById(additionalInfoId);
    if (!additionalInfo) {
      return res.status(404).json({ success, message: "AdditionalInfo not found" });
    }

    if(additionalInfo.images.length<10){
      // updating the additionalInfo
      await uploadFile(req.file.filename);
      additionalInfo = await AdditionalInfo.findByIdAndUpdate(additionalInfoId, { $push: { images: `https://temple.nyc3.digitaloceanspaces.com/${req.file.filename}` } }, { new: true })
      const path = req.file.filename;

      fs.unlink(path, (err) => {
        if (err) {
          console.error(err)
          return
        }
      })
   
    success = true;
    return res.json({success , message:"AdditionalInfo image added successfully"})
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
  const {additionalInfoId ,oldImageLink} = req.body;
  try {
    const app = req.app;
    
    if (!req.file) {
      return res.status(400).json({ success, message: "File needs to be uploaded" })
    }
    // check if the additionalInfo exists or not
    let additionalInfo = await AdditionalInfo.findById(additionalInfoId);
    if (!additionalInfo) {
      return res.status(404).json({ success, message: "AdditionalInfo not found" });
    }

    // getting all images list
    let images = additionalInfo.images;
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
// updating the additionalInfo
additionalInfo = await AdditionalInfo.findByIdAndUpdate(additionalInfoId , {$set:{images:images}},{new:true});
   
    success = true;
    return res.json({success , message:"AdditionalInfo image updated successfully"})
    
    
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})


// delete an image
router.delete("/image/delete" , fetchapp , upload.any() , async(req , res)=>{
  let success = false;
  const {additionalInfoId ,oldImageLink} = req.body;
  try {
    const app = req.app;
    
    // check if the additionalInfo exists or not
    let additionalInfo = await AdditionalInfo.findById(additionalInfoId);
    if (!additionalInfo) {
      return res.status(404).json({ success, message: "AdditionalInfo not found" });
    }

    // deleting old image from additionalInfo
    additionalInfo = await AdditionalInfo.findByIdAndUpdate(additionalInfoId , {$pull:{images:oldImageLink}},{new:true})
    
    
    // deleting the old image from server
    const oldPicture = oldImageLink.substring(43);
    await deleteFile(oldPicture);
   
    success = true;
    return res.json({success , message:"AdditionalInfo image deleted successfully"})
    
    
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})







module.exports = router;