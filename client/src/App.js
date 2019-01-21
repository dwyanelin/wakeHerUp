// /client/App.js
import React, {Component} from "react";
import axios from "axios";
import YouTube from 'react-youtube';//https://www.npmjs.com/package/react-youtube
import Cookies from 'universal-cookie';

import './css/wakeHerUp.css';
import Background from './image/background.jpg';

const {DateTime} = require("luxon");

var schedule=require('node-schedule');

class App extends Component {
	// initialize our state
	state={
		alarm:"",
		hour:"",
		minute:"",
		times:[],
		videoIds:[],
		intervalIsSet:false,
	};

	// when component mounts, first thing it does is fetch all existing time in our db
	// then we incorporate a polling logic so that we can easily see if our db has
	// changed and implement those changes into our UI
	componentDidMount() {
		this.getTimeFromDB();
		if (!this.state.intervalIsSet) {
			let interval=setInterval(this.getTimeFromDB, 1000);
			this.setState({intervalIsSet:interval});
		}

		fetch("/api/getYoutube")
			.then(video=>video.json())
			.then(res=>res.videoIds&&this.setState({videoIds:res.videoIds}))
			.catch(error=>console.log("App.componentDidMount.getYoutube", error));

		fetch("/api/getAlarm")
			.then(res=>res.json())
			.then(res=>this.setState({alarm:res.alarm}))
			.catch(error=>console.log("App.componentDidMount.getAlarm", error));

		schedule.scheduleJob('5 * * * * *', async ()=>{//second, minute, hour, day of month, month, day of week
			fetch("/api/getAlarm")
				.then(res=>res.json())
				.then(res=>{console.log(res);this.setState({alarm:res.alarm})})
				.catch(error=>console.log("App.componentDidMount.schedule.getAlarm", error));
		});//run everyday 00:00
	}

	// never let a process live forever
	// always kill a process everytime we are done using it
	componentWillUnmount() {
		if (this.state.intervalIsSet) {
			clearInterval(this.state.intervalIsSet);
			this.setState({intervalIsSet:null});
		}
	}

	// here is our UI
	// it is easy to understand their functions when you
	// see them render into our screen
	render() {
		const {alarm, hour, minute, times, videoIds}=this.state;
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
			<div style={{backgroundImage:`url(${Background})`, backgroundSize:"100vw", backgroundAttachment:"fixed", backgroundPosition:"center", display:"flex", flexDirection:"column", alignItems:"center"}}>
				<div style={{height:"100vh", width:970, display:"flex", flexDirection:"column", justifyContent:"center"}}>{/*第一頁*/}
					<div style={{marginRight:20, marginBottom:40, textAlign:"right", fontFamily:"helvetica-w01-light,sans-serif", fontSize:73, color:"#fff"}}>{/*上*/}
						{alarm===""?alarm:alarmDateEnd>now?alarm:""}
					</div>{/*上*/}
					<div style={{display:"flex"}}>{/*下*/}
						<div style={{flex:1, display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"flex-start"}}>{/*下左*/}
							<div style={{marginBottom:20, fontFamily:"helvetica-w01-bold,sans-serif", fontSize:134, color:"#fff"}}>
								<div style={{lineHeight:"0.6em"}}>wake</div>
								<div style={{lineHeight:"0.6em"}}>her up</div>
							</div>
							<div style={{fontFamily:"helvetica-w01-bold,sans-serif", fontSize:20, color:"#fff", marginLeft:10}}>30 days performance</div>
						</div>{/*下左*/}
						<div style={{flex:1, display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"flex-end"}}>{/*下右*/}
							<div style={{width:368, height:195, border:"2px solid #fff", fontFamily:"helvetica-w01-light,sans-serif", fontSize:25, color:"#fff", fontWeight:"bold", paddingTop:195, paddingLeft:20, marginBottom:20}}>
								<div>Live stream</div>
								<div>starts from</div>
								<div>00:00.</div>
							</div>
							<a style={{fontFamily:"helvetica-w01-light,sans-serif", fontSize:19, cursor:"pointer", textDecoration:"underline", marginRight:130}}>Vote when she will be woken ></a>
						</div>{/*下右*/}
					</div>{/*下*/}
				</div>{/*第一頁*/}

				<div style={{height:"100vh", width:970, display:"flex"}}>{/*第二頁*/}
					<div style={{flex:1, display:"flex", flexDirection:"column", justifyContent:"center", fontFamily:"helvetica-w01-light,sans-serif", fontSize:15, color:"#fff"}}>{/*左*/}
						<span style={{width:242, marginBottom:40}}>Waking up is a private issue for every individual, and by giving away the initiative of deciding when to  wake up to the internet community, truly blends the artist herself into the society, and lets the audiences experience the most intimate dominance over one human being.</span>
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
						<ul style={{paddingInlineStart:70}}>
							{times.length>0&&times.map((e, i)=>(
								<li style={{color:"#fff", fontFamily:"helvetica-w01-light,sans-serif", fontSize:51, lineHeight:"0.9em"}} key={i}>
									{e.time}
								</li>
							))}
						</ul>
					</div>{/*右*/}
				</div>{/*第二頁*/}

				<div style={{minHeight:"100vh", width:970, display:"flex", flexDirection:"column", justifyContent:"center"}}>{/*第三頁*/}
					<div style={{fontFamily:"helvetica-w01-light,sans-serif", fontSize:16, color:"#fff", lineHeight:"1.3em", marginBottom:40}}>{/*上*/}
						Video record from the first day to 30th.
					</div>{/*上*/}
					<div style={{display:"flex", justifyContent:"space-between", flexWrap:"wrap"}}>{/*下*/}
						{videoIds.length>0&&videoIds.map((e, i)=>(
							<div style={{width:220, height:246, border:"2px solid #fff", marginBottom:20}}>
								<YouTube videoId={e} opts={opts} onError={error=>console.log(error)} key={i}/>
								{/*<div style={{fontFamily:"helvetica-w01-light,sans-serif", fontSize:25, color:"#fff", fontWeight:"bold"}}>Day {i+1}</div>
								<div style={{fontFamily:"helvetica-w01-light,sans-serif", fontSize:25, color:"#fff", fontWeight:"bold"}}>{alarm}</div>存每天的候選人跟選上的，然後抓出來顯示在這，還要做紀錄新頁面*/}
							</div>
						))}
					</div>{/*下*/}
				</div>{/*第三頁*/}
			</div>
		);
	}

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
		////var alreadyAdd=cookies.get('alreadyAdd');console.log(alreadyAdd);
		var alreadyAdd=undefined;
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
