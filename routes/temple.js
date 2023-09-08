const express = require("express");
const router = express.Router();
const Temple = require("../models/Temple");
const TempleEvents = require("../models/TempleEvents");
const Hotel = require("../models/Hotel");
const BluePrint = require("../models/BluePrint");
const Direction = require("../models/Direction");
const Nearby = require("../models/Nearby");
const Puja = require("../models/Puja");
const Store = require("../models/Store");
const DailyFeed = require("../models/DailyFeed");
const AdditionalInfo = require("../models/AdditionalInfo");
const Committee = require("../models/Committee");
const Timing = require("../models/Timing");
const PostModerator = require("../models/PostModerator");
const User = require("../models/User");
const PushNotification = require("../models/PushNotification");
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

// firebase setup start
// var admin = require("firebase-admin");
const { getMessaging } = require('firebase-admin/messaging');
const fetchall = require("../middlewares/fetchall");

// var serviceAccount = require("./config/firebase.json");
// var serviceAccount = require("../config/mandhiram.json");
// var serviceAccount = require("../config/firebase.json");

// admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount)
// });

// firebase setup end





//Router-1 register a user using phone 

router.post("/add", fetchapp, imageUpload, async (req, res) => {
  let success = false;


  // check whether the temple with same name exists already
  try {
    const app = req.app;
    let temple = await Temple.findOne({ name: req.body.name });
    if (temple) {
      return res.status(400).json({ success, message: "Sorry a temple with same name already exists" })
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

    // create a new temple
    temple = await Temple.create({
      name: req.body.name,
      location: req.body.location,
      title: req.body.title,
      description: req.body.description ? req.body.description : "",
      images: images,
      shareLink: req.body.shareLink ? req.body.shareLink : ""
    })

    success = true;
    return res.json({ success, message: temple });
  } catch (error) {
    console.log(error.message);
    return res.status(500).send({ success, message: "Internal server error" });
  }
})


// fetch all templates
router.get("/fetchall", fetchall, async (req, res) => {
  let success = false;
  try {
    let id, app;
    // const app = req.app;
    try {
      app = req.app;
    } catch (error) {
      app = null;
    }
    try {
      id = req.user.toString();
    } catch (error) {
      id = null;
    }

    if (id || app) {
      let temples = await Temple.find().select("-events");
      if (id) {
        // checking if the user exists or not
        let user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success, message: "User not found" })
        }
        for (let index = 0; index < temples.length; index++) {
          const temple = temples[index];
          // console.log(temple)
          let isModerator = 0;
          let postModerator = await PostModerator.findOne({ $and: [{ templeId: temple._id }, { userId: id }] });
          // console.log(temple._id , id)
          // console.log(postModerator)
          if (postModerator || user.isAdmin) {
            isModerator = 1
          }
          temples[index] = {...temples[index]._doc , isModerator}
        }
      }
      temples.reverse();
      success = true;
      return res.json({ success, message: temples });
    }

    return res.status(401).json({ success, message: "Please try with valid token" });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success, message: "Internal server error" });
  }

})

// fetch temple by id
router.get("/fetch/:id", fetchapp, async (req, res) => {
  let success = false;
  const { id } = req.params;
  try {
    const app = req.app;
    let temple = await Temple.findById(id);
    success = true;
    return res.json({ success, message: temple });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success, message: "Internal server error" });
  }

})



router.put("/update/:id", fetchapp, upload.any(), async (req, res) => {
  let success = false;
  const { id } = req.params;
  const { location, title, description, shareLink } = req.body;
  try {
    const app = req.app;
    // fetching the temple which needs to be updated
    let temple = await Temple.findById(id);

    if (!temple) {
      return res.status(404).json({ success, message: "Temple not found" })
    }

    // creating a new temple object
    let newTemple = {}

    if (location) {
      newTemple.location = location;
    }
    if (title) {
      newTemple.title = title;
    }

    if (description) {
      newTemple.description = description;
    }

    if (shareLink) {
      newTemple.shareLink = shareLink;
    }
    // update the temple
    temple = await Temple.findByIdAndUpdate(id, { $set: newTemple }, { new: true })



    success = true;
    return res.json({ success, message: temple });
  } catch (error) {
    console.log(error.message);
    return res.status(500).send({ success, message: "Internal server error" });
  }
})


// delete a temple
router.delete("/delete/:id", fetchapp, async (req, res) => {
  let success = false;
  const { id } = req.params;
  try {


    // finding the temple to be deleted
    let temple = await Temple.findById(id);
    if (!temple) {
      return res.status(404).json({ success, message: "Temple not found" })
    }

    // deleteing the existing images
    for (let index = 0; index < temple.images.length; index++) {
      const element = temple.images[index];
      const oldPicture = element.substring(43);
      await deleteFile(oldPicture);
    }

    // deleting all additionalInfos associated with the temple
    let additionalInfos = await AdditionalInfo.find({ templeId: id })
    for (let index = 0; index < additionalInfos.length; index++) {
      const element = additionalInfos[index];
      await AdditionalInfo.findByIdAndDelete(element._id)
    }

    // deleting all blueprints associated with the temple
    let bluePrints = await BluePrint.find({ templeId: id })
    for (let index = 0; index < bluePrints.length; index++) {
      const element = bluePrints[index];
      await BluePrint.findByIdAndDelete(element._id)
    }

    // deleting all committees associated with the temple
    let committees = await Committee.find({ templeId: id })
    for (let index = 0; index < committees.length; index++) {
      const element = committees[index];
      await Committee.findByIdAndDelete(element._id)
    }

    // deleting all dailyFeeds associated with the temple
    let dailyFeeds = await DailyFeed.find({ templeId: id })
    for (let index = 0; index < dailyFeeds.length; index++) {
      const element = dailyFeeds[index];
      await DailyFeed.findByIdAndDelete(element._id)
    }

    // deleting all direction associated with the temple
    let directions = await Direction.find({ templeId: id })
    for (let index = 0; index < directions.length; index++) {
      const element = directions[index];
      await Direction.findByIdAndDelete(element._id)
    }

    // deleting all hotels associated with the temple
    let hotels = await Hotel.find({ templeId: id })
    for (let index = 0; index < hotels.length; index++) {
      const element = hotels[index];
      await Hotel.findByIdAndDelete(element._id)
    }


    // deleting all nearby associated with the temple
    let nearbys = await Nearby.find({ templeId: id })
    for (let index = 0; index < nearbys.length; index++) {
      const element = nearbys[index];
      await Nearby.findByIdAndDelete(element._id)
    }

    // deleting all puja associated with the temple
    let pujas = await Puja.find({ templeId: id })
    for (let index = 0; index < pujas.length; index++) {
      const element = pujas[index];
      await Temple.findByIdAndDelete(element._id)
    }

    // deleting all stores associated with the temple
    let stores = await Store.find({ templeId: id })
    for (let index = 0; index < stores.length; index++) {
      const element = stores[index];
      await Store.findByIdAndDelete(element._id)
    }

    // deleting all events associated with the temple
    let templeEvents = await TempleEvents.find({ templeId: id })
    for (let index = 0; index < templeEvents.length; index++) {
      const element = templeEvents[index];
      await TempleEvents.findByIdAndDelete(element._id)
    }

    // deleting all timings associated with the temple
    let timings = await Timing.find({ templeId: id })
    for (let index = 0; index < timings.length; index++) {
      const element = timings[index];
      await Timing.findByIdAndDelete(element._id)
    }

    // delete the temple
    temple = await Temple.findByIdAndDelete(id);
    success = true;
    return res.json({ success, message: temple })

  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success, message: "Internal server error" });
  }
})

// add an event to a temple
router.put("/addevent", fetchapp, upload.single("image"), async (req, res) => {
  let success = false;
  const { templeId, date, title, description, shortDescription } = req.body;
  try {
    const app = req.app;
    // check if the temple exists or not

    let temple = await Temple.findById(templeId);
    if (!temple) {
      return res.status(404).json({ success, message: "Temple not found" });
    }
    if (title.toLowerCase() === "holiday") {
      let templeEvent = await TempleEvents.findOne({ date: new Date(date).getTime() })
      if (templeEvent) {
        return res.status(400).json({ success, message: "Sorry an event in this date is found" });
      }
    }

    if (req.file) {
      await uploadFile(req.file.filename);
    }

    // create a new TempleEvents
    let templeEvents = await TempleEvents.create({
      templeId: templeId,
      date: new Date(date).getTime(),
      title: title,
      description: description ? description : "",
      image: req.file ? `https://temple.nyc3.digitaloceanspaces.com/${req.file.filename}` : "",
      shortDescription: shortDescription
    })

    if (req.file) {
      const path = req.file.filename;

      fs.unlink(path, (err) => {
        if (err) {
          console.error(err)
          return
        }
      })
    }

    // add new templeEvents id to the temple events
    temple = await Temple.findByIdAndUpdate(templeId, { $push: { events: templeEvents._id.toString() } }, { new: true })

    let topicWithoutSpace = temple.name.replaceAll(' ', '-');
    const message = {
      notification: { title, body: shortDescription },
      topic: topicWithoutSpace
    }
    // send message to a topic
    await getMessaging().send(message)

    // create a new PushNotification to send notification later
    let pushNotification = await PushNotification.create({
      topic:temple.name,
      title,
      body:shortDescription,
      time:new Date(date).getTime() - 86400000,
      isSent:false
  })

    success = true;
    return res.json({ success, message: "Events added successfully" })
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success, message: "Internal server error" });
  }
})

// update an event of a temple
router.put("/updateevent", fetchapp, upload.single("image"), async (req, res) => {
  let success = false;
  const { templeEventsId, date, title, description, shortDescription } = req.body;
  try {
    // check if the templeEvents exists or not
    let templeEvents = await TempleEvents.findById(templeEventsId);
    if (!templeEvents) {
      return res.status(404).json({ success, message: "Temple event not found" });
    }

    // create a new templeEvents object
    let newTempleEvents = {};
    if (req.file) {
      // deleteing the previous image
      if (templeEvents.image !== "") {
        let oldPicture = templeEvents.image.substring(43);
        await updateFile(oldPicture, req.file.filename);
      }
      else {
        await uploadFile(req.file.filename);
      }
      newTempleEvents.image = `https://temple.nyc3.digitaloceanspaces.com/${req.file.filename}`;
      const path = req.file.filename;

      fs.unlink(path, (err) => {
        if (err) {
          console.error(err)
          return
        }
      })
    }
    if (date) {
      if (templeEvents.title.toLowerCase() === "holiday") {
        let templeEvent = await TempleEvents.findOne({ date: new Date(date).getTime() })
        if (templeEvent) {
          return res.status(400).json({ success, message: "Sorry an event in this date is found" });
        }
      }
      newTempleEvents.date = new Date(date).getTime()
    };
    if (title) {
      if (title.toLowerCase() === "holiday") {
        let templeEvent = await TempleEvents.findOne({ date: new Date(date).getTime() })
        if (templeEvent) {
          return res.status(400).json({ success, message: "Sorry an event in this date is found" });
        }
      }
      newTempleEvents.title = title
    };
    if (description) { newTempleEvents.description = description };
    if (shortDescription) { newTempleEvents.shortDescription = shortDescription };

    // updating the temple event
    templeEvents = await TempleEvents.findByIdAndUpdate(templeEventsId, { $set: newTempleEvents }, { new: true })
    success = true;
    return res.json({ success, message: "Temple events updated successfully" })
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success, message: "Internal server error" });
  }
})

// delete an event of a temple
router.delete("/deleteevent", fetchapp, upload.any(), async (req, res) => {
  let success = false;
  const { templeEventsId } = req.body;
  try {
    // check if the templeEvents exists or not
    let templeEvents = await TempleEvents.findById(templeEventsId);
    if (!templeEvents) {
      return res.status(404).json({ success, message: "Temple event not found" });
    }

    // deleting the image from this folder
    if (templeEvents.image !== "") {
      let oldPicture = templeEvents.image.substring(43);
      await deleteFile(oldPicture);
    }

    // getting templeId from templeEvents
    let templeId = templeEvents.templeId;
    console.log(templeId)
    // deleting the templeEventsId from the temple
    let temple = await Temple.findByIdAndUpdate(templeId, { $pull: { events: templeEventsId } }, { new: true });
    console.log(temple)
    // deleting the templeEvents
    templeEvents = await TempleEvents.findByIdAndDelete(templeEventsId);
    success = true;
    return res.json({ success, message: "Temple event delete successfully" })


  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success, message: "Internal server error" });
  }
})

// get an event of a temple
router.get("/fetcheventsdate", fetchapp, upload.any(), async (req, res) => {
  let success = false;
  const { templeId, date } = req.query;
  try {
    const app = req.app;
    // finding all the events of this temple
    let templeEvents = await TempleEvents.find({ templeId });
    let templeEventsDate = {};
    for (let index = 0; index < templeEvents.length; index++) {
      const element = templeEvents[index];
      // console.log(element)
      if (Object.keys(templeEventsDate).includes(new Date(element.date).toLocaleDateString('sv'))) {
        if (element.title.toLowerCase() === "holiday") {
          templeEventsDate[new Date(element.date).toLocaleDateString('sv')] += 0
        }
        else {
          templeEventsDate[new Date(element.date).toLocaleDateString('sv')] += 1
        }

      }
      else {
        if (element.title.toLowerCase() === "holiday") {
          templeEventsDate[new Date(element.date).toLocaleDateString('sv')] = 0
        }
        else {
          templeEventsDate[new Date(element.date).toLocaleDateString('sv')] = 1
        }
      }
    }
    if (date) {
      templeEvents = templeEvents.filter(templeEvent => new Date(templeEvent.date).toLocaleDateString('sv') === date)
      success = true;
      return res.json({ success, message: templeEvents });
    }
    else {
      let templeEventsDateArray = [];
      for (const key in templeEventsDate) {
        templeEventsDateArray.push({ date: key, count: templeEventsDate[key] })
      }

      success = true;
      return res.json({ success, message: templeEventsDateArray })
    }


  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success, message: "Internal server error" });
  }
})

// fetch all events
router.get("/fetchallevents", fetchapp, upload.any(), async (req, res) => {
  let success = false;
  try {
    const app = req.app;
    // finding all the events of this temple
    let templeEvents = await TempleEvents.find();
    templeEvents.reverse();
    let allTempleEvents = [];
    for (let index = 0; index < templeEvents.length; index++) {
      const element = templeEvents[index];
      let temple = await Temple.findById(element.templeId);
      allTempleEvents.push({ ...element._doc, templeName: temple.name })
    }
    success = true;
    return res.json({ success, message: allTempleEvents })


  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success, message: "Internal server error" });
  }
})


// add a image
router.post("/image/add", fetchapp, upload.single("image"), async (req, res) => {
  let success = false;
  const { templeId } = req.body;
  try {
    const app = req.app;

    if (!req.file) {
      return res.status(400).json({ success, message: "File needs to be uploaded" })
    }
    // check if the temple exists or not
    let temple = await Temple.findById(templeId);
    if (!temple) {
      return res.status(404).json({ success, message: "Temple not found" });
    }

    if (temple.images.length < 10) {
      // updating the temple
      await uploadFile(req.file.filename);
      temple = await Temple.findByIdAndUpdate(templeId, { $push: { images: `https://temple.nyc3.digitaloceanspaces.com/${req.file.filename}` } }, { new: true })
      const path = req.file.filename;

      fs.unlink(path, (err) => {
        if (err) {
          console.error(err)
          return
        }
      })

      success = true;
      return res.json({ success, message: "Temple image added successfully" })
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
  const { templeId, oldImageLink } = req.body;
  try {
    const app = req.app;

    if (!req.file) {
      return res.status(400).json({ success, message: "File needs to be uploaded" })
    }
    // check if the temple exists or not
    let temple = await Temple.findById(templeId);
    if (!temple) {
      return res.status(404).json({ success, message: "Temple not found" });
    }

    // getting all images list
    let images = temple.images;
    for (let index = 0; index < images.length; index++) {
      const element = images[index];
      if (element === oldImageLink) {
        const oldPicture = oldImageLink.substring(43);
        await updateFile(oldPicture, req.file.filename);
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
    // updating the temple
    temple = await Temple.findByIdAndUpdate(templeId, { $set: { images: images } }, { new: true });

    success = true;
    return res.json({ success, message: "Temple image updated successfully" })


  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success, message: "Internal server error" });
  }
})


// delete an image
router.delete("/image/delete", fetchapp, upload.any(), async (req, res) => {
  let success = false;
  const { templeId, oldImageLink } = req.body;
  try {
    const app = req.app;

    // check if the temple exists or not
    let temple = await Temple.findById(templeId);
    if (!temple) {
      return res.status(404).json({ success, message: "Temple not found" });
    }

    // deleting old image from temple
    temple = await Temple.findByIdAndUpdate(templeId, { $pull: { images: oldImageLink } }, { new: true })


    // deleting the old image from server
    const oldPicture = oldImageLink.substring(43);
    await deleteFile(oldPicture);

    success = true;
    return res.json({ success, message: "Temple image deleted successfully" })


  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success, message: "Internal server error" });
  }
})





module.exports = router;