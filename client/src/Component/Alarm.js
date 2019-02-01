import React, {Component} from "react";
import YouTubePlayer from 'react-player/lib/players/YouTube';

var schedule=require('node-schedule');

export default class Alarm extends Component{
	state={
		alarm:"",
		url:null,
		playing:false,
		seconds:0,
	};

	componentDidMount(){
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
						loop
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
