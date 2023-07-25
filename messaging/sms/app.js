const csvWriter = require("csv-writer");
const fs = require("fs");
const axios = require('axios');

// TODO: Update with your own credentials
const spaceURL = 'YOURSPACE.signalwire.com';
const projectID = "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX";
const authToken = "PTxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

// TODO: Update range
const START_DATE = "2023-07-23"
const END_DATE = "2023-07-24"

let pageNumber = 0;

const csv = csvWriter.createArrayCsvWriter({
    path: 'sms.csv',
    header: [
        'ID',
        'FROM',
        'TO',
        'DIRECTION',
        'STATUS',
        'KIND',
        'NUMBER OF SEGMENTS',
        'CREATED_AT'
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

        for (let record of data.data) {
            await csv.writeRecords([[
                record.id,
                record.from,
                record.to,
                record.direction,
                record.status,
                record.kind,
                record.number_of_segments,
                record.created_at
            ]])
        }

        if (data.links && data.links.next) {
            return await getData(data.links.next);
        }

    } catch (error) {
        console.error('Error occurred:', error);
    }
}

(async () => {

    let url = "https://" + spaceURL + "/api/messaging/logs" + "?page_size=1000";

    if (START_DATE != "") {
        url += "&created_after=" + START_DATE
    }

    if (END_DATE != "") {
        url += "&created_before=" + END_DATE
    }

    await getData(url)

})()