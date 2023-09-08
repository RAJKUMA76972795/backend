const mongoose=require("mongoose");
const { Schema } = mongoose;

const TimingSchema = new Schema({
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
const Timing = mongoose.model("timing",TimingSchema);
module.exports = Timing;