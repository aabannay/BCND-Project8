pragma solidity ^0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false
    mapping(address => uint256) authorizedCallers;                      //contract authorized callers (to limit function calls)
    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor
                                (
                                    //address theFirstAirline
                                ) 
                                public
    {
        contractOwner = msg.sender;
        //register the first airline (This will be done once only)
        //since the registeration of airline must happen through an airline
        //and the registeration method can only be called by a registered airline
        
        //airlines[theFirstAirline].isRegistered = true;
        
        //however the first airline has not not paid funds yet. 
        //airlines[theFirstAirline].paidFund = false; 
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier isAuthorizedCaller()
    {
        require(authorizedCallers[msg.sender] == 1, "Caller is not authorized");
        _;
    }
    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() 
                            public 
                            view 
                            returns(bool) 
    {
        return operational;
    }


    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus
                            (
                                bool mode
                            ) 
                            external
                            requireContractOwner 
    {
        operational = mode;
    }

    function authorizeCaller(address addressToAuthorize) external requireContractOwner
    {
        authorizedCallers[addressToAuthorize] = 1; 
    }

    function deauthorizeCaller(address addressToAuthorize) external requireContractOwner
    {
        delete authorizedCallers[addressToAuthorize];
    }
    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    struct Airline {
        bool paidFund;
        bool isRegistered; 
    }
    
    mapping(address => Airline) airlines; 

    modifier requirePaidFund(address airlineAddress)
    {
        require(airlines[airlineAddress].paidFund, "Airline has not paid fund to participate");
        _;
    } 

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function registerAirline
                            (  
                                address callingAirline, 
                                address newAirline 
                            )
                            external
                            requireIsOperational()
                            isAuthorizedCaller()
                            requirePaidFund(callingAirline)
                            returns (bool result)
    {
        //ensure the airline you are trying to register is not a registered airline
        require(!airlines[newAirline].isRegistered, "The airline you are trying to register is a registered airline");
        //now rigester the airline
        airlines[newAirline].isRegistered = true; 
        //however this airline has not paid fund yet. 
        airlines[newAirline].paidFund = false; 

        //return the value of registeration 
        return airlines[newAirline].isRegistered;
    }

    //this function will fund an airline
    function fundAirline 
                        (
                            address airline
                        )
                        external
                        requireIsOperational()
                        isAuthorizedCaller()
    {
        //ensure the airline you are trying to fund is  a registered airline
        require(airlines[airline].isRegistered, "The airline you are trying to fund is not registered airline");
        //fund the airline
        airlines[airline].paidFund = true; 
    }


    //flight key to insuree address
    mapping(bytes32 => address[]) private flightToInsureeMap; 

    //key of insuree and details to the policy of insurance
    mapping(bytes32 => InsurancePolicy) private insurances; 

    struct InsurancePolicy {
        bool isInsured; 
        uint256 insuranceValue; 
        bool gotPaid; 
    }

    modifier requireIsNotInsured(
                                    address insuree, 
                                    address airline, 
                                    string flight, 
                                    uint256 timeOfFlight
                                )
    {
        require(!isInsured(insuree, airline, flight, timeOfFlight), "Passenger already insured");
        _;
    } 
    
    function isInsured(
                        address insuree, 
                        address airline, 
                        string flight, 
                        uint256 timeOfFlight

                    )
                    returns (bool result)
    {
        bytes32 insuranceSignature = keccak256(abi.encodePacked(insuree, airline, flight, timeOfFlight));
        return insurances[insuranceSignature].isInsured;
    }
   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buy
                            (  
                                address insuree, //potential insuree
                                address airline, //addressOfAirline
                                string flight,  //this is the code of the flight
                                uint256 timeOfFlight, //timestamp of the flight
                                uint256 insuranceValue   //this is the amount the potential insuree is welling to pay.
                            )
                            external
                            payable
                            requireIsOperational()
                            isAuthorizedCaller()
                            requireIsNotInsured(insuree, airline, flight, timeOfFlight) //we need to check that this caller has not bought insurance already
    {
        //first the airline must be a rigestered airline
        require(airlines[airline].isRegistered, "The airline is not registered");
        //the check of the flights existance is done on the app contract 
        
        //get the signature of the current insurance policy 
        bytes32 insuranceSignature = keccak256(abi.encodePacked(insuree, airline, flight, timeOfFlight));

        //create a new insurance policy and add it to insuraces list. 
        InsurancePolicy storage policy = insurances[insuranceSignature];
        policy.insuranceValue = insuranceValue; 
        policy.isInsured = true; 

        //now save it in the map of flight to insuree
        flightToInsureeMap[getFlightKey(airline, flight, timeOfFlight)].push(insuree); 

    }

    modifier requireIsInsured(
                                    address insuree, 
                                    address airline, 
                                    string flight, 
                                    uint256 timeOfFlight
                                )
    {
        require(isInsured(insuree, airline, flight, timeOfFlight), "Passenger is not insured");
        _;
    } 

    //cridets of insuees 
    mapping(address => uint256) cridets; 

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees
                                (
                                    address insuree, 
                                    address airline, 
                                    string flight, 
                                    uint256 timeOfFlight
                                )
                                external
                                requireIsOperational()
                                isAuthorizedCaller()
                                requireIsInsured(insuree, airline, flight, timeOfFlight)
                                returns (bool result)
    {
        //check if the insuree has not been paid yet
        bytes32 insuranceSignature = keccak256(abi.encodePacked(insuree, airline, flight, timeOfFlight));
        require(!insurances[insuranceSignature].gotPaid);

        //since the insuree is not paid change the value
        insurances[insuranceSignature].gotPaid = true; 

        //then make the action
        //first calc the value to be paid
        uint256 valueToPay = insurances[insuranceSignature].insuranceValue.div(10).mul(15);
        //then add it to the cridets of this insuree
        cridets[insuree] = cridets[insuree].add(valueToPay);

        return insurances[insuranceSignature].gotPaid; 
    }
    

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay
                            (
                                address insuree, 
                                uint256 amount
                            )
                            external
                            requireIsOperational()
                            isAuthorizedCaller()
    {
        //check if the contract has enough funds to pay the insuree
        require(address(this).balance >= amount, "There are no enough funds to pay in the contract");

        //check if the required amount is available to the insuree
        require(cridets[insuree] >= amount, "Passer do not have enough cridet");

        //subtract the cridets
        cridets[insuree] = cridets[insuree].sub(amount); 

        //pay the amount 
        insuree.transfer(amount);
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */   
    function fund
                            (   
                            )
                            public
                            payable
    {
    }

    function getFlightKey
                        (
                            address airline,
                            string memory flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function() 
                            external 
                            payable 
    {
        fund();
    }


}

