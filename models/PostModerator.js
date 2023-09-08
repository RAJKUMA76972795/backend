const mongoose=require("mongoose");
const { Schema } = mongoose;

const PostModeratorSchema = new Schema({

  templeId:{
    type:String,
    required:true
  },
  userId:{
    type:String,
    required:true
  }
  
});
const PostModerator = mongoose.model("postModerator",PostModeratorSchema);
module.exports = PostModerator;