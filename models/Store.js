const mongoose=require("mongoose");
const { Schema } = mongoose;

const StoreSchema = new Schema({
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
  mapLink:{
    type:String,
    default:""
  },
  location:{
    type:String,
    default:""
  },
  distance:{
    type:String,
    default:""
  }
  
});
const Store = mongoose.model("store",StoreSchema);
module.exports = Store;