var config = require('./config')
const requestLib = require('request');
const utils = require('./utils');
const reverseLookupManager = require('./reverseLookupManager');

exports.processRequest = function(conv, parameters, requestReverseLookup) {
    return new Promise(function(resolve, reject) {
        let consumed_quantity = 1,
            consumption_country = 'Default',
            emissionType = '';

        if (parameters.quantity !== "")
            consumed_quantity = parameters.quantity;

        if (parameters.geo_country !== "")
            consumption_country = parameters.geo_country;

        console.log("Electricity consumed =" + consumed_quantity + ", country =" + consumption_country);

        var options = {
            uri: config.endpoint + "/emissions",
            method: 'POST',
            headers: {
                'access-key': config.access_key
            },
            json: true,
            body: {
                "item": "electricity",
                "unit": "kWh",
                "region": consumption_country,
                "quantity": consumed_quantity
            }
        };

        requestLib(options, function(error, response, body) {
            const emissionResponse = "The emissions released due to this action are given below";
            if (!error && response.statusCode === 200) {
                //The response returned no error, as expected.
                console.log(body);
                if (parameters.emission_type !== "") {
                    let emissionType = parameters.emission_type;
                    let emission;
                    if (emissionType === "CO2")
                        emission = body.emissions.CO2;
                    else if (emissionType === "N2O")
                        emission = body.emissions.N2O;
                    else
                        emission = body.emissions.CH4;
                    let basicResponseString = emissionType +' emissions due to electricity consumption of ' + consumed_quantity + ' kWh';
                    let finalResponseString = "";
                    if (consumption_country != "" && consumption_country != "Default")
                        finalResponseString = basicResponseString + ' in ' + consumption_country + ' are ' + emission;
                    else
                        finalResponseString = basicResponseString + ' are ' + emission;
                    if (requestReverseLookup) {
                        let reverseLookup = reverseLookupManager.reverseLookup(body.emissions, conv.user.storage.location.coordinates);
                        reverseLookup
                            .then((responses) => {
                                let selectedResponse = utils.getRandomNumber(0, responses.length - 1);
                                let unit = body.unit;
                                if (unit !== undefined) {
                                    finalResponseString = finalResponseString + ' ' + unit + ' \n\n' + responses[selectedResponse];
                                    utils.richResponse(conv, finalResponseString, responses[selectedResponse]);
                                    resolve();
                                } else {
                                    finalResponseString = finalResponseString + ' kg' + ' \n\n' + responses[selectedResponse];
                                    utils.richResponse(conv, finalResponseString, responses[selectedResponse]);
                                    resolve();
                                }
                            })
                            .catch((err) => {
                                let unit = body.unit;
                                if (unit !== undefined) {
                                    utils.richResponse(conv, finalResponseString + ' ' + unit, emissionResponse);
                                    resolve();
                                } else {
                                    utils.richResponse(conv, finalResponseString + ' kg', emissionResponse);
                                    resolve();
                                }
                            });
                    } else {
                        let unit = body.unit;
                        if (unit !== undefined) {
                            utils.richResponse(conv, finalResponseString + ' ' + unit, emissionResponse);
                            resolve();
                        } else {
                            utils.richResponse(conv, finalResponseString + ' kg', emissionResponse);
                            resolve();
                        }
                    }
                } else {
                    let basicResponseString = 'Emissions due to electricity consumption of ' + consumed_quantity + ' kWh';
                    let finalResponseString = "";
                    if (consumption_country != "" && consumption_country != "Default")
                        finalResponseString = basicResponseString + ' in ' + consumption_country;
                    else
                        finalResponseString = basicResponseString;
                    let carbonEmission = body.emissions.CO2;
                    let nitrousEmission = body.emissions.N2O;
                    let methaneEmission = body.emissions.CH4;

                    if (requestReverseLookup) {
                        console.log("Location data:" + JSON.stringify(conv.user.storage.location.coordinates));
                        let reverseLookup = reverseLookupManager.reverseLookup(body.emissions, conv.user.storage.location.coordinates);
                        reverseLookup
                            .then((responses) => {
                                console.log("responses length: " + responses.length);
                                let selectedResponse = utils.getRandomNumber(0, responses.length - 1);
                                console.log("selected response: " + selectedResponse);
                                finalResponseString = finalResponseString + ' are as follows:\n  \n' +
                                    'Carbon Dioxide: ' + carbonEmission + ' kg.\n' +
                                    "Nitrous Oxide: " + nitrousEmission + ' kg.\n' +
                                    "Methane: " + methaneEmission + ' kg.' + ' \n\n' + responses[selectedResponse];
                                utils.richResponse(conv, finalResponseString, responses[selectedResponse]);
                                resolve();
                            })
                            .catch((err) => {
                                finalResponseString = finalResponseString + ' are as follows:\n  \n' +
                                    'Carbon Dioxide: ' + carbonEmission + ' kg.\n' +
                                    "Nitrous Oxide: " + nitrousEmission + ' kg.\n' +
                                    "Methane: " + methaneEmission + ' kg.';
                                utils.richResponse(conv, finalResponseString, emissionResponse);
                                resolve();
                            });
                    } else {
                        finalResponseString = finalResponseString + ' are as follows:\n  \n' +
                            'Carbon Dioxide: ' + carbonEmission + ' kg.\n' +
                            "Nitrous Oxide: " + nitrousEmission + ' kg.\n' +
                            "Methane: " + methaneEmission + ' kg.';
                        utils.richResponse(conv, finalResponseString, emissionResponse);
                        resolve();
                    }
                }
            } else {
              
              //Handle the error in the utils function
              if (!error)
                error = body.error;
              utils.handleError(error, response, body, conv);
              resolve();
            }
        });
    });
}
