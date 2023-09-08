const mongoose=require("mongoose");
const { Schema } = mongoose;

const PushTopicSchema = new Schema({
  name:{
    type:String,
    required:true
  },
  
  subscribers:{
    type:Array,
    default:[]
  },
 
  
});
const PushTopic = mongoose.model("pushTopic",PushTopicSchema);
module.exports = PushTopic;