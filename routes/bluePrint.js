const express = require("express");
const router = express.Router();
const BluePrint = require("../models/BluePrint");
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

    // check if any blue print is already exists for this temple
    let bluePrint = await BluePrint.findOne({templeId})
    if(bluePrint){
      for (let index = 0; index < req.files.images?.length; index++) {
        const element = req.files.images[index];
        fs.unlink(element.filename, (err) => {
          if (err) {
            console.error(err)
            return
          }
        })
      }
      return res.status(400).json({success , message:"You can not enter more than 1 blue print for a temple "})
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
    //  create a new bluePrint
    bluePrint = await BluePrint.create({
      templeId:templeId,
      title:title,
      description:description?description:"",
      images:images
  }) 
  success = true;
  return res.json({success , message:"BluePrint added successfully"})
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})

// fetch all bluePrint
router.get("/fetchall" , fetchapp , async(req , res)=>{
    let success = false;
    try {
      const app = req.app;
      // finding all bluePrint
      let bluePrints = await BluePrint.find();
      bluePrints.reverse();
      success = true;
      return res.json({success , message:bluePrints})
        
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ success, message: "Internal server error" });
    }
})

// fetch temple specific blue print
router.get("/fetch" , fetchapp , async(req , res)=>{
  let success = false;
  const {templeId} = req.query;
  try {
    const app = req.app;
    // finding the puja
    let bluePrint = await BluePrint.find({templeId});
    success = true;
    return res.json({success , message:bluePrint})
      
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})



// update a bluePrint
router.put("/update/:id" , fetchapp , upload.any() , async(req , res)=>{
  let success = false;
  let {title ,description} = req.body;
  const {id} = req.params;
  try {
    const app = req.app;
    // checking if the bluePrint is exists or not
    let bluePrint = await BluePrint.findById(id);
    if(!bluePrint){
      return res.status(404).json({success , message:"BluePrint not found"})
    }

    let newBluePrint ={};
    if(title){
      newBluePrint.title = title;
    }
    if(description){
      newBluePrint.description=description;
    }

    // update the bluePrint
    bluePrint = await BluePrint.findByIdAndUpdate(id ,{$set:newBluePrint},{new:true})
    success = true;
    return res.json({success , message:"BluePrint updated successfully"});
      
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})

// delete a bluePrint
router.delete("/delete/:id" , fetchapp , upload.any() , async(req , res)=>{
  let success = false;
  const {id} = req.params;
  try {
    const app = req.app;
    // checking if the bluePrint is exists or not
    let bluePrint = await BluePrint.findById(id);
    if(!bluePrint){
      return res.status(404).json({success , message:"BluePrint not found"})
    }
    // deleteing the existing images
    for (let index = 0; index < bluePrint.images.length; index++) {
      const element = bluePrint.images[index];
      const oldPicture = element.substring(43);
      await deleteFile(oldPicture);
    }
      
    // delete the bluePrint
    bluePrint = await BluePrint.findByIdAndDelete(id)
    success = true;
    return res.json({success , message:"BluePrint deleted successfully"});
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})

// add a image
router.post("/image/add" , fetchapp , upload.single("image") , async(req , res)=>{
  let success = false;
  const {bluePrintId} = req.body;
  try {
    const app = req.app;
    
    if (!req.file) {
      return res.status(400).json({ success, message: "File needs to be uploaded" })
    }
    // check if the bluePrint exists or not
    let bluePrint = await BluePrint.findById(bluePrintId);
    if (!bluePrint) {
      return res.status(404).json({ success, message: "BluePrint not found" });
    }

    if(bluePrint.images.length<10){
      // updating the bluePrint
      await uploadFile(req.file.filename);
      bluePrint = await BluePrint.findByIdAndUpdate(bluePrintId, { $push: { images: `https://temple.nyc3.digitaloceanspaces.com/${req.file.filename}` } }, { new: true })
      const path = req.file.filename;

      fs.unlink(path, (err) => {
        if (err) {
          console.error(err)
          return
        }
      })
   
    success = true;
    return res.json({success , message:"BluePrint image added successfully"})
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
  const {bluePrintId ,oldImageLink} = req.body;
  try {
    const app = req.app;
    
    if (!req.file) {
      return res.status(400).json({ success, message: "File needs to be uploaded" })
    }
    // check if the bluePrint exists or not
    let bluePrint = await BluePrint.findById(bluePrintId);
    if (!bluePrint) {
      return res.status(404).json({ success, message: "BluePrint not found" });
    }

    // getting all images list
    let images = bluePrint.images;
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
// updating the bluePrint
bluePrint = await BluePrint.findByIdAndUpdate(bluePrintId , {$set:{images:images}},{new:true});
   
    success = true;
    return res.json({success , message:"BluePrint image updated successfully"})
    
    
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})


// delete an image
router.delete("/image/delete" , fetchapp , upload.any() , async(req , res)=>{
  let success = false;
  const {bluePrintId ,oldImageLink} = req.body;
  try {
    const app = req.app;
    
    // check if the bluePrint exists or not
    let bluePrint = await BluePrint.findById(bluePrintId);
    if (!bluePrint) {
      return res.status(404).json({ success, message: "BluePrint not found" });
    }

    // deleting old image from bluePrint
    bluePrint = await BluePrint.findByIdAndUpdate(bluePrintId , {$pull:{images:oldImageLink}},{new:true})
    
    
    // deleting the old image from server
    const oldPicture = oldImageLink.substring(43);
    await deleteFile(oldPicture);
   
    success = true;
    return res.json({success , message:"BluePrint image deleted successfully"})
    
    
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})







module.exports = router;