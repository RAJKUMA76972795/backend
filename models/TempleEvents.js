const mongoose = require("mongoose");
const { Schema } = mongoose;

const TempleEventsSchema = new Schema({
    templeId: {
        type: String,
        required: true
    },
    date: {
        type: Number,
        required: true,
    },
    title: {
        type: String,
        required: true
    },
    image:{
        type:String,
        default:""
    },
    description: {
        type: String,
        default:""
    },
    shortDescription: {
        type: String,
        required:true
    },



});
const TempleEvents = mongoose.model("templeEvents", TempleEventsSchema);
module.exports = TempleEvents;