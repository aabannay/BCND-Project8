import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';
import { callbackify } from 'util';


let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyData = new web3.eth.Contract(FlightSuretyData.abi, config.dataAddress)
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress, flightSuretyData.address);

//status codes for oracle responses. 
const STATUS_CODE_UNKNOWN = 0;
const STATUS_CODE_ON_TIME = 10;
const STATUS_CODE_LATE_AIRLINE = 20;
const STATUS_CODE_LATE_WEATHER = 30;
const STATUS_CODE_LATE_TECHNICAL = 40;
const STATUS_CODE_LATE_OTHER = 50;


//a list that will contain the registered oracles: 
let registeredOracles = [];
let indexes = []; 
// //the below function is registering oracles to the blockchain
async function registerOracles() {
  //first get the accounts that we want to register oracles with: 
  let accounts = await web3.eth.getAccounts();
  console.log(accounts);

  //get the registeration fee
  let regFee = await flightSuretyApp.methods.REGISTRATION_FEE.call({from: accounts[0]});
  console.log(`Registeration Fee: ${regFee}`);

  //then go and regster the oracles from account 14 to account 39


  for (let i=14; i<accounts.length; i++)  {
    try {
      //console.log('here1');
      flightSuretyApp.methods.registerOracle().send({value: regFee, from: accounts[i], gas:5555555});
      //console.log('here');
      indexes = await flightSuretyApp.methods.getMyIndexes().call({from: accounts[i]});
      registeredOracles.push([accounts[i], indexes]);
      //console.log(indexes);
      //console.log(registeredOracles);
    } catch(e) {
      console.log(`ERROR: could not register oracle: ${accounts[i]}`, e);
    }
  }
  setTimeout(async() => { }, 3000);
}

registerOracles();

flightSuretyApp.events.OracleReport({
  fromBlock: "latest"
}, (error, event) => {
  if (error) console.log(error);
  console.log(event);

})

flightSuretyApp.events.FlightStatusInfo({
  fromBlock: "latest"
}, (error, event) => {
  //console.log(event);
});

flightSuretyApp.events.OracleRequest({
    fromBlock: "latest"
  }, function (error, event) {
    if (error) console.log(error);
    //console.log(event)
    let index = event.returnValues.index; 
    let airline = event.returnValues.airline; 
    let flight = event.returnValues.flight; 
    let timestamp = event.returnValues.timestamp; 
    let status = Math.floor(Math.random() * 5) * 10;  //get random status [0,10,20,30,40,50]
    console.log(`Oracle Request was submitted with the following:
    Index: ${index}
    Airline: ${airline}
    Flight: ${flight}
    Time: ${new Date(timestamp*1000)}
    Status: ${status}`);

    //now make an oracle response from here...
    try {
      for (let i=0; i<registeredOracles.length; i++) {
        //console.log(oracle);
        let indexes = registeredOracles[i][1];
        //console.log(indexes);
        for (let j=0; j< indexes.length; j++) {
          if(indexes[j] == index) {
            console.log(`match ${index} ${indexes[j]}`);
            //try to submit an oracle response
            try {
              flightSuretyApp.methods.submitOracleResponse
              (
                  index,
                  airline,
                  flight,
                  timestamp,
                  status
              ).send({from: registeredOracles[i][0]/* the address of the oracle */, gas: 5555555});
            } catch(e) {
              console.log('ERROR trying to submit oracle response!', e);
            }
          } else {
            //console.log('no match');
          }
        }
      }
    } catch(e) {
      console.log('ERROR while trying to submit oracle response',e);
    }
});


const app = express();
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})

export default app;


