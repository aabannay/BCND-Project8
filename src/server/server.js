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
      let indexes = await flightSuretyApp.methods.getMyIndexes().call({from: accounts[i]});
      console.log(indexes);
    } catch(e) {
      console.log(`ERROR: could not register oracle: ${accounts[i]}`, e);
    }
  }
  setTimeout(() => {}, 3000);
    
}

registerOracles();

flightSuretyApp.events.OracleRequest({
    fromBlock: 0
  }, function (error, event) {
    if (error) console.log(error)
    //console.log(event)
});

const app = express();
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})

export default app;


