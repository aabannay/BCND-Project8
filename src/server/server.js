import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';
import { callbackify } from 'util';
import { resolvePtr } from 'dns';


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

function initializeAccounts() {
  return new Promise((resolve, reject) => {
    web3.eth.getAccounts().then(accounts => {
      console.log(accounts);
      resolve(accounts);
    }).catch(error => {
      reject(error);
    });
  });
}

function initializeOracles(accounts) {
  return new Promise((resolve, reject) => {
    let oracles = [];
    console.log('here');
    flightSuretyApp.methods.REGISTRATION_FEE().call({from: accounts[0]}).then(regFee => {
      console.log('Registeration Fee: ',regFee);
      let accList = accounts.slice(15);
      let loopLength = accList.length; 
      accList.forEach(account => {
        console.log(account);
        flightSuretyApp.methods.registerOracle().send({
          "from": account,
          "value": regFee,
          "gas": 5555555
      }).then(() => {
          flightSuretyApp.methods.getMyIndexes().call({
            "from": account
        }).then(indexes => {
            console.log(indexes);
            oracles.push([account, indexes]);
            //console.log(oracles);
            console.log(1);
            loopLength -= 1;
            if (!loopLength) {
                resolve(oracles);
            }
          }).catch(error => {
            reject(error);
        });
      }).catch(error => {
        reject(error);
      });
    });
    }).catch(error => {
      reject(error);
    });
});
}
initializeAccounts().then(accounts => {
  initializeOracles(accounts).then(oracles => {
    console.log(oracles);
    console.log(0);
    
    //request event
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

      //now respond if oracles match index 
      oracles.forEach(oracle => {
        console.log(oracle);
        if (oracle[1][0] == index || oracle[1][1] == index || oracle[1][2] == index) {
          console.log(`match`);
          flightSuretyApp.methods.submitOracleResponse
              (
                  index,
                  airline,
                  flight,
                  timestamp,
                  status
              ).send({from: oracle[0]/* the address of the oracle */, gas: 5555555}).then(result => {
                console.log('XXXX');
                //console.log(1);
                //console.log(result);
              }).catch(error => {
                console.log(error);
              });
        }
      });
  });
}).catch(error => {
  console.log(error);
});
}).catch(error => {
  console.log(error);
})

const app = express();
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp'
    })
})

export default app;