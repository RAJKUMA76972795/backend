const mongoose=require("mongoose");
const { Schema } = mongoose;

const AdditionalInfoSchema = new Schema({
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
const AdditionalInfo = mongoose.model("additionalInfo",AdditionalInfoSchema);
module.exports = AdditionalInfo;