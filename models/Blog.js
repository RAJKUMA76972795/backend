const mongoose=require("mongoose");
const { Schema } = mongoose;

const BlogSchema = new Schema({

  slug:{
    type:String,
    required:true,
    unique:true
  },
  title:{
    type:String,
    required:true,
    unique:true
  },
  content:{
    type:String ,
    default:""
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
  date:{
    type:Number,
    required:true
  },
  image:{
    type:String,
    default:""
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
const Blog = mongoose.model("blog",BlogSchema);
module.exports = Blog;