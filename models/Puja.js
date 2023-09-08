const mongoose=require("mongoose");
const { Schema } = mongoose;

const PujaSchema = new Schema({
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
const Puja = mongoose.model("puja",PujaSchema);
module.exports = Puja;