const mongoose=require("mongoose");
const { Schema } = mongoose;

const TempleSchema = new Schema({

 name:{
    type:String,
    required:true,
    unique:true
 },
 location:{
    type:String ,
    required:true
 },
 title:{
   type:String ,
   required:true
},
 description:{
    type:String ,
    default:""
 },
 images:{
    type:Array,
    default:[]
 } ,
 
 events:{
   type:Array,
   default:[]
 },
 hotels:{
   type:Array,
   default:[]
 },
 shareLink:{
   type:String,
   default:""
 }
  
});
const Temple = mongoose.model("temple",TempleSchema);
module.exports = Temple;