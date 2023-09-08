const mongoose=require("mongoose");
const { Schema } = mongoose;

const FamilySchema = new Schema({
  
  userId:{
    type:String,
    required:true
  },
  name:{
    type:String ,
    required:true,
    unique:true
  },
  birthDate:{
    type:Date,
    required:true
  },
  gender:{
    type:String,
    required:true
  },
  relation:{
    type:String,
    required:true
  },
  location:{
    type:String,
    required:true
  },
  gotra:{
    type:String,
    required:true
  },
  
  date:{
    type:Date,
    default:Date.now
  }
  
});
const Family = mongoose.model("family",FamilySchema);
module.exports = Family;