const csvWriter = require("csv-writer");
const fs = require("fs");
const axios = require('axios');
const { log } = require("console");

// TODO: Update with your own credentials
const spaceURL = 'YOURSPACE.signalwire.com';
const projectID = "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX";
const authToken = "PTxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

// TODO: Update range
const START_DATE = "2023-08-08"
const END_DATE = "2023-08-09"

UNSUBSCRIBE_KEYWORDS = [
    "stop",
    "unsubscribe"
]

const PHONE_NUMBERS = [
    '+18007267864'
]

let pageNumber = 0;
let outboundMessagesCount = 0;
let outboundMessagesCountFailed = 0;
let outboundMessagesCountUndelivered = 0;
let regularInboundMessagesCount = 0;
let unsubscribeMessagesCount = 0;

const unsubCsv = csvWriter.createArrayCsvWriter({
    path: 'unsub.csv',
    header: [
        'ID',
        'FROM',
        'TO',
        'DIRECTION',
        'STATUS',
        'CREATED_AT',
        'BODY'
    ]
})

const regularInboundCsv = csvWriter.createArrayCsvWriter({
    path: 'regularInbound.csv',
    header: [
        'ID',
        'FROM',
        'TO',
        'DIRECTION',
        'STATUS',
        'CREATED_AT',
        'BODY'
    ]
})

const outboundCsv = csvWriter.createArrayCsvWriter({
    path: 'outbound.csv',
    header: [
        'ID',
        'FROM',
        'TO',
        'DIRECTION',
        'STATUS',
        'CREATED_AT',
        'BODY'
    ]
})

async function getData(url) {
    pageNumber++

    const options = {
        method: 'GET',
        headers: {
            'Authorization': 'Basic ' + Buffer.from(projectID + ':' + authToken).toString('base64')
        }
    };

    try {
        process.stdout.write("Fetching page " + pageNumber + "... ")
        let start = Date.now()
        const response = await axios.get(url, options);
        let end = Date.now()
        console.log("Took " + (end - start) + "ms");
        
        const data = response.data;

        for (let record of data.messages) {

            if (record.body == null) {
                continue
            }

            let bodyWithoutSpaces = record.body.replace(/\s/g, "").toLowerCase()
            
            if (PHONE_NUMBERS.length == 0 || PHONE_NUMBERS.includes(record.to) || PHONE_NUMBERS.includes(record.from)) {
                if (record.direction == 'inbound') {
                    if (UNSUBSCRIBE_KEYWORDS.includes(bodyWithoutSpaces)) {
                        unsubscribeMessagesCount++
                        await unsubCsv.writeRecords([[
                            record.id,
                            record.from,
                            record.to,
                            record.direction,
                            record.status,
                            record.date_created,
                            record.body
                        ]])
                    } else {
                        regularInboundMessagesCount++
                        await regularInboundCsv.writeRecords([[
                            record.id,
                            record.from,
                            record.to,
                            record.direction,
                            record.status,
                            record.date_created,
                            record.body
                        ]])
                    }
                } else {
                    if (record.status == 'failed') {
                        outboundMessagesCountFailed++
                    } else if (record.status == 'undelivered') {
                        outboundMessagesCountUndelivered++
                    }

                    outboundMessagesCount++

                    await outboundCsv.writeRecords([[
                        record.id,
                        record.from,
                        record.to,
                        record.direction,
                        record.status,
                        record.date_created,
                        record.body
                    ]])
                }   
            }
            
        }

        if (data.next_page_uri) {
            return await getData("https://" + spaceURL + data.next_page_uri);
        }

    } catch (error) {
        console.error('Error occurred:', error);
    }
}

(async () => {

    let url = "https://" + spaceURL + "/api/laml/2010-04-01/Accounts/" + projectID + "/Messages" + "?PageSize=1000";

    if (START_DATE != "") {
        url += "&DateSent>=" + START_DATE
    }

    if (END_DATE != "") {
        url += "&DateSent<=" + END_DATE
    }

    await getData(url)

    let unsubscribePercentage = ((unsubscribeMessagesCount/(regularInboundMessagesCount+unsubscribeMessagesCount))*100)
    let ratio = (unsubscribeMessagesCount/outboundMessagesCount)*100

    console.log("Sent", outboundMessagesCount, "messages.");
    console.log("Received", regularInboundMessagesCount + unsubscribeMessagesCount, "messages.");
    console.log(`${unsubscribePercentage.toFixed(2)}% of inbound messages have been to unsubscribe.`);
    console.log(`STOP Ratio is ${ratio.toFixed(2)}%`);
    console.log("Failed: ", outboundMessagesCountFailed);
    console.log("Undelivered: ", outboundMessagesCountUndelivered);
})()