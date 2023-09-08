const mongoose=require("mongoose");
const { Schema } = mongoose;

const HotelSchema = new Schema({

  templeId:{
    type:String,
    required:true,
  },
  name:{
    type:String,
    required:true,
  },
  description:{
    type:String,
    default:"",
  },
  images:{
    type:Array,
    default:[]
  },
  templeName:{
    type:String,
    required:true
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
const Hotel = mongoose.model("hotel",HotelSchema);
module.exports = Hotel;