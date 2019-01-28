const express=require("express");
const mongoose=require("mongoose");
const bodyParser=require("body-parser");
const path=require("path");

const Time=require("./time");

const app=express();
const router=express.Router();

var schedule=require('node-schedule');

const {promisify}=require('util');
var fs=require('fs');
const readFile=promisify(fs.readFile);

let alarm="07:00";

/******************** google api youtube ********************/
//https://developers.google.com/youtube/v3/quickstart/nodejs
var readline=require('readline');
var {google}=require('googleapis');
var OAuth2=google.auth.OAuth2;

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/wakeHerUp.json
var SCOPES=['https://www.googleapis.com/auth/youtube.readonly'];
var TOKEN_DIR=(process.env.HOME || process.env.HOMEPATH ||
		process.env.USERPROFILE)+'/.credentials/';
var TOKEN_PATH=TOKEN_DIR+'wakeHerUp.json';

// Load client secrets from a local file.
function getYoutube(){
	return new Promise((resolve, reject)=>{
		fs.readFile('client_secret.json', function processClientSecrets(err, content){
			if(err){
				reject('Error loading client secret file:'+err);
			}
			// Authorize a client with the loaded credentials, then call the YouTube API.
			authorize(JSON.parse(content), getChannel, resolve, reject);
		});
	});
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback, resolve, reject){
	var clientSecret=credentials.installed.client_secret;
	var clientId=credentials.installed.client_id;
	var redirectUrl=credentials.installed.redirect_uris[0];
	var oauth2Client=new OAuth2(clientId, clientSecret, redirectUrl);

	// Check if we have previously stored a token.
	fs.readFile("wakeHerUp.json", function(err, token){
		if(err){
			reject('Error loading wakeHerUp file:'+err);
		}
		else{
			oauth2Client.credentials=JSON.parse(token);
			callback(oauth2Client, resolve, reject);
		}
	});
}

/**
 * Lists the names and IDs of up to 10 files.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function getChannel(auth, resolve, reject){
	var service=google.youtube('v3');
	service.channels.list({
		auth:auth,
		part:'contentDetails',
		id:'UCpnZDChii8ilPTOec5BF7Kg'
	}, function(err, response){
		if(err){
			reject('The API returned an error:'+err);
		}
		var channels=response.data.items;
		if(channels.length===0){
			reject('No channel found.');
		}
		else{
			service.playlistItems.list({
				auth:auth,
				part:'snippet',
				playlistId:channels[0].contentDetails.relatedPlaylists.uploads,
				maxResults:8
			}, function(err, response){
				if(err){
					reject('The API(playlistItems) returned an error:'+err);
				}
				var videos=response.data.items;
				if(videos.length===0){
					reject('No video found.');
				}
				else{
					videos.sort((a,b)=>new Date(b.snippet.publishedAt)-new Date(a.snippet.publishedAt));
					let videoIds=[];
					videos.forEach(e=>videoIds.push(e.snippet.resourceId.videoId));
					resolve(videoIds);
				}
			});
		}
	});
}
/******************** google api youtube ********************/


// this is our MongoDB database
const dbRoute="mongodb://dwyanelin:1q2w3e4r@ds149404.mlab.com:49404/asdf";

// connects our back end code with the database
mongoose.connect(
	dbRoute,
	{useNewUrlParser:true}
);

let db=mongoose.connection;

db.once("open", ()=>console.log("connected to the database"));

// checks if connection with the database is successful
db.on("error", console.error.bind(console, "MongoDB connection error:"));

// (optional) only made for logging and
// bodyParser, parses the request body to be a readable json format
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));

app.use(express.static("./client/build/"));

// this is our get method
// this method fetches all available time in our database
router.get("/getTime", (req, res)=>{
	Time.find((err, data)=>{
		if(err) return res.json({success:false, error:err});
		return res.json({success:true, data:data});
	});
});
// this method authorize youtube and get video list
router.get("/getYoutube", (req, res)=>{
	return getYoutube()
	.then(videoIds=>res.json({success:true, videoIds}))
	.catch(error=>console.log("server.router.getYoutube:", error));
});
// this method simply return alarm time
router.get("/getAlarm", (req, res)=>{
	return res.json({success:true, alarm});
});
router.get("/getRecords", (req, res)=>{
	let dirName="records";
	fs.readdir(dirName, async (err, fileNames)=>{
		/*if(err){
			console.log("server.getRecords.readdir:", err);
			return;
		}*/

		if(fileNames===undefined){
			fileNames=[];
		}

		return res.json(
			await Promise.all(fileNames.map(fileName=>
				readFile(dirName+"/"+fileName, "utf8")
				.then(content=>({fileName, content}))
				.catch(error=>console.log("server.getRecords.readFile", error))
			))
			.then(files=>files)
			.catch(error=>console.log("server.getRecords.Promise.all", error))
		);
	});
});
router.get("/getServerTime", (req, res)=>res.json({testAlarm, serverTime:new Date()}));

// this is our create methid
// this method adds new time in our database
router.post("/putTime", (req, res)=>{
	let times=new Time();

	const {time}=req.body;

	times.time=time;
	times.save(err=>{
		if(err) return res.json({success:false, error:err});
		return res.json({success:true});
	});
});

// append /api for our http requests
app.use("/api", router);

app.get("/*", (req, res)=>{
	res.sendFile('index.html', { root: __dirname + '/client/build/' });
});

const port = process.env.PORT || 5000;

let testAlarm="07:00";

// launch our backend into a port
app.listen(port, ()=>{
	console.log(`LISTENING ON PORT ${port}`);

	schedule.scheduleJob("20 10 * * *", async ()=>{
		console.log("asdf");
		testAlarm="00:00";
	})

	//node-schedule
	schedule.scheduleJob('0 59 23 * * *', async ()=>{//second, minute, hour, day of month, month, day of week
		//取
		let times=await Time.find((err, data)=>{//[{time:""}, {time:""}]
			if(err) console.log("server.listen:", err);
			return data;
		});
		//抽
		if(times.length===0){
			alarm="07:00";
		}
		else{
			alarm=times[Math.floor(Math.random()*times.length)].time;
		}
		//寫
		let d=new Date();
		let year=d.getFullYear();
		let month=(d.getMonth()+1)<10?"0"+(d.getMonth()+1):d.getMonth()+1;
		let date=d.getDate()<10?"0"+d.getDate()<10:d.getDate()<10;
		let content=d+"\n";
		content+="選到的時間："+alarm+"\n";
		content+="所有的時間："+times.map(e=>e.time).join(", ")+"\n";
		fs.readdir("records", (err, files)=>{//count records directory files number, to determine file name
			if(files===undefined){//git下如果該資料夾下無檔案，會把資料夾整個刪掉，所以沒檔時要先創資料夾再寫檔
				files=[];
				fs.mkdirSync("records");
			}
			fs.writeFile("records/Day "+(files.length+1)+".txt", content, error=>{
				if(error) throw error;
			});
		});
		//刪
		let deleteMany=await Time.deleteMany({}, error=>{
			if(error) throw error;
		});
	});//run everyday 23:59
	//node-schedule
});
