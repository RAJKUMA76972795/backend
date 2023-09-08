const mongoose=require("mongoose");
const { Schema } = mongoose;

const PostSchema = new Schema({

  templeId:{
    type:String,
    required:true
  },
  postModerator:{
    type:String,
    default:""
  },
  
  text:{
    type:String ,
    default:""
  },
  link:{
    type:String,
    default:""
  },
  file:{
    type:Array,
    default:[]
  },
  isText:{
    type:Boolean,
    default:false
  },
  isLink:{
    type:Boolean,
    default:false
  },
  isFile:{
    type:Boolean,
    default:false
  },
  like:{
    type:Array,
    default:[]
  },
  comment:{
    type:Array,
    default:[]
  },
  share:{
    type:Array,
    default:[]
  },

  reaction:{
    type:Array,
    default:[]
  },
  createdAt:{
    type:Number,
    default:new Date().getTime()
  },
  updatedAt:{
    type:Number,
    default:new Date().getTime()
  }
  
});
const Post = mongoose.model("post",PostSchema);
module.exports = Post;