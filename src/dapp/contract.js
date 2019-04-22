import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.WebsocketProvider(config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress, config.dataAddress);
        //initialize data app
        this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);
        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.passengers = [];
        this.flights = [];
        this.appAddress = config.appAddress;
    }

    initialize(callback) {
        this.web3.eth.getAccounts(async (error, accts) => {
            let self = this;
            this.owner = accts[0];
            await this.flightSuretyData.methods.authorizeCaller(this.appAddress).send({
                "from":this.owner
            }, (err, x) => {
                if (!err) {
                    let counter = 1;

                    while(this.airlines.length < 5) {
                        this.airlines.push({
                            address: accts[counter++],
                            isRegstered: false,
                            isPaid: false
                        });
                    }
                    console.log(this.airlines);

                    while(this.passengers.length < 5) {
                        this.passengers.push({
                            address: accts[counter++]
                        });
                    }
                    console.log(this.passengers);

                    // register random flights, one for each airline
                    for (let i=0; i <5; i++){
                        this.flights.push({
                            airline: this.airlines[i],
                            code: `XX${i}XX`,
                            timestamp: 123456789
                        });
                    }
                    console.log('here');
                    console.log(this.flights);

                    //first register App Contract as an authorized caller.

                    callback();
                }

            });
        });
    }

    isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, callback);
    }

    fetchFlightStatus(flight, callback) {
        let self = this;
        let payload = {
            airline: flight.airline.address,
            flight: flight.code,
            timestamp: Math.floor(Date.now() / 1000)
        } 
        console.log('payload',payload);
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.owner}, (error, result) => {
                callback(error, payload);
            });
    }

    //buying an insurance
    buy(flight) {
        let insuranceValue = DOM.ethAmount.value; 
        if (insuranceValue) {
            //accepted ether value of 1 Ether only!\
            if (insuranceValue > 1) {
                console.log('insurance value cannot be more than 1 Ether!');
                return; 
            } else {
                //call the contract buy method
                this.flightSuretyApp.methods.buy(flight, )
            }
        //not known insurance value
        } else {
            console.log('insurance value needs to be defined!');
            return; 
        }
    }
}