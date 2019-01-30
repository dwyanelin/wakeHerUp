const express=require("express");//nodejs標準後端controller，其自稱middleWare
const mongoose=require("mongoose");//用來連接mLab online mongoDB
const bodyParser=require("body-parser");//不知用途

const Time=require("./time");//time pool db
const Records=require("./records");//lottery db

const app=express();//express initialize
const router=express.Router();//感覺多此一舉的東西，但影響不大就留著吧

var schedule=require('node-schedule');//每天routine做事

//可以await fs.readFile，再return get到的值，原本的fs.readFile是asynchronous
const {promisify}=require('util');
var fs=require('fs');
const readFile=promisify(fs.readFile);
//可以await fs.readFile，再return get到的值，原本的fs.readFile是asynchronous

let alarm="07:00";//全域鬧鐘預設值

/******************** google api youtube authentication ********************/
//https://developers.google.com/youtube/v3/quickstart/nodejs
var {google}=require('googleapis');
var OAuth2=google.auth.OAuth2;

//先認證再get channel再get videoIds，傳回前端.map show每個紀錄片
function getYoutube(){
	return new Promise((resolve, reject)=>{//自製promise，讓express可以等到結果再res.json()
		//讀clientSecrets檔，之於google的client也就是我們，用google帳號向google api申請的專屬憑證
		fs.readFile('client_secret.json', function processClientSecrets(err, content){
			if(err){
				reject('Error loading client secret file:'+err);
			}
			//將憑證、認證完要執行的getChannel callback、promise傳給認證function
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
 * @param {Object} promise.
 */
function authorize(credentials, callback, resolve, reject){
	var clientSecret=credentials.installed.client_secret;
	var clientId=credentials.installed.client_id;
	var redirectUrl=credentials.installed.redirect_uris[0];
	var oauth2Client=new OAuth2(clientId, clientSecret, redirectUrl);//google認證api

	//讀取預先認證過的access token檔
	//正常第一次要先貼上網址，登入確認允許，輸入認證碼，才能取得access token
	//local cmd先做好，把access token檔上傳到server，讓server可以直接用。但隱私問題還要想想
	fs.readFile("wakeHerUp.json", function(err, token){
		if(err){
			reject('Error loading wakeHerUp file:'+err);
		}
		else{
			oauth2Client.credentials=JSON.parse(token);//確認client secrets跟google核可的access token一樣
			callback(oauth2Client, resolve, reject);//接續執行getChannel，將google認證還有promise傳入
		}
	});
}

/**
 * get youtube channel then get videoIds.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 * @param {Object} promise.
 */
function getChannel(auth, resolve, reject){
	var service=google.youtube('v3');
	service.channels.list({
		auth:auth,//認證
		part:'contentDetails',//想取得的資料類型，決定youtube回傳多少data catagories
		id:'UCpnZDChii8ilPTOec5BF7Kg'//Yihsin user ID
	}, function(err, response){
		if(err){
			reject('The API returned an error:'+err);
		}
		var channels=response.data.items;//get channel資料
		if(channels.length===0){
			reject('No channel found.');
		}
		else{
			service.playlistItems.list({
				auth:auth,
				part:'snippet',//決定讓youtube回傳特定catagory，其他不需要
				playlistId:channels[0].contentDetails.relatedPlaylists.uploads,//此channel上傳的playlistId
				maxResults:31//一個月的量全部flexWrap顯示
			}, function(err, response){
				if(err){
					reject('The API(playlistItems) returned an error:'+err);
				}
				var videos=response.data.items;//get all video
				if(videos.length===0){
					reject('No video found.');
				}
				else{
					//出版日期排序，因youtube給的順序不對
					videos.sort((a,b)=>new Date(b.snippet.publishedAt)-new Date(a.snippet.publishedAt));
					let videoIds=[];
					videos.forEach(e=>videoIds.push(e.snippet.resourceId.videoId));//抓出id
					resolve(videoIds);//回傳
				}
			});
		}
	});
}
/******************** google api youtube authentication ********************/


//mLab MongoDB database url
const dbRoute="mongodb://dwyanelin:1q2w3e4r@ds149404.mlab.com:49404/asdf";

//connect
mongoose.connect(
	dbRoute,
	{useNewUrlParser:true}
);
let db=mongoose.connection;
db.once("open", ()=>console.log("connected to the database"));
db.on("error", console.error.bind(console, "MongoDB connection error:"));
//connect

// (optional) only made for logging and
// bodyParser, parses the request body to be a readable json format
//不懂
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));
//不懂

//前端能從網址公開取得的靜態檔
app.use(express.static("./client/build/"));

//前端fetch get時間池
router.get("/getTime", (req, res)=>{
	Time.find((err, data)=>{
		if(err) return res.json({success:false, error:err});
		return res.json({success:true, data:data});
	});
});
//get youtube videoIds
router.get("/getYoutube", (req, res)=>{
	return getYoutube()
	.then(videoIds=>res.json({success:true, videoIds}))
	.catch(error=>console.log("server.router.getYoutube:", error));
});
//get全域alarm變數
router.get("/getAlarm", (req, res)=>{
	return res.json({success:true, alarm});
});
//記錄頁get抽獎紀錄檔，全部讀檔後promise才回傳
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
//get mLab online mongoDB抽獎紀錄
router.get("/getRecordsOnline", (req, res)=>{
	Records.find((error, data)=>{
		if(error) return res.json({success:false, error});
		return res.json({success:true, data:data});
	});
});

//insert new time document
router.post("/putTime", (req, res)=>{
	let times=new Time();

	const {time}=req.body;

	times.time=time;
	times.save(err=>{
		if(err) return res.json({success:false, error:err});
		return res.json({success:true});
	});
});

//覺得很多餘的地方
app.use("/api", router);

//deploy的用法，package.json.scripts.start是heroku預設使用的開啟指令
//package.json.scripts.heroku-postbuild是push到heroku時執行的指令，主要是install and build前端
////還需要加入開發時免preBuild的code，並判斷是否為dev mode
app.get("/*", (req, res)=>{
	res.sendFile('index.html', {root:__dirname+'/client/build/'});
});

const port=process.env.PORT||5000;//express預設

//將後端連接到port上，前端就可以透過ip:port連接，買url就可以轉到此ip:port
app.listen(port, ()=>{
	console.log(`LISTENING ON PORT ${port}`);

	//node-schedule，每天23:59分執行取時間池、抽、存紀錄檔、刪時間池的動作
	schedule.scheduleJob('59 23 * * *', async ()=>{//second, minute, hour, day of month, month, day of week
		//取
		let times=await Time.find((error, data)=>{//[{time:""}, {time:""}]
			if(error) console.log("server.listen.Time.find:", error);
			return data;
		});
		//抽
		if(times.length===0){//邊緣人沒人投票就預設7點鬧鐘
			alarm="07:00";
		}
		else{//隨機抽
			alarm=times[Math.floor(Math.random()*times.length)].time;
		}
		//寫
		let d=new Date();
		let year=d.getFullYear();
		let month=(d.getMonth()+1)<10?"0"+(d.getMonth()+1):d.getMonth()+1;
		let date=d.getDate()<10?"0"+d.getDate()<10:d.getDate()<10;
		let content=d+"\n";//紀錄檔第一行，Date全名
		content+="選到的時間："+alarm+"\n";//第二行中獎時間
		content+="所有的時間："+times.map(e=>e.time).join(", ")+"\n";//第三行獎金池

		//存mLab online mongoDB
		let records=await Records.find((error, data)=>{//[{title:"", content:""}, ...]
			if(error) console.log("server.listen.Records.find:", error);
			return data;
		});//抓紀錄DB看記錄到第幾天了
		let dayOrder=records.length+1;//現實世界lize
		records=new Records();//開始準備存
		records.title="Day "+dayOrder;//標題第幾天
		records.content=content;//內容如上
		records.save(error=>{//存
			if(error) throw error;
		});
		//存mLab online mongoDB

		//存檔案
		fs.readdir("records", (error, files)=>{//files count determine file name(Day order)
			if(error) throw error;
			fs.writeFile("./records/Day "+(files.length)+".txt", content, error=>{//寫檔
				if(error) throw error;
			});
		});
		//存檔案

		//刪
		let deleteMany=await Time.deleteMany({}, error=>{
			if(error) throw error;
		});
	});//run everyday 23:59
	//node-schedule
});
