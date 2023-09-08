const mongoose=require("mongoose");
const { Schema } = mongoose;

const PushNotificationSchema = new Schema({
  topic:{
    type:String,
    required:true
  },
  
  title:{
    type:String,
    required:true
  },

  body:{
    type:String,
    required:true
  },

  time:{
    type:Number,
    required:true
  },
  isSent:{
    type:Boolean,
    default:true
  }

 
  
});
const PushNotification = mongoose.model("pushNotification",PushNotificationSchema);
module.exports = PushNotification;