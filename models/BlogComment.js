const mongoose=require("mongoose");
const { Schema } = mongoose;

const BlogCommentSchema = new Schema({
  
  blogId:{
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
const BlogComment = mongoose.model("blogComment",BlogCommentSchema);
module.exports = BlogComment;