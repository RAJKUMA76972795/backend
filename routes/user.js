const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Family = require("../models/Family");
const Blog = require("../models/Blog");
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
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
// multer part end --------------------





//Router-1 register a user using phone 

router.post("/register", fetchapp, upload.any(), [
  body('phone', "Enter a valid phone number").isLength({ min: 10 }),
], async (req, res) => {
  let success = false;
  // // if there are errors return bad request and the errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success, message: errors.array() });
  }

  // check whether the user with same phone exists already
  try {
    const app = req.app;
    let user = await User.findOne({ phone: req.body.phone });
    if (user) {
      return res.status(400).json({ success, message: "Sorry a user with this phone already exists" })
    }

    // create a new user
    user = await User.create({
      phone: req.body.phone,
      name:req.body.name?req.body.name:"",
      birthDate:req.body.birthDate?new Date(req.body.birthDate):0,
      pushToken:req.body.pushToken
    })

    success = true;
    return res.json({ success, message: "New user registered successfully" });
  } catch (error) {
    console.log(error.message);
    return res.status(500).send({ success, message: "Internal server error" });
  }
})

//Router-2 login a user using phone

router.post("/login", fetchapp, upload.any(),
  [
    body('phone', "Enter a valid phone number").isMobilePhone(),
  ],
  async (req, res) => {
    let success = false;
    // if there are errors return bad request and the errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success, message: errors.array() });
    }


    try {
      const app = req.app;
      // check whether the user exists or not 
      let user = await User.findOne({ phone: req.body.phone });
      if (!user) {
        return res.status(404).json({ success, message: "user not found" })
      }
      if (user.isVerified === true) {
        // comparing the given password with the saved password in database
        // const passwordCompare = await bcrypt.compare(req.body.password, user.password);
        // if (!passwordCompare) {
        //   return res.status(400).json({ success, message: "Please try to login with correct credentials" });
        // }
        await User.findOneAndUpdate({phone: req.body.phone },{$set:{pushToken:req.body.pushToken}},{new:true})
        // creating jwt token
        const data = { user: user._id };
        const authUser = jwt.sign(data, process.env.JWT_SECRET)

        success = true;
        return res.json({ success, authUser });
      }
      else {
        return res.status(400).json({ success, message: "You are not a verified user so you can not login" })
      }
    } catch (error) {
      console.log(error.message);
      return res.status(500).json({ success, message: "Internal server error" });
    }
  })


//   router-3 update password and other details by admin
router.put("/update", fetchapp, upload.single("image"), async (req, res) => {
  let success = false;
  const { phone, isVerified } = req.body;
  try {
    const app = req.app;
    // check whether the user exists or not 
    let user = await User.findOne({ phone: phone });
    if (!user) {
      return res.status(404).json({ success, message: "user not found" })
    }





    // create a new user object
    const newUser = {};

    if (req.file) {
      // deleteing the previous image
      if (user.image !== "") {
        let oldPicture = user.image.substring(43);
        await updateFile(oldPicture, req.file.filename);
      }
      else {
        await uploadFile(req.file.filename);
      }
      newUser.image = `https://temple.nyc3.digitaloceanspaces.com/${req.file.filename}`;
      const path = req.file.filename;

      fs.unlink(path, (err) => {
        if (err) {
          console.error(err)
          return
        }
      })
    }
    if (isVerified) {
      newUser.isVerified = isVerified;
    }
   


    // updating the user
    user = await User.findOneAndUpdate({ phone }, { $set: newUser }, { new: true });
    success = true;
    return res.json({ success, message: "User details updated successfully" });

  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success, message: "Internal server error" });
  }
})


//   router-4 update password and other details by admin
router.put("/updatebyadmin/:id", fetchapp, upload.single("image"), async (req, res) => {
  let success = false;
  const { phone, isVerified, name, birthDate } = req.body;
  const { id } = req.params;
  try {
    const app = req.app;
    // check whether the user exists or not
    let user = await User.findById(id)
    if (!user) {
      return res.status(404).json({ success, message: "user not found" })
    }
    // checking if any user exists with given phone number or not
    if (phone !== user.phone) {
      user = await User.findOne({ phone: phone });
      if (user) {
        return res.status(400).json({ success, message: "There is already a user with this phone number" })
      }
    }





    // create a new user object
    const newUser = {};

    if (req.file) {
      // deleteing the previous image
      if (user.image !== "") {
        let oldPicture = user.image.substring(43);
        await updateFile(oldPicture, req.file.filename);
      }
      else {
        await uploadFile(req.file.filename);
      }
      newUser.image = `https://temple.nyc3.digitaloceanspaces.com/${req.file.filename}`;
      const path = req.file.filename;

      fs.unlink(path, (err) => {
        if (err) {
          console.error(err)
          return
        }
      })
    }
    if (isVerified) {
      newUser.isVerified = isVerified;
    }
    // if (password) {
    //   const salt = await bcrypt.genSalt(10);
    //   const secPass = await bcrypt.hash(password, salt);
    //   newUser.password = secPass;
    // }
    if (name) {
      newUser.name = name;
    }
    if (birthDate) {
      newUser.birthDate = new Date(birthDate);
    }


    // updating the user
    user = await User.findOneAndUpdate({ phone }, { $set: newUser }, { new: true });
    success = true;
    return res.json({ success, message: "User details updated successfully" });

  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success, message: "Internal server error" });
  }
})

//    update password and other details by user
router.put("/updateuser", fetchuser, upload.single("image"), async (req, res) => {
  let success = false;
  const { phone, name, birthDate ,pushToken } = req.body;
  try {
    const id = req.user;
    // getting the user
    let user = await User.findById(id);
    // creating a new user object 
    let newUser = {}

    if (phone) {
      // check whether any user with this phone number exists or not 
      user = await User.findOne({ phone: phone });
      if (user) {
        return res.status(404).json({ success, message: "this number is already used" })
      }
      newUser.phone = phone;
    }




    if (req.file) {
      // deleteing the previous image
      if (user.image !== "") {
        let oldPicture = user.image.substring(43);
        await updateFile(oldPicture, req.file.filename);
      }
      else {
        await uploadFile(req.file.filename);
      }
      newUser.image = `https://temple.nyc3.digitaloceanspaces.com/${req.file.filename}`;
      const path = req.file.filename;

      fs.unlink(path, (err) => {
        if (err) {
          console.error(err)
          return
        }
      })
    }

    if (name) { newUser.name = name }
    if (birthDate) { newUser.birthDate = new Date(birthDate) }
    if (pushToken) { newUser.pushToken = pushToken }


    // updating the user
    user = await User.findByIdAndUpdate(id, { $set: newUser }, { new: true });
    success = true;
    return res.json({ success, message: "User details updated successfully" });

  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success, message: "Internal server error" });
  }
})

router.get("/fetch", fetchuser, async (req, res) => {
  let success = false;
  try {
    const id = req.user;
    let user = await User.findById(id);
    success = true;
    return res.json({ success, message: user });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success, message: "Internal server error" });
  }

})


router.get("/fetchall", fetchapp, async (req, res) => {
  let success = false;
  try {
    const app = req.app;
    let users = await User.find();
    users.reverse();
    success = true;
    return res.json({ success, message: users });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success, message: "Internal server error" });
  }

})

// delete a user
router.delete("/delete", fetchuser, async (req, res) => {
  let success = false;
  try {
    const id = req.user;

    // finding the user to be deleted
    let user = await User.findById(id);
    // deleting the image from this folder if exists
    if (user.image !== "") {
      let oldPicture = user.image.substring(43);
      await deleteFile(oldPicture);
    }
    // delete the user
    user = await User.findByIdAndDelete(id);
    success = true;
    return res.json({ success, message: user })

  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success, message: "Internal server error" });
  }
})

// add a family
router.post("/family", fetchuser, upload.any(), async (req, res) => {
  let success = false;
  const { name, birthDate, gender, relation, location, gotra } = req.body;
  try {
    const id = req.user;
    // checking if this family member is already present in the users family list
    let family = await Family.findOne({ $and: [{ userId: id }, { name }] });
    if (family) {
      return res.status(400).json({ success, message: "This member is already in your family" })
    }

    // create a new family
    family = await Family.create({
      userId: id,
      name: name,
      birthDate: new Date(birthDate),
      gender: gender,
      relation: relation,
      location: location,
      gotra: gotra
    })

    success = true;
    return res.json({ success, message: family });

  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success, message: "Internal server error" });
  }
})


// fetch all family members
router.get("/family", fetchuser, async (req, res) => {
  let success = false;
  try {
    const id = req.user;
    // find all family members of this user
    const family = await Family.find({ userId: id });
    success = true;
    return res.json({ success, message: family })
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success, message: "Internal server error" });
  }
})

// update a family member
router.put("/family", fetchuser, upload.any(), async (req, res) => {
  let success = false;
  const { familyId, name, birthDate, gender, relation, location, gotra } = req.body;
  try {
    const id = req.user;
    // find the family member whose details to be updated
    let family = await Family.findOne({ $and: [{ _id: familyId }, { userId: id }] })
    if (!family) {
      return res.status(404).json({ success, message: "No family found" });
    }

    // create a new family object
    let newFamily = {};
    if (name) {
      // check if there are any family member with same name of this user
      let family = await Family.findOne({ $and: [{ userId: id }, { name }] });
      if (family) {
        return res.status(400).json({ success, message: `A family member of same name is already present` })
      }
      newFamily.name = name;
    }
    if (birthDate) {
      newFamily.birthDate = new Date(birthDate).getTime();
    }
    if (gender) {
      newFamily.gender = gender;
    }
    if (relation) {
      newFamily.relation = relation;
    }
    if (location) {
      newFamily.location = location;
    }
    if (gotra) {
      newFamily.gotra = gotra;
    }

    // update the family
    family = await Family.findOneAndUpdate({ _id: familyId }, { $set: newFamily }, { new: true })
    success = true;
    return res.json({ success, message: family })



  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success, message: "Internal server error" });
  }
})

// delete a family member
router.delete("/family", fetchuser, upload.any(), async (req, res) => {
  let success = false;
  const { familyId } = req.body;
  try {
    const id = req.user;
    // find the family member to be deleted
    let family = await Family.findOne({ $and: [{ _id: familyId }, { userId: id }] })
    if (!family) {
      return res.status(404).json({ success, message: "No family found" });
    }

    // delete the family member
    family = await Family.findOneAndDelete({ $and: [{ _id: familyId }, { userId: id }] });
    success = true;
    return res.json({ success, message: family })
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success, message: "Internal server error" });
  }
})

// delete a user
router.delete("/deletebyadmin/:id", fetchapp, async (req, res) => {
  let success = false;
  const {id}= req.params;
  try {
    const app = req.app;

    // finding the user to be deleted
    let user = await User.findById(id);
    // deleting the image from this folder if exists
    if (user.image !== "") {
      let oldPicture = user.image.substring(43);
      await deleteFile(oldPicture);
    }
    // delete the user
    user = await User.findByIdAndDelete(id);
    success = true;
    return res.json({ success, message: user })

  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success, message: "Internal server error" });
  }
})

// book marking a blog
router.put("/blog", fetchuser, upload.any(), async (req, res) => {
  let success = false;
  const { blogId  } = req.body;
  try {
    const id = req.user;
    // checking if the blog is exists or not
    let blog = await Blog.findById(blogId)
    if(!blog){
      return res.status(404).json({success , message:"Blog not found"})
    }
    let user = await User.findOne({ $and: [{ _id: id }, { blogs: { $elemMatch: { $eq: blogId } } }] });
    // updating the user
    if(user){
      user = await User.findByIdAndUpdate(id, { $pull:{blogs:blogId} }, { new: true });
    }
    else{
      user = await User.findByIdAndUpdate(id, { $push:{blogs:blogId} }, { new: true });
    }
    success = true;
    return res.json({ success, message: "Blog bookmarked successfully" });

  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success, message: "Internal server error" });
  }
})

// getting all book marked blog
router.get("/blog", fetchuser, async (req, res) => {
  let success = false;
  try {
    const id = req.user;

    // find the user
    let user = await User.findById(id);
    
    let blogDetails =[];
    for (let index = 0; index < user.blogs.length; index++) {
      const element = user.blogs[index];
      let blogDetail = await Blog.findById(element);
      blogDetails.push(blogDetail);
    }

    success = true;
    return res.json({ success, message: blogDetails });

  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success, message: "Internal server error" });
  }
})






module.exports = router;