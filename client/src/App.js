// /client/App.js
import React, {Component} from "react";
import { BrowserRouter as Router, Route, Link } from "react-router-dom";
import axios from "axios";
import YouTube from 'react-youtube';//https://www.npmjs.com/package/react-youtube
import YouTubePlayer from 'react-player/lib/players/YouTube';
import Cookies from 'universal-cookie';

import './css/wakeHerUp.css';
import Background from './image/background.jpg';

const {DateTime} = require("luxon");

var schedule=require('node-schedule');

function App(){
	return (
		<Router>
			<div>
				<Route exact path="/" component={Home} />
				<Route path="/alarm" component={alarm} />
				<Route path="/records" component={records} />
			</div>
		</Router>
	);
}

class alarm extends Component{
	state={
		alarm:"",
		url:null,
		playing:false,
		seconds:0,
	};

	componentDidMount(){
		fetch("/api/getServerTime")
		.then(res=>res.json())
		.then(res=>console.log(res))
		.catch(error=>console.log(error));

		const {seconds}=this.state;

		//get alarm clock when entering the alarm page.
		fetch("/api/getAlarm")
		.then(res=>res.json())
		.then(res=>{
			console.log(res);
			this.setState({alarm:res.alarm});
			let temp=res.alarm.split(":");
			let hour=+temp[0];
			let minute=+temp[1];
			let d=new Date();
			let dAlarm=new Date();
			dAlarm.setHours(hour);//設定今天鬧鐘時間
			dAlarm.setMinutes(minute);
			if(dAlarm>d){//鬧鐘時間比較大=時間未到，再設定到時候開播youtube，過了就別設定了，不然會馬上響
				setTimeout(()=>{
					this.youtube.seekTo(28);
					this.setState({playing:true});
				}, dAlarm-d);
			}
		})
		.catch(error=>console.log("Home.componentDidMount.getAlarm", error));

		//get new alarm clock every midnight.
		schedule.scheduleJob('8 13 * * *', async ()=>{//second, minute, hour, day of month, month, day of week
			fetch("/api/getAlarm")
			.then(res=>res.json())
			.then(res=>{
				console.log(res);
				this.setState({alarm:res.alarm});
				let temp=res.alarm.split(":");
				let hour=+temp[0];
				let minute=+temp[1];
				let d=new Date();
				let dAlarm=new Date();
				dAlarm.setHours(13);//設定今天鬧鐘時間
				dAlarm.setMinutes(9);
				//如果剛好回傳比較慢，又抽到例如00:00，setTimeout負的時間就會馬上執行
				setTimeout(()=>{
					this.youtube.seekTo(28);
					this.setState({playing:true});
				}, dAlarm-d);
			})
			.catch(error=>console.log("Home.componentDidMount.schedule.getAlarm", error));
		});

		//get new alarm clock every midnight.
		schedule.scheduleJob('0 0 * * *', async ()=>{//second, minute, hour, day of month, month, day of week
			fetch("/api/getAlarm")
			.then(res=>res.json())
			.then(res=>{
				console.log(res);
				this.setState({alarm:res.alarm});
				let temp=res.alarm.split(":");
				let hour=+temp[0];
				let minute=+temp[1];
				let d=new Date();
				let dAlarm=new Date();
				dAlarm.setHours(hour);//設定今天鬧鐘時間
				dAlarm.setMinutes(minute);
				//如果剛好回傳比較慢，又抽到例如00:00，setTimeout負的時間就會馬上執行
				setTimeout(()=>{
					this.youtube.seekTo(28);
					this.setState({playing:true});
				}, dAlarm-d);
			})
			.catch(error=>console.log("Home.componentDidMount.schedule.getAlarm", error));
		});
	}

	render(){
		const {url, playing, seconds}=this.state;
		return (
			<div style={{display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"center", fontFamily:"helvetica-w01-bold,sans-serif", margin:50}}>
				<div style={{width:640, height:360, backgroundColor:"rgba(0,0,0,.1)"}}>
					<YouTubePlayer
						ref={ref=>this.youtube=ref}
						url={"https://www.youtube.com/watch?v=LDU_Txk06tM"}
						playing={playing}
						controls
						width="100%"
						height="100%"
						onPlay={()=>this.setState({playing:true})}
						onPause={()=>this.setState({playing:false})}
						onEnded={()=>this.setState({playing:false})}
					/>
				</div>
				{/*<div style={{margin:10}}>
					<span>Control </span>
					<button onClick={()=>this.setState({playing:!playing})}>{playing?'Pause':'Play'}</button>
				</div>

				<div style={{margin:10}}>
					<span>Url </span>
					<input ref={ref=>{this.url=ref}} type='text' placeholder='Enter url' style={{width:400}}/>
					<button onClick={()=>{
						this.setState({url:this.url.value, playing:false});
						this.youtube.seekTo(28);
					}}>Load</button>
				</div>

				<div style={{margin:10}}>
					<span>Seconds </span>
					<input ref={ref=>{this.seconds=ref}} type='text' placeholder='Enter seconds' style={{width:100}}/>
					<button onClick={()=>this.setState({seconds:parseFloat(this.seconds.value)})}>Set</button>
				</div>

				<div style={{margin:10}}>
					<span>Now {seconds}</span>
				</div>*/}
			</div>
		);
	}
}

class records extends Component{
	state={
		files:[],
	};

	componentDidMount(){
		fetch("/api/getRecords")
		.then(res=>res.json())
		.then(res=>this.setState({files:res}))
		.catch(error=>console.log("records.componentDidMount.getRecords", error));
	}

	render(){
		return (
			<div>
				{this.state.files.map((e, i)=>(
					<div style={{margin:10, fontFamily:"helvetica-w01-light,sans-serif"}} key={i}>
						<h1>{e.fileName}</h1>
						<p>{e.content.split("\n").map((e,i)=>e!==""&&<div key={i}>{e}</div>)}</p>
					</div>
				))}
			</div>
		);
	}
}

class Home extends Component{
	state={
		liveId:null,
		alarm:"",
		hour:"",
		minute:"",
		times:[],
		videoIds:[],
		intervalIsSetYoutube:false,
		intervalIsSet:false,
	};

	secondPage=React.createRef();

	componentDidMount(){
		fetch("/api/getServerTime")
		.then(res=>res.json())
		.then(res=>console.log(res))
		.catch(error=>console.log(error));

		this.getLive();
		if(!this.state.intervalIsSetYoutube){
			let intervalYoutube=setInterval(this.getLive, 5000);
			this.setState({intervalIsSetYoutube:intervalYoutube});
		}

		this.getTimeFromDB();
		if(!this.state.intervalIsSet){
			let interval=setInterval(this.getTimeFromDB, 1000);
			this.setState({intervalIsSet:interval});
		}

		fetch("/api/getYoutube")
		.then(video=>video.json())
		.then(res=>res.videoIds&&this.setState({videoIds:res.videoIds}))
		.catch(error=>console.log("Home.componentDidMount.getYoutube", error));

		fetch("/api/getAlarm")
		.then(res=>res.json())
		.then(res=>this.setState({alarm:res.alarm}))
		.catch(error=>console.log("Home.componentDidMount.getAlarm", error));

		schedule.scheduleJob('0 0 * * *', async ()=>{//second, minute, hour, day of month, month, day of week
			fetch("/api/getAlarm")
			.then(res=>res.json())
			.then(res=>{console.log(res);this.setState({alarm:res.alarm})})
			.catch(error=>console.log("Home.componentDidMount.schedule.getAlarm", error));
		});//run everyday 00:00
	}

	componentWillUnmount(){
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
		var alarmDateEnd=new Date();
		alarmDateEnd.setHours(alarm.split(":")[0]);
		alarmDateEnd.setMinutes(+alarm.split(":")[1]+1);
		alarmDateEnd.setSeconds(0);
		var now=new Date();
		const opts={
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
							<div style={{marginBottom:20, fontFamily:"helvetica-w01-bold,sans-serif", fontSize:134, color:"#fff"}}>
								<div style={{lineHeight:"0.6em"}}>wake</div>
								<div style={{lineHeight:"0.6em"}}>her up</div>
							</div>
							<div style={{fontFamily:"helvetica-w01-bold,sans-serif", fontSize:20, color:"#fff", marginLeft:10}}>30 days performance</div>
						</div>{/*下左*/}
						<div style={{flex:1, display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"flex-end"}}>{/*下右*/}
							<div style={{width:388, height:390, border:"2px solid #fff", fontFamily:"helvetica-w01-light,sans-serif", fontSize:25, color:"#fff", fontWeight:"bold", marginBottom:20}}>
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
							<a style={{fontFamily:"helvetica-w01-light,sans-serif", fontSize:19, cursor:"pointer", textDecoration:"underline", marginRight:130}} onClick={()=>window.scrollTo({top:this.secondPage.current.offsetTop, behavior:'smooth'})}>Vote when she will be woken ></a>
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

	getLive=()=>{
		fetch("https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=UCpnZDChii8ilPTOec5BF7Kg&eventType=live&type=video&key=AIzaSyACeRvnmXJ_fD8AA0da-nJ-Vv4e6ExRL-8")
		.then(res=>res.json())
		.then(result=>{
			if(result.items.length>0){
				this.setState({liveId:result.items[0].id.videoId});
			}
		});
	};

	getTimeFromDB=()=>{
		fetch("/api/getTime")
		.then(time=>time.json())
		.then(res=>res.data&&this.setState({times:res.data}));
	};

	addLock=false;
	addTime=async e=>{
		if(this.addLock===true){
			return;
		}
		this.addLock=true;
		var {hour, minute}=this.state;

		//validate time
		if(hour===""||minute===""){
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

		const cookies = new Cookies();
		var alreadyAdd=cookies.get('alreadyAdd');
		if(alreadyAdd===undefined){//今天還沒加
			let result=await axios.post("/api/putTime", {time});
			if(result.data.success===true){
				var expires=new Date();
				expires.setDate(expires.getDate()+1);//明天
				expires.setHours(0, 0, 0, 0);//midnight
				cookies.set('alreadyAdd', true, {path:'/', expires});
				this.addLock=false;
			}
			else{
				this.addLock=false;
			}
		}
		else{
			this.addLock=false;
		}
	}
}

export default App;
