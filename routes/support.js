const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Support = require("../models/Support");
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const fetchapp = require("../middlewares/fetchapp");
const fetchuser = require("../middlewares/fetchuser");
const fs = require('fs');
const { uploadFile, deleteFile, updateFile } = require("../utilities/awsS3")

//multer setup start ---------------------------------------------------

const multer = require('multer');



const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'static/images/supports')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, uniqueSuffix + '-' + file.originalname)
    }
})

const upload = multer({ storage: storage })
// multer part end --------------------


// add a support
router.post("/add", fetchuser, upload.single("image"), async (req, res) => {
    let success = false;
    const { query, title } = req.body;
    try {
        const id = req.user;
        let user = await User.findById(id);

        // creating new support 
        let support = await Support.create({
            phone: user.phone,
            name: user.name,
            query: query,
            image: req.file ? `${process.env.HOST}/static/images/supports/${req.file.filename}` : "",
            title: title
        })

        let success = true;
        return res.json({ success, message: "Support added successfully" });

    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ success, message: "Internal server error" });
    }
})

// fetch all support
router.get("/fetchall", fetchapp, async (req, res) => {
    let success = false;
    try {
        const app = req.app;
        // fetching all support
        let supports = await Support.find();
        supports.reverse();
        success = true;
        return res.json({ success, message: supports });
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ success, message: "Internal server error" });
    }
})

// fetch user specific support
router.get("/fetch", fetchuser, async (req, res) => {
    let success = false;
    try {
        const id = req.user;
        let user = await User.findById(id);

        // finding all support for this user
        let supports = await Support.find({ phone: user.phone });
        success = true;
        return res.json({ success, message: supports })

    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ success, message: "Internal server error" });
    }
})

// support resolved
router.put("/resolve", fetchapp, upload.any(), async (req, res) => {
    let success = false;
    const { supportId } = req.body;
    try {
        const app = req.app;

        // checking if the support of this supportId is exists or not
        let support = await Support.findById(supportId);
        if (!support) {
            return res.status(404).json({ success, message: "Support not found" });
        }

        // update the support
        support = await Support.findByIdAndUpdate(supportId, { $set: { pending: false } }, { new: true })
        success = true;
        return res.json({ success, message: "Support resolved successfully" })
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ success, message: "Internal server error" });
    }
})

// reply by admin
router.put("/replybyadmin", fetchapp, upload.any(), async (req, res) => {
    let success = false;
    const { supportId, message } = req.body;
    try {
        const app = req.app;

        // checking if the support of this supportId is exists or not
        let support = await Support.findById(supportId);
        if (!support) {
            return res.status(404).json({ success, message: "Support not found" });
        }

        // update the support
        support = await Support.findByIdAndUpdate(supportId, { $push: { replies: { admin: message } } }, { new: true })
        success = true;
        return res.json({ success, message: "message send successfully" })
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ success, message: "Internal server error" });
    }
})


// reply by user himself
router.put("/replybyuser", fetchuser, upload.any(), async (req, res) => {
    let success = false;
    const { supportId, message } = req.body;
    try {
        const id = req.user;

        // checking if the support of this supportId is exists or not
        let support = await Support.findById(supportId);
        if (!support) {
            return res.status(404).json({ success, message: "Support not found" });
        }

        // checking if the user of this supportId is exists or not
        let user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success, message: "User not found" });
        }
        if (support.phone !== user.phone) {
            return res.status(400).json({ success, message: "This support is not raised by you , So you can not reply" });
        }

        // update the support
        support = await Support.findByIdAndUpdate(supportId, { $push: { replies: { user: message } } }, { new: true })
        success = true;
        return res.json({ success, message: "message send successfully" })
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ success, message: "Internal server error" });
    }
})

// fetch all support user specific

router.get("/fetchsupports", fetchuser, upload.any(), async (req, res) => {
    let success = false;
    const { supportId } = req.query;
    try {
        const id = req.user;

        // checking if the user of this supportId is exists or not
        let user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success, message: "User not found" });
        }

        if (supportId) {
            let support = await Support.findById(supportId)
            success = true;
            return res.json({ success, message: support })
        }        
        // fetching supports
        let supports = await Support.find({ phone: user.phone })
        success = true;
        return res.json({ success, message: supports })
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ success, message: "Internal server error" });
    }
})











module.exports = router;