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
        this.accounts= [];
    }

    initialize(callback) {
        this.web3.eth.getAccounts(async (error, accts) => {
            let self = this;
            this.owner = accts[0];
            this.accounts = accts; 
            //initialize the blockchain with airlines
            
            await this.flightSuretyData.methods.authorizeCaller(this.appAddress).send({
                "from":this.owner
            }, (err, x) => {
                if (!err) {
                    
                    //counter starting from 0 here because the first registered airline when the contract was created is accounts[0] i.e. the owner of the contract. 
                    let counter = 0;
                    console.log(this.accounts);
                    while(this.airlines.length < 2 /* only the first airline and another airline that will be registered and funded below */) {
                        this.airlines.push({
                            address: accts[counter++],
                            isRegstered: false,
                            isPaid: false
                        });
                    }
                    //console.log(this.airlines);

                    while(this.passengers.length < 5 /* Doesn't have to match airlines */) {
                        this.passengers.push({
                            address: accts[counter++]
                        });
                    }
                    //console.log(this.passengers);

                    // register random flights, one for each airline
                    for (let i=0; i <2 /* match the number of airlines */; i++){
                        this.flights.push({
                            airline: this.airlines[i],
                            code: `XX${i}XX`,
                            timestamp: 123456789
                        });
                    }
                    this.fund(accts[0],(error, result) => {
                        if(error) {
                            console.log(error);
                        } else {
                            console.log(`funded ${accts[0]} successfully`, result);
                            self.airlines[0].isRegstered = true; 
                            self.airlines[0].isPaid = true; 
                        }
                    });
                    
                    //now start registering the remaining airlines and flights

                    //register airlines (airlines have accounts[1-5])
                    

                    //for (let i=0; i <airlines.length; i++) {
                    //for was problematic to be used with the async code so I decided to do this manually. 
                        console.log('inside for');
                        let self=this; 

                        //since airlines[0] has been registered and funded now do the rest
                        //register airlines[1]
                        this.registerAirline(self.airlines[1].address, accts[0], (error, result) => {
                            if(error) {
                                console.log(`Could not register airline ${self.airlines[1].address}`, error);
                            } else {
                                console.log(`Registered airline ${self.airlines[1].address} successfully`, result);
                                self.airlines[1].isRegstered = true;
                            }
                        });
                        // found airlines[1]
                        this.fund(self.airlines[1].address,(error, result) => {
                            if(error) {
                                console.log(error);
                            } else {
                                console.log(`funded ${self.airlines[1].address} successfully`, result);
                                self.airlines[1].isPaid = true; 
                            }
                        });

                        /* //COMMENTED OUT ADDING OF THE REST OF THE AIRLINES
                           //this was due to the ocmplication of handling multi-votes prior to funding an airline. 
                        //airlines[1]
                        this.registerAirline(self.airlines[1].address, accts[0], (error, result) => {
                            if(error) {
                                console.log(`Could not register airline ${self.airlines[1].address}`, error);
                            } else {
                                console.log(`Registered airline ${self.airlines[1].address} successfully`, result);
                            }
                        });

                        //airlines[2]
                        this.registerAirline(self.airlines[2].address, accts[0], (error, result) => {
                            if(error) {
                                console.log(`Could not register airline ${self.airlines[2].address}`, error);
                            } else {
                                console.log(`Registered airline ${self.airlines[2].address} successfully`, result);
                            }
                        });

                        //airlines[3]
                        this.registerAirline(self.airlines[3].address, accts[0], (error, result) => {
                            if(error) {
                                console.log(`Could not register airline ${self.airlines[3].address}`, error);
                            } else {
                                console.log(`Registered airline ${self.airlines[3].address} successfully`, result);
                            }
                        });

                        //airlines[4]
                        this.registerAirline(self.airlines[4].address, accts[0], (error, result) => {
                            if(error) {
                                console.log(`Could not register airline ${self.airlines[4].address}`, error);
                            } else {
                                console.log(`Registered airline ${self.airlines[4].address} successfully`, result);
                            }
                        });
                        */
                    //}

                    //register the flights associated with airlines

                    //flight 1 for airline 0
                    try {
                        this.registerFlight(self.flights[0].airline.address, self.flights[0].code, self.flights[0].timestamp, (error, result) => {
                            if (error) {
                                console.log(`Couldn't register flight ${self.flights[0].code}`, error);
                            } else {
                                console.log(`Registered flight ${self.flights[0].code} successfully.`, result);
                            }
                        })
    
                        //flight 1 for airline 1 
                        this.registerFlight(self.flights[1].airline.address, self.flights[1].code, self.flights[1].timestamp, (error, result) => {
                            if (error) {
                                console.log(`Couldn't register flight ${self.flights[1].code}`, error);
                            } else {
                                console.log(`Registered flight ${self.flights[1].code} successfully.`, result);
                            }
                        })
                    } catch (e) {
                        console.log(e);
                    }  
                }
                callback();
            });
        });
    }
 
    //this method is used to register an airlines
    registerAirline(address, account, callback) {
        let self = this; 
        self.flightSuretyApp.methods.registerAirline(address).send({from: self.owner, gas: 5555555}, (error, result) =>{
            callback(error, result);
        });
    }
    //this method is used to fund the airlines.
    fund(address, callback){
        let self = this; 
        self.flightSuretyApp.methods.fundAirline(address).send({from: address, value: self.web3.utils.toWei("10","ether")}, (err, result) => {
            callback(err, result);
        });
    }

    //this method is used to register a flight 
    registerFlight(airline, flightCode, timeOfFlight, callback) {
        let self = this; 
        self.flightSuretyApp.methods.registerFlight(airline, flightCode, timeOfFlight)
                                    .send({from: self.owner, gas: 5555555},
                                    (error, result) => {
                                        callback(error, result);
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
            timestamp: flight.timestamp/*Math.floor(Date.now() / 1000)*/
        } 
        //console.log('payload',payload);
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.owner}, (error, result) => {
                callback(error, payload);
            });
    }

    //buying an insurance
    buy(passenger, airline, flight, timestamp, value, callback) {
        let insuranceValue = value; 
        if (insuranceValue) {
            //accepted ether value of 1 Ether only!
            if (insuranceValue > 1) {
                console.log('insurance value cannot be more than 1 Ether!');
                return; 
            } else {
                let self = this; 
                let insuree = passenger; 
                //call the contract buy method
                try {
                    console.log('Wei value: ',this.web3.utils.toWei(insuranceValue,"ether"));
                    self.flightSuretyApp.methods.buy(insuree, airline, flight, timestamp, this.web3.utils.toWei(insuranceValue,"ether"))
                                            .send({from: insuree, value: this.web3.utils.toWei(insuranceValue,"ether"), gas:5555555 },
                                            (error, result) => {
                                                callback(error, result);
                                            });
                } catch(e) {
                    console.log(e);
                }
            }
        //not known insurance value
        } else {
            console.log('insurance value needs to be defined!');
            return; 
        }
    }
}