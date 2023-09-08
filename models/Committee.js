const mongoose=require("mongoose");
const { Schema } = mongoose;

const CommitteeSchema = new Schema({
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
const Committee = mongoose.model("committee",CommitteeSchema);
module.exports = Committee;