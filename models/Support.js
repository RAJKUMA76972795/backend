const mongoose=require("mongoose");
const { Schema } = mongoose;

const SupportSchema = new Schema({

  name:{
    type:String,
    required:true,
  },
  phone:{
    type:String,
    required:true,
  },
  title:{
    type:String,
    required:true
  },
  query:{
    type:String ,
    required:true
  },
  image:{
    type:String,
    default:""
  },
  pending:{
    type:Boolean,
    default:true
  },
  replies:{
    type:Array,
    default:[]
  }
  
  
});
const Support = mongoose.model("support",SupportSchema);
module.exports = Support;