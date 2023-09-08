const mongoose=require("mongoose");
const { Schema } = mongoose;

const PostCommentSchema = new Schema({
  
  postId:{
    type:String ,
    required:true
  },
  userId:{
    type:String,
    required:true
  },
  parentId:{
    type:String,
    default:null
  },
  comment:{
    type:String,
    required:true
  },
  like:{
    type:Array,
    default:[]
  },
  reply:{
    type:Array,
    default:[]
  }
  
});
const PostComment = mongoose.model("postComment",PostCommentSchema);
module.exports = PostComment;