const mongoose=require("mongoose");
const { Schema } = mongoose;

const BluePrintSchema = new Schema({
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
const BluePrint = mongoose.model("bluePrint",BluePrintSchema);
module.exports = BluePrint;