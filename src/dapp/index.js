
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


(async() => {

    let result = null;

    let contract = new Contract('localhost', () => {

        // Read transaction
        contract.isOperational((error, result) => {
            //console.log(error,result);
            //console.log('inside isoperational');

            //airlines selection

            //first add an empty element to the airlines list
            let firstElement = document.createElement("option");
            firstElement.text = 'Select Airline';
            firstElement.value = null; 
            firstElement.selected = true; 
            DOM.airlinesSelection.add(firstElement);
            
            //add all available airlines
            contract.airlines.forEach(airline => {
                //console.log(airline);
                let element = document.createElement("option");
                element.text = `${airline.address}`;
                element.value = JSON.stringify(airline);
                DOM.airlinesSelection.add(element);

            })
            
            //add all available passengers
            contract.passengers.forEach(passenger => {
                //console.log(airline);
                let element = document.createElement("option");
                element.text = `${passenger.address}`;
                element.value = JSON.stringify(passenger);
                DOM.passengerSelection.add(element);
            })

            //based on selected airlines, display flights and their info?
            DOM.airlinesSelection.addEventListener('change',function(){
                //check if the selected airline is not the select airline text
                if(JSON.parse(DOM.airlinesSelection.value)) {
                    //first clear the previous selections of flights 
                    DOM.flightsSelection.options.length = 0;
                    //then add flights for the selected airline
                    contract.flights.forEach(flight => {
                    if( flight.airline.address == JSON.parse(DOM.airlinesSelection.value).address) {
                        //console.log(true);
                        let element = document.createElement("option");
                        element.text = `${flight.code}`;
                        element.value = JSON.stringify(flight); 
                        DOM.flightsSelection.add(element);
                    }
                })
                }
                
            });

            //check listening to the flights selection works?
            DOM.flightsSelection.addEventListener('change',function(){
                //alert('changed');
            });

            display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
        });
    

        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = JSON.parse(DOM.flightsSelection.value);
            if (flight) {
                //do stuff
                console.log('submiting oracle with flight', flight);
            } else {
                console.log('no flight selected');
            }
            console.log('clicked');
            // Write transaction
            contract.fetchFlightStatus(flight, (error, result) => {
                display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
            });
        })

        // User buy insurance code
        DOM.elid('buying-button').addEventListener('click', () =>{
            //TODO what happens when the user purchases an insurance?
            let flight = DOM.flightsSelection.value;
            if (flight) {
                contract.buy(flight);
            } else {
                console.log('no flight selected');
            }
            
        })
    
    });
    

})();


function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);

}







