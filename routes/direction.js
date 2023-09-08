const express = require("express");
const router = express.Router();
const Direction = require("../models/Direction");
const Temple = require("../models/Temple");
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
// multer part end -------------------


router.post("/add" , fetchapp , imageUpload , async(req , res)=>{
  let success = false;
  const {templeId ,title,description,mapLink} = req.body;
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
  
    //  create a new direction
    let direction = await Direction.create({
      templeId:templeId,
      title:title,
      description:description?description:"",
      images:images,
      mapLink:mapLink?mapLink:""
  }) 
  success = true;
  return res.json({success , message:"Direction added successfully"})
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})

// fetch all direction
router.get("/fetchall" , fetchapp , async(req , res)=>{
    let success = false;
    try {
      const app = req.app;
      // finding all direction
      let directions = await Direction.find();
      directions.reverse();
      success = true;
      return res.json({success , message:directions})
        
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ success, message: "Internal server error" });
    }
})

// fetch location specific direction
router.get("/fetch" , fetchapp  , async(req , res)=>{
    let success = false;
    const {templeId} = req.query;
    try {
      const app = req.app;
      // finding the direction
    let direction = await Direction.find({templeId});
    success = true;
    return res.json({success , message:direction})
    
        
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ success, message: "Internal server error" });
    }
})

// update a direction
router.put("/update/:id" , fetchapp , upload.any() , async(req , res)=>{
  let success = false;
  let {title ,description ,mapLink} = req.body;
  const {id} = req.params;
  try {
    const app = req.app;
    // checking if the direction is exists or not
    let direction = await Direction.findById(id);
    if(!direction){
      return res.status(404).json({success , message:"Direction not found"})
    }

    let newDirection ={};
    if(title){
      newDirection.title = title;
    }
    if(description){
      newDirection.description=description;
    }
    if(mapLink){
      newDirection.mapLink=mapLink;
    }
    // update the direction
    direction = await Direction.findByIdAndUpdate(id ,{$set:newDirection},{new:true})
    success = true;
    return res.json({success , message:"Direction updated successfully"});
      
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})

// fetch location specific direction
router.delete("/delete/:id" , fetchapp , upload.any() , async(req , res)=>{
  let success = false;
  const {id} = req.params;
  try {
    const app = req.app;
    // checking if the direction is exists or not
    let direction = await Direction.findById(id);
    if(!direction){
      return res.status(404).json({success , message:"Direction not found"})
    }
    // deleteing the existing images
    for (let index = 0; index < direction.images.length; index++) {
      const element = direction.images[index];
      const oldPicture = element.substring(43);
      await deleteFile(oldPicture);
    }
      
    // delete the direction
    direction = await Direction.findByIdAndDelete(id)
    success = true;
    return res.json({success , message:"Direction deleted successfully"});
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})

// add a image
router.post("/image/add", fetchapp, upload.single("image"), async (req, res) => {
  let success = false;
  const { directionId } = req.body;
  try {
    const app = req.app;

    if (!req.file) {
      return res.status(400).json({ success, message: "File needs to be uploaded" })
    }
    // check if the direction exists or not
    let direction = await Direction.findById(directionId);
    if (!direction) {
      return res.status(404).json({ success, message: "Direction not found" });
    }

    if (direction.images.length < 10) {
      // updating the direction
      await uploadFile(req.file.filename);
      direction = await Direction.findByIdAndUpdate(directionId, { $push: { images: `https://temple.nyc3.digitaloceanspaces.com/${req.file.filename}` } }, { new: true })
      const path = req.file.filename;

      fs.unlink(path, (err) => {
        if (err) {
          console.error(err)
          return
        }
      })

      success = true;
      return res.json({ success, message: "Direction image added successfully" })
    }
    else {
      const path = req.file.filename;

      fs.unlink(path, (err) => {
        if (err) {
          console.error(err)
          return
        }
      })
      return res.status(400).json({ success, message: "You can not upload more than 10 images" })
    }

  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success, message: "Internal server error" });
  }
})

// update an image
router.put("/image/update", fetchapp, upload.single("image"), async (req, res) => {
  let success = false;
  const { directionId, oldImageLink } = req.body;
  try {
    const app = req.app;

    if (!req.file) {
      return res.status(400).json({ success, message: "File needs to be uploaded" })
    }
    // check if the direction exists or not
    let direction = await Direction.findById(directionId);
    if (!direction) {
      return res.status(404).json({ success, message: "Direction not found" });
    }

    // getting all images list
    let images = direction.images;
    for (let index = 0; index < images.length; index++) {
      const element = images[index];
      if (element === oldImageLink) {
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
    // updating the direction
    direction = await Direction.findByIdAndUpdate(directionId, { $set: { images: images } }, { new: true });

    success = true;
    return res.json({ success, message: "Direction image updated successfully" })


  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success, message: "Internal server error" });
  }
})


// delete an image
router.delete("/image/delete", fetchapp, upload.any(), async (req, res) => {
  let success = false;
  const { directionId, oldImageLink } = req.body;
  try {
    const app = req.app;

    // check if the direction exists or not
    let direction = await Direction.findById(directionId);
    if (!direction) {
      return res.status(404).json({ success, message: "Direction not found" });
    }

    // deleting old image from direction
    direction = await Direction.findByIdAndUpdate(directionId, { $pull: { images: oldImageLink } }, { new: true })


    // deleting the old image from server
    const oldPicture = oldImageLink.substring(43);
    await deleteFile(oldPicture);

    success = true;
    return res.json({ success, message: "Direction image deleted successfully" })


  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success, message: "Internal server error" });
  }
})







module.exports = router;