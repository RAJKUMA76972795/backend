const mongoose=require("mongoose");
const { Schema } = mongoose;

const UserSchema = new Schema({
  
  phone:{
    type:String,
    required:true
  },
  name:{
    type:String ,
    default:""
  },
  image:{
    type:String,
    default:""
  },
  birthDate:{
    type:Date,
    default:0
  },
  isVerified:{
    type:Boolean,
    default:false
  },
  blogs:{
    type:Array,
    default:[]
  },
  pushToken:{
    type:String,
    default:""
  },
  subscribedTopics:{
    type:Array,
    default:[]
  },
  
  date:{
    type:Date,
    default:Date.now
  },
  isAdmin:{
    type:Boolean,
    default:false
  }
  
});
const User = mongoose.model("user",UserSchema);
module.exports = User;