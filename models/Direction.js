const mongoose=require("mongoose");
const { Schema } = mongoose;

const DirectionSchema = new Schema({

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
  }
  
});
const Direction = mongoose.model("direction",DirectionSchema);
module.exports = Direction;