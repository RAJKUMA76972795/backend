const mongoose=require("mongoose");
const { Schema } = mongoose;

const WelcomeSchema = new Schema({

 heading:{
    type:String,
    required:true
 },
 description:{
    type:String ,
    default:""
 },
 image:{
    type:String,
    default:""
 }
  
});
const Welcome = mongoose.model("welcome",WelcomeSchema);
module.exports = Welcome;