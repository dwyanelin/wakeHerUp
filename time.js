// /backend/time.js
const mongoose=require("mongoose");
const Schema=mongoose.Schema;

// this will be our data base's time structure
const TimeSchema=new Schema(
	{
		time:String
	},
	{ timestamps:true }
);

// export the new Schema so we could modify it using Node.js
module.exports=mongoose.model("Time", TimeSchema);
