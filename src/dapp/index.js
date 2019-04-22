
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


(async() => {

    let result = null;

    let contract = new Contract('localhost', () => {

        // Read transaction
        contract.isOperational((error, result) => {
            console.log(error,result);
            console.log('inside isoperational');

            //airlines selectino
            contract.airlines.forEach(airline => {
                console.log(airline);
                let element = document.createElement("option");
                element.text = `${airline.address}`;
                element.value = JSON.stringify(airline);
                DOM.airlinesSelection.add(element);
            })
            
            //based on selected airlines, display flights and their info?
            DOM.airlinesSelection.addEventListener('change',function(){
                alert('changed');
                contract.flights.forEach(flight => {
                    if( flight.airline == airlinesSelection.value) {
                        let element = document.createElement("option");
                        element.text = `${flight}`;
                        element.value = JSON.stringify(flight);
                        DOM.flightsSelection.add(element);
                    }
                })
            });

            //check listening to the flights selection works?
            DOM.flightsSelection.addEventListener('change',function(){
                alert('changed');
            });
            
            display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
        });
    

        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = DOM.elid('flight-number').value;
            console.log('clicked');
            // Write transaction
            contract.fetchFlightStatus(flight, (error, result) => {
                display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
            });
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







