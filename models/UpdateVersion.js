const mongoose=require("mongoose");
const { Schema } = mongoose;

const UpdateVersionSchema = new Schema({
  publishedDate:{
    type:Number,
    required:true
  },
  version:{
    type:String,
    required:true
  },
  description:{
    type:String ,
    default:""
  },
  
});
const UpdateVersion = mongoose.model("updateVersion",UpdateVersionSchema);
module.exports = UpdateVersion;