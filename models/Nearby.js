const mongoose=require("mongoose");
const { Schema } = mongoose;

const NearbySchema = new Schema({

  templeId:{
    type:String,
    required:true
  },
  title:{
    type:String,
    required:true
  },

  images:{
    type:Array,
    default:[]
  },
  description:{
    type:String ,
    default:""
  },
  
});
const Nearby = mongoose.model("nearby",NearbySchema);
module.exports = Nearby;