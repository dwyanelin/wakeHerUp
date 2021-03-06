import React, {Component} from "react";

export default class Records extends Component{
	state={
		records:[],
	};

	componentDidMount(){
		/*fetch("/api/getRecords")
		.then(res=>res.json())
		.then(res=>this.setState({files:res}))
		.catch(error=>console.log("records.componentDidMount.getRecords", error));*/

		fetch("/api/getRecordsOnline")
		.then(res=>res.json())
		.then(res=>this.setState({records:res.data}))
		.catch(error=>console.log("records.componentDidMount.getRecordsOnline", error));
	}

	render(){
		return (
			<div>
				{this.state.records.map((e, i)=>(
					<div style={{margin:10, fontFamily:"helvetica-w01-light,sans-serif"}} key={i}>
						<h1>{e.title}</h1>
						<p>{e.content.split("\n").map((e,i)=>e!==""&&<div key={i}>{e}</div>)}</p>
					</div>
				))}
			</div>
		);
	}
}
