var Web3 = require('web3');
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {

  var config;
  var web3; 
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    web3 = new Web3(Web3.givenProvider);
    await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");

  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

      // Ensure that access is denied for non-Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
            
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

      // Ensure that access is allowed for Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false);
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
      
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

      await config.flightSuretyData.setOperatingStatus(false);

      let reverted = false;
      try 
      {
          await config.flightSurety.setTestingMode(true);
      }
      catch(e) {
          reverted = true;
      }
      assert.equal(reverted, true, "Access not blocked for requireIsOperational");      

      // Set it back for other tests to work
      await config.flightSuretyData.setOperatingStatus(true);

  });

  it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {
    
    // ARRANGE
    let newAirline = accounts[2];
    let firstAirline = accounts[0];
    // ACT
    try {

        await config.flightSuretyData.authorizeCaller(firstAirline, {from: config.owner})
        await config.flightSuretyApp.registerAirline(newAirline, {from: firstAirline});
    }
    catch(e) {

    }
    let result = await config.flightSuretyData.isAirline.call(newAirline); 

    // ASSERT
    assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");

  });

  //Only existing airline may register a new airline until there are at least four airlines registered
  it('perform multi-party concensus mechnaism for registering above 4 flights - no multivote results in failure', async () => {

    //list of airlines to participate in the concensus
    let airline1 = accounts[5];
    let airline2 = accounts[6];
    let airline3 = accounts[7];
    let airline4 = accounts[8];
    let airline5 = accounts[9];

    //the first airline was registered when the Data contract was deployed (owner i.e. accounts[0])
    let firstAirline = accounts[0]; //owner

    //fund first airline
    try {
        await config.flightSuretyApp.fundAirline(firstAirline, {from: firstAirline, value: web3.utils.toWei("10","ether")}); 
    } catch(e) {
        console.log('could not fund first airline!');
    }
    

    //since the first airline is registered and funded, register the new airlines (up to 4 then consensus should start executing)
    try {
        await config.flightSuretyApp.registerAirline(airline1, {from: firstAirline});
        await config.flightSuretyApp.registerAirline(airline2, {from: firstAirline});
        await config.flightSuretyApp.registerAirline(airline3, {from: firstAirline});
        await config.flightSuretyApp.registerAirline(airline4, {from: firstAirline});
    } catch(e) {
        console.log('Error while registering airlines');
    }
    
    //check airlines added successfully. 
    let result1 = await config.flightSuretyData.isAirline.call(airline1); 
    let result2 = await config.flightSuretyData.isAirline.call(airline2); 
    let result3 = await config.flightSuretyData.isAirline.call(airline3); 
    let result4 = await config.flightSuretyData.isAirline.call(airline4);

    //all should be registered except airline4
    assert.equal(result1, true, "Airline 1 should be registered");
    assert.equal(result2, true, "Airline 2 should be registered");
    assert.equal(result3, true, "Airline 3 should be registered");
    assert.equal(result4, false, "Airline 4 should not be registered because of low votes!");
  });


  //Registration of fifth and subsequent airlines requires multi-party consensus of 50% of registered airlines
  it('perform multi-party concensus mechnaism for registering above 4 flights - trying multivote works', async () => {

    
    //list of airlines to participate in the concensus
    let airline1 = accounts[5];
    let airline2 = accounts[6];
    let airline3 = accounts[7];
    let airline4 = accounts[8];

    //the first airline was registered when the Data contract was deployed (owner i.e. accounts[0])
    let firstAirline = accounts[0]; //owner
    
    //continuing on the previous test..

    //check airlines added successfully. 
    let result1 = await config.flightSuretyData.isAirline.call(airline1); 
    let result2 = await config.flightSuretyData.isAirline.call(airline2); 
    let result3 = await config.flightSuretyData.isAirline.call(airline3); 
    let result4 = await config.flightSuretyData.isAirline.call(airline4); 

    //all should be registered except airline4
    assert.equal(result1, true, "Airline 1 should be registered");
    assert.equal(result2, true, "Airline 2 should be registered");
    assert.equal(result3, true, "Airline 3 should be registered");
    assert.equal(result4, false, "Airline 4 should not be registered because of low votes!");

    //now fund airline 1 and try to register airline4 using that. 
    try {
        await config.flightSuretyApp.fundAirline(airline1, {from: airline1, value: web3.utils.toWei("10","ether")}); 
    } catch(e) {
        console.log('could not fund first airline!');
    }
    //try block for registeration
    try { 
        await config.flightSuretyApp.registerAirline(airline4, {from: airline1});
    } catch(e) {
        console.log('Error while registering airlines');
    }

    result4 = await config.flightSuretyData.isAirline.call(airline4);
    assert.equal(result4, true, "Airline 4 should  be registered since passed 50% consensus");
  });



  it('passengers can buy insurance', async () => {

    
    //list of passengers to participate in the test
    let passenger1 = accounts[9];
    let passenger2 = accounts[10];
   

    //the first airline was registered when the Data contract was deployed (owner i.e. accounts[0])
    let firstAirline = accounts[0]; //owner
    
    //continuing on the previous test..

    let flightCode = 'XX0XX';
    let timestamp = 12345678; 
    //now try to register a new flight under first airline
    try {
        await config.flightSuretyApp.registerFlight(firstAirline, flightCode, timestamp, {gas: 5555555}); 
    } catch(e) {
        console.log('could not register flight', flightCode);
    }

    //show balance before buying: 
    //let beforeBalance = await web3.eth.getBalance(passenger1)
    //console.log(beforeBalance);

    let insuranceValue = 1;
    //console.log(web3.utils.toWei(insuranceValue.toString(),"ether"));
    //try block for buying insurance
    try { 
        await config.flightSuretyApp.buy(passenger1, firstAirline, flightCode, timestamp, {value: web3.utils.toWei(insuranceValue.toString(),"ether")});
    } catch(e) {
        console.log('Error while buying insurance', e);
    }

    //show balance after buying: 
    //let afterBalance = await web3.eth.getBalance(passenger1)
    //console.log(afterBalance);
    
    try{
        result = await config.flightSuretyData.isInsured.call(passenger1, firstAirline, flightCode, timestamp);
    } catch(error) {
        console.log('Problem insuring flight!', error);
    }
    
    //insurance payment work //however using the balance in the test environment is not easy.
    //try using the UI to test this functionality 
    //it works and trying to insure the same passenger will log a revert message
    //console.log(result);
    assert.equal(result, true, "Passenger should be insured");

    let policy = null; 
    policy = await config.flightSuretyApp.getInsurancePolicy.call(passenger1,  firstAirline, flightCode, timestamp);
    assert.equal(policy[1].toNumber(), 1000000000000000000, 'Insurance Value should be 1 Ether which is 1000000000000000000 Wei')
    });

  it('passenger get paid 1.5X what they paid if flight delayed (CODE 20)', async () => {

    //the first airline was registered when the Data contract was deployed (owner i.e. accounts[0])
    let firstAirline = accounts[0]; //owner
    let passenger1 = accounts[9];
    //continuing on the previous test..

    let flightCode = 'XX0XX';
    let timestamp = 12345678; 

    try{
        result = await config.flightSuretyData.isInsured.call(passenger1, firstAirline, flightCode, timestamp);
    } catch(error) {
        console.log('Problem insuring flight!', error);
    }
    
    assert(result, "Passenger is not insured!");

    //show balance before: 
    // let beforeBalance = await web3.eth.getBalance(passenger1)
    // console.log(beforeBalance);

    let credits = await config.flightSuretyApp.getCredits.call(passenger1);
    //console.log('credits: ', credits.toNumber());
    assert(credits, 0, 'Passenger should have 0 credits');

    let policy = null; 
    policy = await config.flightSuretyApp.getInsurancePolicy.call(passenger1,  firstAirline, flightCode, timestamp);
    //console.log(policy.toString());
    
    //check if paid or not yet
    let isCredited= await config.flightSuretyData.isPaid(passenger1, firstAirline, flightCode, timestamp);
    assert(!isCredited, "Passenger should not have been paid yet..");
    
    
    //call creditInsurees to check if they will be checked as paid
    await config.flightSuretyData.creditInsurees(firstAirline, flightCode, timestamp);


    isCredited = await config.flightSuretyData.isPaid(passenger1, firstAirline, flightCode, timestamp);
    assert(isCredited, "Passenger should have been paid");

    credits = await config.flightSuretyApp.getCredits.call(passenger1);
    //console.log('credits: ', credits.toString());
    assert(credits, 1500000000000000000, 'Passenger should be credited 1.5 Ether i.e. 1500000000000000000 Wei');

  });

  it('passengers can withdraw the ether that they were credited!', async () => {

    //the first airline was registered when the Data contract was deployed (owner i.e. accounts[0])
    let firstAirline = accounts[0]; //owner
    let passenger1 = accounts[9];
    //continuing on the previous test..

    let flightCode = 'XX0XX';
    let timestamp = 12345678; 

    try{
        result = await config.flightSuretyData.isInsured.call(passenger1, firstAirline, flightCode, timestamp);
    } catch(error) {
        console.log('Problem insuring flight!', error);
    }
    
    assert(result, "Passenger is not insured!");

    let isCredited = await config.flightSuretyData.isPaid(passenger1, firstAirline, flightCode, timestamp);
    assert(isCredited, "Passenger should have been credited");

    //show balance before: 
    //let beforeBalance = await web3.eth.getBalance(passenger1)
    //console.log(beforeBalance);

    let policy = null; 
    policy = await config.flightSuretyApp.getInsurancePolicy.call(passenger1,  firstAirline, flightCode, timestamp);
    //console.log(policy.toString());
    
    //get currently available credits
    let currentCredits = await config.flightSuretyApp.getCredits.call(passenger1);
    //console.log(currentCredits.toNumber());
    assert(currentCredits, 1500000000000000000, 'Passenger should have been credited 1500000000000000000 Wei');
    //withdraw the amount 
    await config.flightSuretyApp.withdraw(passenger1, currentCredits, {from: passenger1});

    currentCredits = await config.flightSuretyApp.getCredits.call(passenger1);
    //console.log(currentCredits.toNumber());

    assert(currentCredits, 0, 'the balance should have been emptied');

    //show balance after buying: 
    //let afterBalance = await web3.eth.getBalance(passenger1)
    //console.log(afterBalance);

  });

});
