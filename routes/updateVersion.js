const express = require("express");
const router = express.Router();
const UpdateVersion = require("../models/UpdateVersion");
require('dotenv').config();
const fetchapp = require("../middlewares/fetchapp");



router.post("/add" , fetchapp , async(req , res)=>{
  let success = false;
  const {publishedDate , version , description} = req.body;
  try {
    const app = req.app;
  
    //  create a new updateVersion
    let updateVersion = await UpdateVersion.create({
      publishedDate:new Date(publishedDate).getTime(),
      version:version,
      description:description?description:"",
  }) 
  success = true;
  return res.json({success , message:"UpdateVersion added successfully"})
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})

// fetch all updateVersion
router.get("/fetchall" , fetchapp , async(req , res)=>{
    let success = false;
    try {
      const app = req.app;
      // finding all updateVersion
      let updateVersions = await UpdateVersion.find();
      updateVersions.reverse();
      success = true;
      return res.json({success , message:updateVersions})
        
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ success, message: "Internal server error" });
    }
})


// update a updateVersion
router.put("/update/:id" , fetchapp , async(req , res)=>{
  let success = false;
  let {publishedDate , version , description} = req.body;
  const {id} = req.params;
  try {
    const app = req.app;
    // checking if the updateVersion is exists or not
    let updateVersion = await UpdateVersion.findById(id);
    if(!updateVersion){
      return res.status(404).json({success , message:"UpdateVersion not found"})
    }

    let newUpdateVersion ={};
    if(publishedDate){
      newUpdateVersion.publishedDate = new Date(publishedDate).getTime();
    }
    if(description){
      newUpdateVersion.description=description;
    }
    if(version){
      newUpdateVersion.version=version;
    }
    // update the updateVersion
    updateVersion = await UpdateVersion.findByIdAndUpdate(id ,{$set:newUpdateVersion},{new:true})
    success = true;
    return res.json({success , message:"UpdateVersion updated successfully"});      
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})

// delete an updateVersion
router.delete("/delete/:id" , fetchapp , async(req , res)=>{
  let success = false;
  const {id} = req.params;
  try {
    const app = req.app;
    // checking if the updateVersion is exists or not
    let updateVersion = await UpdateVersion.findById(id);
    if(!updateVersion){
      return res.status(404).json({success , message:"UpdateVersion not found"})
    }     
    // delete the updateVersion
    updateVersion = await UpdateVersion.findByIdAndDelete(id)
    success = true;
    return res.json({success , message:"UpdateVersion deleted successfully"});
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})

module.exports = router;