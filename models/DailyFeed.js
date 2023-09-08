const mongoose=require("mongoose");
const { Schema } = mongoose;

const DailyFeedSchema = new Schema({
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
  date: {
    type: Number,
    required: true,
},
  
});
const DailyFeed = mongoose.model("dailyFeed",DailyFeedSchema);
module.exports = DailyFeed;