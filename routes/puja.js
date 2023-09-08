const express = require("express");
const router = express.Router();
const Puja = require("../models/Puja");
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


router.post("/add", fetchapp, imageUpload, async (req, res) => {
  let success = false;
  const { templeId, title, description } = req.body;
  try {
    const app = req.app;

    // checking if the temple exists or not
    let temple = await Temple.findById(templeId);
    if (!temple) {
      return res.status(404).json({ success, message: "Temple not found" })
    }

    let images = [];
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
    //  create a new puja
    let puja = await Puja.create({
      templeId: templeId,
      title: title,
      description: description ? description : "",
      images: images
    })
    success = true;
    return res.json({ success, message: "Puja added successfully" })
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success, message: "Internal server error" });
  }
})

// fetch all puja
router.get("/fetchall", fetchapp, async (req, res) => {
  let success = false;
  try {
    const app = req.app;
    // finding all puja
    let pujas = await Puja.find();
    pujas.reverse();
    success = true;
    return res.json({ success, message: pujas })

  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success, message: "Internal server error" });
  }
})

// fetch temple specific puja
router.get("/fetch", fetchapp, async (req, res) => {
  let success = false;
  const { templeId } = req.query;
  try {
    const app = req.app;
    // finding the puja
    let puja = await Puja.find({ templeId });
    success = true;
    return res.json({ success, message: puja })

  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success, message: "Internal server error" });
  }
})



// update a puja
router.put("/update/:id", fetchapp, upload.any(), async (req, res) => {
  let success = false;
  let { title, description } = req.body;
  const { id } = req.params;
  try {
    const app = req.app;
    // checking if the puja is exists or not
    let puja = await Puja.findById(id);
    if (!puja) {
      return res.status(404).json({ success, message: "Puja not found" })
    }

    let newPuja = {};
    if (title) {
      newPuja.title = title;
    }
    if (description) {
      newPuja.description = description;
    }

    // update the puja
    puja = await Puja.findByIdAndUpdate(id, { $set: newPuja }, { new: true })
    success = true;
    return res.json({ success, message: "Puja updated successfully" });

  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success, message: "Internal server error" });
  }
})

// delete a puja
router.delete("/delete/:id", fetchapp, upload.any(), async (req, res) => {
  let success = false;
  const { id } = req.params;
  try {
    const app = req.app;
    // checking if the puja is exists or not
    let puja = await Puja.findById(id);
    if (!puja) {
      return res.status(404).json({ success, message: "Puja not found" })
    }
    // deleteing the existing images
    for (let index = 0; index < puja.images.length; index++) {
      const element = puja.images[index];
      const oldPicture = element.substring(43);
      await deleteFile(oldPicture);
    }

    // delete the puja
    puja = await Puja.findByIdAndDelete(id)
    success = true;
    return res.json({ success, message: "Puja deleted successfully" });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success, message: "Internal server error" });
  }
})

// add a image
router.post("/image/add", fetchapp, upload.single("image"), async (req, res) => {
  let success = false;
  const { pujaId } = req.body;
  try {
    const app = req.app;

    if (!req.file) {
      return res.status(400).json({ success, message: "File needs to be uploaded" })
    }
    // check if the puja exists or not
    let puja = await Puja.findById(pujaId);
    if (!puja) {
      return res.status(404).json({ success, message: "Puja not found" });
    }

    if (puja.images.length < 10) {
      // updating the puja
      await uploadFile(req.file.filename);
      puja = await Puja.findByIdAndUpdate(pujaId, { $push: { images: `https://temple.nyc3.digitaloceanspaces.com/${req.file.filename}` } }, { new: true })
      const path = req.file.filename;

      fs.unlink(path, (err) => {
        if (err) {
          console.error(err)
          return
        }
      })

      success = true;
      return res.json({ success, message: "Puja image added successfully" })
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
  const { pujaId, oldImageLink } = req.body;
  try {
    const app = req.app;

    if (!req.file) {
      return res.status(400).json({ success, message: "File needs to be uploaded" })
    }
    // check if the puja exists or not
    let puja = await Puja.findById(pujaId);
    if (!puja) {
      return res.status(404).json({ success, message: "Puja not found" });
    }

    // getting all images list
    let images = puja.images;
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
    // updating the puja
    puja = await Puja.findByIdAndUpdate(pujaId, { $set: { images: images } }, { new: true });

    success = true;
    return res.json({ success, message: "Puja image updated successfully" })


  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success, message: "Internal server error" });
  }
})


// delete an image
router.delete("/image/delete", fetchapp, upload.any(), async (req, res) => {
  let success = false;
  const { pujaId, oldImageLink } = req.body;
  try {
    const app = req.app;

    // check if the puja exists or not
    let puja = await Puja.findById(pujaId);
    if (!puja) {
      return res.status(404).json({ success, message: "Puja not found" });
    }

    // deleting old image from puja
    puja = await Puja.findByIdAndUpdate(pujaId, { $pull: { images: oldImageLink } }, { new: true })


    // deleting the old image from server
    const oldPicture = oldImageLink.substring(43);
    await deleteFile(oldPicture);

    success = true;
    return res.json({ success, message: "Puja image deleted successfully" })


  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success, message: "Internal server error" });
  }
})







module.exports = router;