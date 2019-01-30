// /backend/records.js
const mongoose=require("mongoose");
const Schema=mongoose.Schema;

// this will be our data base's records structure
const RecordsSchema=new Schema(
	{
		title:String,
		content:String,
	},
	{ timestamps:true }
);

// export the new Schema so we could modify it using Node.js
module.exports=mongoose.model("Records", RecordsSchema);
