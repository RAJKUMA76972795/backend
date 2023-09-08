const express = require("express");
const router = express.Router();
const Committee = require("../models/Committee");
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

    // check if any committee is already exists for this temple
    let committee = await Committee.findOne({templeId})
    if(committee){
      for (let index = 0; index < req.files.images?.length; index++) {
        const element = req.files.images[index];
        fs.unlink(element.filename, (err) => {
          if (err) {
            console.error(err)
            return
          }
        })
      }
      return res.status(400).json({success , message:"You can not enter more than 1 committee for a temple "})
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
    //  create a new committee
    committee = await Committee.create({
      templeId:templeId,
      title:title,
      description:description?description:"",
      images:images
  }) 
  success = true;
  return res.json({success , message:"Committee added successfully"})
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})

// fetch all committee
router.get("/fetchall" , fetchapp , async(req , res)=>{
    let success = false;
    try {
      const app = req.app;
      // finding all committee
      let committees = await Committee.find();
      committees.reverse();
      success = true;
      return res.json({success , message:committees})
        
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ success, message: "Internal server error" });
    }
})

// fetch temple specific committee
router.get("/fetch" , fetchapp , async(req , res)=>{
  let success = false;
  const {templeId} = req.query;
  try {
    const app = req.app;
    // finding the committee
    let committee = await Committee.find({templeId});
    success = true;
    return res.json({success , message:committee})
      
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})



// update a committee
router.put("/update/:id" , fetchapp , upload.any() , async(req , res)=>{
  let success = false;
  let {title,description} = req.body;
  const {id} = req.params;
  try {
    const app = req.app;
    // checking if the committee is exists or not
    let committee = await Committee.findById(id);
    if(!committee){
      return res.status(404).json({success , message:"Committee not found"})
    }

    let newCommittee ={};
    if(title){
      newCommittee.title = title;
    }
    if(description){
      newCommittee.description=description;
    }

    // update the committee
    committee = await Committee.findByIdAndUpdate(id ,{$set:newCommittee},{new:true})
    success = true;
    return res.json({success , message:"Committee updated successfully"});
      
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})

// delete a committee
router.delete("/delete/:id" , fetchapp , upload.any() , async(req , res)=>{
  let success = false;
  const {id} = req.params;
  try {
    const app = req.app;
    // checking if the committee is exists or not
    let committee = await Committee.findById(id);
    if(!committee){
      return res.status(404).json({success , message:"Committee not found"})
    }
    // deleteing the existing images
    for (let index = 0; index < committee.images.length; index++) {
      const element = committee.images[index];
      const oldPicture = element.substring(43);
      await deleteFile(oldPicture);
    }
      
    // delete the committee
    committee = await Committee.findByIdAndDelete(id)
    success = true;
    return res.json({success , message:"Committee deleted successfully"});
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})

// add a image
router.post("/image/add" , fetchapp , upload.single("image") , async(req , res)=>{
  let success = false;
  const {committeeId} = req.body;
  try {
    const app = req.app;
    
    if (!req.file) {
      return res.status(400).json({ success, message: "File needs to be uploaded" })
    }
    // check if the committee exists or not
    let committee = await Committee.findById(committeeId);
    if (!committee) {
      return res.status(404).json({ success, message: "Committee not found" });
    }

    if(committee.images.length<10){
      // updating the committee
      await uploadFile(req.file.filename);
      committee = await Committee.findByIdAndUpdate(committeeId, { $push: { images: `https://temple.nyc3.digitaloceanspaces.com/${req.file.filename}` } }, { new: true })
      const path = req.file.filename;

      fs.unlink(path, (err) => {
        if (err) {
          console.error(err)
          return
        }
      })
   
    success = true;
    return res.json({success , message:"Committee image added successfully"})
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
  const {committeeId ,oldImageLink} = req.body;
  try {
    const app = req.app;
    
    if (!req.file) {
      return res.status(400).json({ success, message: "File needs to be uploaded" })
    }
    // check if the committee exists or not
    let committee = await Committee.findById(committeeId);
    if (!committee) {
      return res.status(404).json({ success, message: "Committee not found" });
    }

    // getting all images list
    let images = committee.images;
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
// updating the committee
committee = await Committee.findByIdAndUpdate(committeeId , {$set:{images:images}},{new:true});
   
    success = true;
    return res.json({success , message:"Committee image updated successfully"})
    
    
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})


// delete an image
router.delete("/image/delete" , fetchapp , upload.any() , async(req , res)=>{
  let success = false;
  const {committeeId ,oldImageLink} = req.body;
  try {
    const app = req.app;
    
    // check if the committee exists or not
    let committee = await Committee.findById(committeeId);
    if (!committee) {
      return res.status(404).json({ success, message: "Committee not found" });
    }

    // deleting old image from committee
    committee = await Committee.findByIdAndUpdate(committeeId , {$pull:{images:oldImageLink}},{new:true})
    
    
    // deleting the old image from server
    const oldPicture = oldImageLink.substring(43);
    await deleteFile(oldPicture);
   
    success = true;
    return res.json({success , message:"Committee image deleted successfully"})
    
    
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})







module.exports = router;