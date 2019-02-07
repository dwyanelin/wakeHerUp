// /client/App.js
import React, {Component} from "react";//react基本配備
import { BrowserRouter as Router, Route, Link } from "react-router-dom";//根據網址顯示不同Component
import axios from "axios";//丟post到server
import YouTube from 'react-youtube';//youtube Component
import YouTubePlayer from 'react-player/lib/players/YouTube';//顯而易見
import Cookies from 'universal-cookie';//投票一天一次

import Alarm from "./Component/Alarm";//鬧鐘影片Component
import Records from "./Component/Records";//讀記錄檔Component

import './css/wakeHerUp.css';//首頁css設定
import Background from './image/background.jpg';//背景圖

const {DateTime}=require("luxon");//判斷輸入isDate

var schedule=require('node-schedule');//排程每天0點getAlarm

function App(){
	return (
		<Router>
			<div>
				<Route exact path="/" component={Home} />
				<Route path="/alarm" component={Alarm} />
				<Route path="/records" component={Records} />
			</div>
		</Router>
	);
}

class Home extends Component{
	state={
		liveId:null,//live時影片的id，每5秒會抓一次，開播時使用者也能迅速看到
		alarm:"",//如果鬧鐘時間還沒到，首頁右上角就會顯示
		hour:"",//投票輸入的小時
		minute:"",//投票輸入的分鐘
		times:[],//投票池所有的時間
		videoIds:[],//每天的紀錄片
		intervalIsSetYoutube:false,//每5秒擷取直播的內容，用來ComponentWillUnmount時clear掉
		intervalIsSet:false,//每秒get DB存取的時間池
	};

	secondPage=React.createRef();//第二頁的ref，按首頁vote會捲動至第二頁

	componentDidMount(){
		this.getLive();//一進頁面0秒get live
		if(!this.state.intervalIsSetYoutube){//開始設interval，5秒後開始循環get live
			let intervalYoutube=setInterval(this.getLive, 5000);
			this.setState({intervalIsSetYoutube:intervalYoutube});
		}

		this.getTimeFromDB();//0秒get time db
		if(!this.state.intervalIsSet){//1秒interval
			let interval=setInterval(this.getTimeFromDB, 1000);
			this.setState({intervalIsSet:interval});
		}

		fetch("/api/getYoutube")//get 紀錄片
		.then(video=>video.json())
		.then(res=>res.videoIds&&this.setState({videoIds:res.videoIds}))
		.catch(error=>console.log("Home.componentDidMount.getYoutube", error));

		fetch("/api/getAlarm")//get server抽好的鬧鐘時間
		.then(res=>res.json())
		.then(res=>this.setState({alarm:res.alarm}))
		.catch(error=>console.log("Home.componentDidMount.getAlarm", error));

		schedule.scheduleJob('0 0 * * *', async ()=>{//second, minute, hour, day of month, month, day of week
			fetch("/api/getAlarm")
			.then(res=>res.json())
			.then(res=>{console.log(res);this.setState({alarm:res.alarm})})
			.catch(error=>console.log("Home.componentDidMount.schedule.getAlarm", error));
		});//每天0點get server新抽的alarm time
	}

	componentWillUnmount(){//離開時，把getLive, getTimeFromDB兩個interval刪掉
		if(this.state.intervalIsSetYoutube){
			clearInterval(this.state.intervalIsSetYoutube);
			this.setState({intervalIsSetYoutube:null});
		}

		if(this.state.intervalIsSet){
			clearInterval(this.state.intervalIsSet);
			this.setState({intervalIsSet:null});
		}
	}

	render(){
		const {liveId, alarm, hour, minute, times, videoIds}=this.state;
		var alarmDateEnd=new Date();//用來計算是否還在鬧鐘時間內，大於下1分鐘0秒才算超過，所以+1
		alarmDateEnd.setUTCHours(alarm.split(":")[0]);//顯示判斷同步英國時間，英國0~7台灣8~15
		alarmDateEnd.setUTCMinutes(+alarm.split(":")[1]+1);//setUTC就是用+0的時區去設定剛好是英國
		alarmDateEnd.setUTCSeconds(0);
		var now=new Date();//跟alarmDateEnd比較
		const opts={//紀錄片尺寸
			height:'246',
			width:'220'
		};
		return (
			<div style={{backgroundImage:`url(${Background})`, backgroundSize:"cover", backgroundAttachment:"fixed", backgroundPosition:"center", display:"flex", flexDirection:"column", alignItems:"center"}}>
				<div style={{minHeight:"100vh", width:970, display:"flex", flexDirection:"column", justifyContent:"center"}} className="narrowScreenWidth narrowScreenBottom">{/*第一頁*/}
					<div style={{marginRight:20, marginBottom:40, textAlign:"right", fontFamily:"helvetica-w01-light,sans-serif", fontSize:73, color:"#fff"}}>{/*上*/}
						{alarm===""?alarm:alarmDateEnd>now?alarm:""}
					</div>{/*上*/}
					<div style={{display:"flex"}} className="narrowScreen">{/*下*/}
						<div style={{flex:1, display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"flex-start"}}>{/*下左*/}
							<div style={{marginBottom:20, fontFamily:"helvetica-w01-bold,sans-serif", fontSize:134, color:"#fff"}} className="narrowScreenTitle">
								<div style={{lineHeight:"0.6em"}}>wake</div>
								<div style={{lineHeight:"0.6em"}}>her up</div>
							</div>
							<div style={{fontFamily:"helvetica-w01-bold,sans-serif", fontSize:20, color:"#fff", marginLeft:10}}>30 days performance</div>
						</div>{/*下左*/}
						<div style={{flex:1, display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"flex-end", width:"100%"}}>{/*下右*/}
							<div style={{width:388, height:390, border:"2px solid #fff", fontFamily:"helvetica-w01-light,sans-serif", fontSize:25, color:"#fff", fontWeight:"bold", marginBottom:20}} className="narrowScreenLive">
								{liveId!==null?<YouTubePlayer
									url={"https://www.youtube.com/watch?v="+liveId}
									playing
									controls
									width="100%"
									height="100%"
								/>
								:(<div style={{paddingTop:195, paddingLeft:20}}><div>Live stream</div>
								<div>starts from</div>
								<div>00:00.</div></div>)}
							</div>
							<a style={{fontFamily:"helvetica-w01-light,sans-serif", fontSize:19, cursor:"pointer", textDecoration:"underline", marginRight:130}} onClick={()=>window.scroll({top:this.secondPage.current.offsetTop, behavior:'smooth'})} className="narrowScreenScroll">Vote when she will be woken ></a>
						</div>{/*下右*/}
					</div>{/*下*/}
				</div>{/*第一頁*/}

				<div style={{minHeight:"100vh", width:970, display:"flex"}} className="narrowScreen narrowScreenWidth narrowScreenBottom" ref={this.secondPage}>{/*第二頁*/}
					<div style={{flex:1, display:"flex", flexDirection:"column", justifyContent:"center", fontFamily:"helvetica-w01-light,sans-serif", fontSize:15, color:"#fff"}}>{/*左*/}
						<span style={{width:242, marginBottom:40}}>Waking up is a private issue for every individual, and by giving away the initiative of deciding when to	wake up to the internet community, truly blends the artist herself into the society, and lets the audiences experience the most intimate dominance over one human being.</span>
						<span style={{width:242, marginBottom:40}}>By programming the automatic-set-up alarm, the artist will be woken without previously knowing when. Once the artist is woken, she can’t return sleeping; if she wakes earlier than the alarm, she has to stay on the bed till the voted time.</span>
						<form style={{display:"flex", justifyContent:"center", alignItems:"center", width:236, height:67, color:"#fff", font:"normal normal 700 30px/1.4em helvetica-w01-light,sans-serif", border:"2px solid #fff"}} ref="form">{/*左下*/}
							<input
								type="text"
								onChange={e=>{
									this.setState({hour:e.target.value});
									if(e.target.value.length===2){
										this.refs.minute.focus();
									}
								}}
								placeholder={minute===""?"Type":""}
								style={{border:0, backgroundColor:"inherit", textAlign:"right", color:"#fff", font:"normal normal 700 30px/1.4em helvetica-w01-light,sans-serif", width:107, height:67}}
								maxLength="2"
								ref="hour"
								onKeyDown={e=>{
									if(e.keyCode===39&&e.target.selectionStart===hour.length){//Right Arrow
										setTimeout(()=>{
											this.refs.minute.focus();
										}, 1);
									}
									if(e.keyCode===13){//enter
										this.refs.minute.focus();
									}
								}}
							/>
							<span onClick={()=>this.refs.hour.focus()} style={{height:67, display:"flex", alignItems:"center"}}>&nbsp;:&nbsp;</span>
							<input
								type="text"
								onChange={e=>this.setState({minute:e.target.value})}
								placeholder={hour===""?"here":""}
								style={{border:0, backgroundColor:"inherit", textAlign:"left", color:"#fff", font:"normal normal 700 30px/1.4em helvetica-w01-light,sans-serif", width:107, height:67}}
								maxLength="2"
								ref="minute"
								onKeyDown={e=>{
									if(e.keyCode===37&&e.target.selectionStart===0){//Left Arrow
										setTimeout(()=>{
											this.refs.hour.focus();
										}, 1);
									}
									if(e.keyCode===13){
										this.addTime();
									}
									if(e.keyCode===8&&e.target.selectionStart===0){//back
										setTimeout(()=>{
											this.refs.hour.focus();
										}, 1);
									}
								}}
							/>
						</form>{/*左下*/}
						<span style={{width:242}}>Valid time period: 00:00 - 07:00</span>
					</div>{/*左*/}
					<div style={{flex:1, display:"flex", alignItems:"center"}}>{/*右*/}
						<ul className="wideScreenTime narrowScreenTime">
							{times.length>0&&times.map((e, i)=>(
								<li className="narrowScreenTime" style={{paddingInlineStart:70, color:"#fff", fontFamily:"helvetica-w01-light,sans-serif", fontSize:51, lineHeight:"0.9em"}} key={i}>
									{e.time}
								</li>
							))}
						</ul>
					</div>{/*右*/}
				</div>{/*第二頁*/}

				<div style={{minHeight:"100vh", width:970, display:"flex", flexDirection:"column", justifyContent:"center"}} className="narrowScreenWidth">{/*第三頁*/}
					<div style={{fontFamily:"helvetica-w01-light,sans-serif", fontSize:16, color:"#fff", lineHeight:"1.3em", marginBottom:40}}>{/*上*/}
						Video record from the first day to 30th.
					</div>{/*上*/}
					<div style={{display:"flex", justifyContent:"space-between", flexWrap:"wrap"}}>{/*下*/}
						{videoIds.length>0&&videoIds.map((e, i)=>(
							<div style={{width:220, height:246, border:"2px solid #fff", marginBottom:20}}>
								<YouTube videoId={e} opts={opts} onError={error=>console.log(error)} key={i}/>
							</div>
						))}
					</div>{/*下*/}
					<div style={{alignSelf:"flex-end", margin:20, fontFamily:"helvetica-w01-light,sans-serif", fontSize:16, display:"flex", justifyContent:"space-between", alignItems:"center", width:260}}><a href="https://www.yihsinchu.com/" target="_blank" style={{color:"#fff", textDecoration:"none"}}>https://www.yihsinchu.com/</a><a href="https://www.instagram.com/yihsin_chu/?hl=ja" target="_blank"><img src={require("./image/instagram.png")} style={{width:50, height:50}}/></a></div>
				</div>{/*第三頁*/}
			</div>
		);
	}

	getLive=()=>{//需要直播者的channelId和開發者的google api key
		fetch("https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=UCpnZDChii8ilPTOec5BF7Kg&eventType=live&type=video&key=AIzaSyACeRvnmXJ_fD8AA0da-nJ-Vv4e6ExRL-8")
		.then(res=>res.json())
		.then(result=>{
			if(result.items.length>0){
				this.setState({liveId:result.items[0].id.videoId});
			}
		});
	};

	getTimeFromDB=()=>{//叫server get mLab online mongoDB的time pool
		fetch("/api/getTime")
		.then(time=>time.json())
		.then(res=>res.data&&this.setState({times:res.data}));
	};

	addLock=false;//不連續觸發投票submit
	addTime=async e=>{
		if(this.addLock===true){//連續滾
			return;
		}
		this.addLock=true;//lock
		var {hour, minute}=this.state;

		//validate time
		if(hour===""||minute===""||isNaN(hour)||isNaN(minute)){
			this.addLock=false;
			return;
		}
		hour=+hour;
		minute=+minute;
		var d=DateTime.fromObject({hour, minute});
		if(d.isValid===false){
			this.addLock=false;
			return;
		}
		if(hour>7||(hour===7&&minute>0)){//The valid time range to input is from 00:00 am to 07:00 am.
			this.addLock=false;
			return;
		}
		//validate time

		//formalize
		if(hour<10){
			hour="0"+hour;
		}
		if(minute<10){
			minute="0"+minute;
		}
		var time=hour+":"+minute;
		//formalize

		const cookies = new Cookies();//一天一次
		var alreadyAdd=cookies.get('alreadyAdd');
		if(alreadyAdd===undefined){//今天還沒加
			let result=await axios.post("/api/putTime", {time});
			if(result.data.success===true){
				var expires=new Date();//設定明天0點到期的cookie，讓使用者明天才能再投
				expires.setDate(expires.getDate()+1);//明天
				expires.setHours(0, 0, 0, 0);//Date.setHours(hour, min, sec, millisec)
				cookies.set('alreadyAdd', true, {path:'/', expires});
				this.addLock=false;
			}
			else{//未知失敗情況，解鎖讓使用者繼續加
				this.addLock=false;
			}
		}
		else{//加了滾
			this.addLock=false;
		}
	}
}

export default App;
