const express = require("express");
const router = express.Router();
const Temple = require("../models/Temple");
const Hotel = require("../models/Hotel");
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
// multer part end --------------------

// add a hotel
router.post("/add", fetchapp, imageUpload, async (req, res) => {
  let success = false;
  const { templeId, name, description ,mapLink , location , distance } = req.body;
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
    

    // create a new hotel
    let hotel = await Hotel.create({
      templeId: templeId,
      name: name,
      description: description ? description : "",
      templeName: temple.name,
      images: images,
      mapLink:mapLink?mapLink:"",
      location:location?location:"",
      distance:distance?distance:""
    })

    // adding id of the new hotel to the temples hotel list
    temple = await Temple.findByIdAndUpdate(templeId, { $push: { hotels: hotel._id.toString() } }, { new: true })

    success = true;
    return res.json({ success, message: "Hotel added successfully" });

  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success, message: "Internal server error" });
  }
})

// fetch all hotels
router.get("/fetchall", fetchapp, async (req, res) => {
  let success = false;
  try {
    const app = req.app;
    // finding all hotel
    let hotels = await Hotel.find();
    hotels.reverse();
    success = true;
    return res.json({ success, message: hotels })

  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success, message: "Internal server error" });
  }
})

// fetch temple specific hotels
router.get("/fetch", fetchapp, async (req, res) => {
  let success = false;
  const { templeId } = req.query;
  try {
    const app = req.app;
    // finding all hotel
    let hotels = await Hotel.find({ templeId: templeId });
    success = true;
    return res.json({ success, message: hotels })
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success, message: "Internal server error" });
  }
})

// update a hotel details
router.put("/update/:id", fetchapp, upload.single("image"), async (req, res) => {
  let success = false;
  const { id } = req.params;
  const { name, description ,mapLink , location , distance } = req.body;
  try {
    const app = req.app;
    // fetching the hotel which needs to be updated
    let hotel = await Hotel.findById(id);

    if (!hotel) {
      return res.status(404).json({ success, message: "Hotel not found" })
    }

    // creating a new hotel object
    let newHotel = {}

    

    if (name) {
      newHotel.name = name;
    }
    if (description) {
      newHotel.description = description;
    }
    if(mapLink){
      newHotel.mapLink=mapLink;
    }
    if(location){
      newHotel.location=location;
    }
    if(distance){
      newHotel.distance=distance;
    }


    // update the hotel
    hotel = await Hotel.findByIdAndUpdate(id, { $set: newHotel }, { new: true })



    success = true;
    return res.json({ success, message: hotel });
  } catch (error) {
    console.log(error.message);
    return res.status(500).send({ success, message: "Internal server error" });
  }
})

// deleting a hotel
router.delete("/delete/:id", fetchapp, async (req, res) => {
  let success = false;
  const { id } = req.params;
  try {


    // finding the hotel to be deleted
    let hotel = await Hotel.findById(id);
    if (!hotel) {
      return res.status(404).json({ success, message: "Hotel not found" })
    }

    // delete the hotel
    hotel = await Hotel.findByIdAndDelete(id);
    // removing the hotel id from temple hotels list
    let temple = await Temple.findByIdAndUpdate(hotel.templeId, { $pull: { hotels: hotel._id.toString() } }, { new: true })
    success = true;
    return res.json({ success, message: hotel })

  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success, message: "Internal server error" });
  }
})


// add a image
router.post("/image/add" , fetchapp , upload.single("image") , async(req , res)=>{
  let success = false;
  const {hotelId} = req.body;
  try {
    const app = req.app;
    
    if (!req.file) {
      return res.status(400).json({ success, message: "File needs to be uploaded" })
    }
    // check if the hotel exists or not
    let hotel = await Hotel.findById(hotelId);
    if (!hotel) {
      return res.status(404).json({ success, message: "Hotel not found" });
    }

    if(hotel.images.length<10){
      // updating the hotel
      await uploadFile(req.file.filename);
      hotel = await Hotel.findByIdAndUpdate(hotelId, { $push: { images: `https://temple.nyc3.digitaloceanspaces.com/${req.file.filename}` } }, { new: true })
      const path = req.file.filename;

      fs.unlink(path, (err) => {
        if (err) {
          console.error(err)
          return
        }
      })
   
    success = true;
    return res.json({success , message:"Hotel image added successfully"})
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
  const {hotelId ,oldImageLink} = req.body;
  try {
    const app = req.app;
    
    if (!req.file) {
      return res.status(400).json({ success, message: "File needs to be uploaded" })
    }
    // check if the hotel exists or not
    let hotel = await Hotel.findById(hotelId);
    if (!hotel) {
      return res.status(404).json({ success, message: "Hotel not found" });
    }

    // getting all images list
    let images = hotel.images;
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
// updating the hotel
hotel = await Hotel.findByIdAndUpdate(hotelId , {$set:{images:images}},{new:true});
   
    success = true;
    return res.json({success , message:"Hotel image updated successfully"})
    
    
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})


// delete an image
router.delete("/image/delete" , fetchapp , upload.any() , async(req , res)=>{
  let success = false;
  const {hotelId ,oldImageLink} = req.body;
  try {
    const app = req.app;
    
    // check if the hotel exists or not
    let hotel = await Hotel.findById(hotelId);
    if (!hotel) {
      return res.status(404).json({ success, message: "Hotel not found" });
    }

    // deleting old image from hotel
    hotel = await Hotel.findByIdAndUpdate(hotelId , {$pull:{images:oldImageLink}},{new:true})
    
    
    // deleting the old image from server
    const oldPicture = oldImageLink.substring(43);
    await deleteFile(oldPicture);
   
    success = true;
    return res.json({success , message:"Hotel image deleted successfully"})
    
    
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
  }
})








module.exports = router;