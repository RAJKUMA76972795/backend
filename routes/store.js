const express = require("express");
const router = express.Router();
const Store = require("../models/Store");
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
  const {templeId,title ,description,mapLink ,location , distance} = req.body;
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
    //  create a new store
    let store = await Store.create({
      templeId:templeId,
      title:title,
      description:description?description:"",
      images:images,
      mapLink:mapLink?mapLink:"",
      location:location?location:"",
      distance:distance?distance:""
  }) 
  success = true;
  return res.json({success , message:"Store added successfully"})
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})

// fetch all store
router.get("/fetchall" , fetchapp , async(req , res)=>{
    let success = false;
    try {
      const app = req.app;
      // finding all store
      let stores = await Store.find();
      stores.reverse();
      success = true;
      return res.json({success , message:stores})
        
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ success, message: "Internal server error" });
    }
})

// fetch temple specific store
router.get("/fetch" , fetchapp , async(req , res)=>{
  let success = false;
  const {templeId} = req.query;
  try {
    const app = req.app;
    // finding the store
    let store = await Store.find({templeId}).select(["-description"]);
    success = true;
    return res.json({success , message:store})
      
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})

// fetching details of 1 store
router.get("/fetchone/:id" , fetchapp , async(req , res)=>{
  let success = false;
  const {id} = req.params;
  try {
    const app = req.app;
    // finding the store
    let store = await Store.findById(id);
    success = true;
    return res.json({success , message:store})
      
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})



// update a store
router.put("/update/:id" , fetchapp , upload.any() , async(req , res)=>{
  let success = false;
  let {title,description ,mapLink,location , distance} = req.body;
  const {id} = req.params;
  try {
    const app = req.app;
    // checking if the store is exists or not
    let store = await Store.findById(id);
    if(!store){
      return res.status(404).json({success , message:"Store not found"})
    }

    let newStore ={};
    if(title){
      newStore.title = title;
    }
    if(description){
      newStore.description=description;
    }
    if(mapLink){
      newStore.mapLink=mapLink;
    }
    if(location){
      newStore.location=location;
    }
    if(distance){
      newStore.distance=distance;
    }


    // update the store
    store = await Store.findByIdAndUpdate(id ,{$set:newStore},{new:true})
    success = true;
    return res.json({success , message:"Store updated successfully"});
      
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})

// delete a store
router.delete("/delete/:id" , fetchapp , upload.any() , async(req , res)=>{
  let success = false;
  const {id} = req.params;
  try {
    const app = req.app;
    // checking if the store is exists or not
    let store = await Store.findById(id);
    if(!store){
      return res.status(404).json({success , message:"Store not found"})
    }
    // deleteing the existing images
    for (let index = 0; index < store.images.length; index++) {
      const element = store.images[index];
      const oldPicture = element.substring(43);
      await deleteFile(oldPicture);
    }
      
    // delete the store
    store = await Store.findByIdAndDelete(id)
    success = true;
    return res.json({success , message:"Store deleted successfully"});
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})

// add a image
router.post("/image/add" , fetchapp , upload.single("image") , async(req , res)=>{
  let success = false;
  const {storeId} = req.body;
  try {
    const app = req.app;
    
    if (!req.file) {
      return res.status(400).json({ success, message: "File needs to be uploaded" })
    }
    // check if the store exists or not
    let store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({ success, message: "Store not found" });
    }

    if(store.images.length<10){
      // updating the store
      await uploadFile(req.file.filename);
      store = await Store.findByIdAndUpdate(storeId, { $push: { images: `https://temple.nyc3.digitaloceanspaces.com/${req.file.filename}` } }, { new: true })
      const path = req.file.filename;

      fs.unlink(path, (err) => {
        if (err) {
          console.error(err)
          return
        }
      })
   
    success = true;
    return res.json({success , message:"Store image added successfully"})
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
  const {storeId ,oldImageLink} = req.body;
  try {
    const app = req.app;
    
    if (!req.file) {
      return res.status(400).json({ success, message: "File needs to be uploaded" })
    }
    // check if the store exists or not
    let store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({ success, message: "Store not found" });
    }

    // getting all images list
    let images = store.images;
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
// updating the store
store = await Store.findByIdAndUpdate(storeId , {$set:{images:images}},{new:true});
   
    success = true;
    return res.json({success , message:"Store image updated successfully"})
    
    
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})


// delete an image
router.delete("/image/delete" , fetchapp , upload.any() , async(req , res)=>{
  let success = false;
  const {storeId ,oldImageLink} = req.body;
  try {
    const app = req.app;
    
    // check if the store exists or not
    let store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({ success, message: "Store not found" });
    }

    // deleting old image from store
    store = await Store.findByIdAndUpdate(storeId , {$pull:{images:oldImageLink}},{new:true})
    
    
    // deleting the old image from server
    const oldPicture = oldImageLink.substring(43);
    await deleteFile(oldPicture);
   
    success = true;
    return res.json({success , message:"Store image deleted successfully"})
    
    
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})







module.exports = router;