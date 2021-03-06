pragma solidity ^0.4.25;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp {
    using SafeMath for uint256; // Allow SafeMath functions to be called for all uint256 types (similar to "prototype" in Javascript)

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    // Flight status codees
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    address private contractOwner;          // Account used to deploy contract

    struct Flight {
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp;        
        address airline;
    }
    mapping(bytes32 => Flight) private flights;

 
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
         // Modify to call data contract's status
        require(isOperational(), "Contract is currently not operational");  
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

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    FlightSuretyData flightSuretyData;      //data contract

    /**
    * @dev Contract constructor
    *
    */
    constructor
                                (
                                    address dataContract
                                ) 
                                public 
    {
        contractOwner = msg.sender;
        flightSuretyData = FlightSuretyData(dataContract);
        //the constructur registered an airline already 
        registeredAirlinesCount = 1; 
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function isOperational() 
                            public 
                            view 
                            returns(bool) 
    {
        //get the operational status from the data contract
        return flightSuretyData.isOperational();
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/


    //constant for the number of flight to be registered without the need for voting
    uint256 private REGISTER_WITHOUT_VOTING_LIMIT = 4; 
    
    //number of airlines registered so far
    uint256 private registeredAirlinesCount; 
    
    //mapping between airlines voting 
    mapping(address => address[]) private votes; 

   /**
    * @dev Add an airline to the registration queue
    *
    */   
    function registerAirline
                            (   
                                address newAirline
                            )
                            external
                            requireIsOperational()
                            returns(bool success, uint256 votesCount)
    {
        bool resultOfRegisteration = false;
        votesCount = 0; 
        //checking if airline is registered already to call and the new airline is not registered is done at the data contract side. 
        //check if you would need to go through the voting or not
        if(registeredAirlinesCount < REGISTER_WITHOUT_VOTING_LIMIT) {
            resultOfRegisteration = flightSuretyData.registerAirline(msg.sender, newAirline);
        } else { //voting is required
            //check for votes that are doblicated
            bool isDoublicate = false;
            for (uint i=0; i < votes[newAirline].length; i++) {
                if(votes[newAirline][i] == msg.sender) {
                    isDoublicate = true;
                }
                break; //found out that the registering airline already voted!
            }
            //if it was doublicate then exit 
            require(!isDoublicate, "Double votes are not allowed!");

            //otherwise add the vote to the list of votes 
                votes[newAirline].push(msg.sender);

                //now check if you reached the consensus (50%)
                if (votes[newAirline].length >= registeredAirlinesCount.div(2)) {
                    resultOfRegisteration = flightSuretyData.registerAirline(msg.sender, newAirline);
                }
            
        }

        //if an airline is registered increase the count of reigstered airlines. 
        if (resultOfRegisteration) {
            registeredAirlinesCount = registeredAirlinesCount.add(1);
        }

        return (resultOfRegisteration, votesCount);
    }


   /**
    * @dev Register a future flight for insuring.
    *
    */  
    function registerFlight
                                (
                                    address airline,
                                    string flightCode, 
                                    uint256 timeOfFlight
                                )
                                external
                                requireIsOperational()
    {
        //check
        require(flightSuretyData.checkAirlineValidity(airline), "Invalid Airline"); 

        //TODO check the time is in the future?

        bytes32 flightKey = keccak256(abi.encodePacked(airline, flightCode, timeOfFlight));
        flights[flightKey] = Flight ({
        isRegistered: true,
        statusCode: 0,
        updatedTimestamp: timeOfFlight,     
        airline: airline});
    }
    
   /**
    * @dev Called after oracle has updated flight status
    *
    */  
    function processFlightStatus
                                (
                                    address airline,
                                    string memory flight,
                                    uint256 timestamp,
                                    uint8 statusCode
                                )
                                internal
                                requireIsOperational()
    {
        if(statusCode == STATUS_CODE_LATE_AIRLINE) {
            flightSuretyData.creditInsurees(airline, flight, timestamp);
        }
    }


    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus
                        (
                            address airline,
                            string flight,
                            uint256 timestamp                            
                        )
                        external
    {
        uint8 index = getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp));
        oracleResponses[key] = ResponseInfo({
                                                requester: msg.sender,
                                                isOpen: true
                                            });

        emit OracleRequest(index, airline, flight, timestamp);
    } 

    //method to call fund
    function fundAirline(
                            address airline
                        )
                        external
                        payable
                        requireIsOperational()
    {
        flightSuretyData.fundAirline.value(msg.value) (airline);
    }

    function buy(
                address insuree, 
                address airline, 
                string flight, 
                uint256 timeOfFlight
            )
            external
            payable
            requireIsOperational()
    {
        require(msg.value <= 1 ether, 'Ether value should be "1 Ether" or less.');
        flightSuretyData.buy(insuree, airline, flight, timeOfFlight, msg.value);
    }


    function getInsurancePolicy(
                                address insuree, 
                                address airline, 
                                string flight, 
                                uint256 timeOfFlight
                                )
                                requireIsOperational()
                                returns (bool, uint256, bool)
    {
        bool isInsured; 
        uint256 value; 
        bool gotPaid; 

        (isInsured, value, gotPaid) = flightSuretyData.getInsurancePolicy(insuree, airline, flight, timeOfFlight);
        return (isInsured, value, gotPaid);
    }

    function getCredits(
                         address insuree
                        )
                        returns (uint256)
    {
        uint256 value; 
        value = flightSuretyData.getCredits(insuree);
        return value; 
    }

    function withdraw(
                        address insuree,
                        uint256 amount
                    )
                    requireIsOperational()
    {
        require(msg.sender == insuree, 'Withdraw should be performed by insuree address!');
        flightSuretyData.pay(insuree, amount);
    } 
// region ORACLE MANAGEMENT

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;    

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;


    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;        
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester;                              // Account that requested status
        bool isOpen;                                    // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses;          // Mapping key is the status code reported
                                                        // This lets us group responses and identify
                                                        // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(address airline, string flight, uint256 timestamp, uint8 status);

    event OracleReport(address airline, string flight, uint256 timestamp, uint8 status);

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(uint8 index, address airline, string flight, uint256 timestamp);


    // Register an oracle with the contract
    function registerOracle
                            (
                            )
                            external
                            payable
    {
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({
                                        isRegistered: true,
                                        indexes: indexes
                                    });
    }

    function getMyIndexes
                            (
                            )
                            view
                            external
                            returns(uint8[3])
    {
        require(oracles[msg.sender].isRegistered, "Not registered as an oracle");

        return oracles[msg.sender].indexes;
    }




    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse
                        (
                            uint8 index,
                            address airline,
                            string flight,
                            uint256 timestamp,
                            uint8 statusCode
                        )
                        external
    {
        require((oracles[msg.sender].indexes[0] == index) || (oracles[msg.sender].indexes[1] == index) || (oracles[msg.sender].indexes[2] == index), "Index does not match oracle request");


        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp)); 
        require(oracleResponses[key].isOpen, "Flight or timestamp do not match oracle request");

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);
        if (oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES) {

            emit FlightStatusInfo(airline, flight, timestamp, statusCode);

            // Handle flight status as appropriate
            processFlightStatus(airline, flight, timestamp, statusCode);
        }
    }


    function getFlightKey
                        (
                            address airline,
                            string flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes
                            (                       
                                address account         
                            )
                            internal
                            returns(uint8[3])
    {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);
        
        indexes[1] = indexes[0];
        while(indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex
                            (
                                address account
                            )
                            internal
                            returns (uint8)
    {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(uint256(keccak256(abi.encodePacked(blockhash(block.number - nonce++), account))) % maxValue);

        if (nonce > 250) {
            nonce = 0;  // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }

// endregion

}   




//signatures of the data contract
contract FlightSuretyData {
    function isOperational() public view returns(bool);
    function registerAirline(address callingAirline, address newAirline ) external returns(bool);
    function buy(address insuree, address airline, string flight, uint256 timeOfFlight, uint256 insuranceValue) external payable; 
    //TODO add other signatures here..
    function checkAirlineValidity(address airline) external returns (bool result);
    function creditInsurees (address airline, string flight, uint256 timeOfFlight) external returns (bool result);
    function isAirline(address airline) external view returns (bool result);
    function fundAirline (address airline) external payable;
    function pay(address insuree, uint256 amount) external;
    function getInsurancePolicy(address insuree, address airline, string flight, uint256 timeOfFlight) external returns(bool, uint256, bool);
    function getCredits(address insuree) external returns(uint256);
}
