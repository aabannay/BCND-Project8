
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {

  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
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
        await config.flightSuretyApp.fundAirline(firstAirline, {from: firstAirline, value: 10}); 
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
        await config.flightSuretyApp.fundAirline(airline1, {from: airline1, value: 10}); 
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
});
