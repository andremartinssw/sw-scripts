const csvWriter = require("csv-writer");
const fs = require("fs");
const axios = require('axios');

// TODO: Update with your own credentials
const spaceURL = 'YOURSPACE.signalwire.com';
const projectID = "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX";
const authToken = "PTxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

const options = {
    method: 'GET',
    headers: {
        'Authorization': 'Basic ' + Buffer.from(projectID + ':' + authToken).toString('base64')
    }
};

(async () => {
    const csv = await csvWriter.createArrayCsvWriter({
        path: 'campaigns.csv',
        header: [
            'BRAND ID',
            'BRAND NAME',
            'BRAND STATUS',
            'CAMPAIGN ID',
            'CAMPAIGN NAME',
            'CAMPAIGN DESCRIPTION'
        ]
    });

    const brandsResponse = await axios.get(
        "https://" + spaceURL + "/api/relay/rest/registry/beta/brands" + "?page_size=1000", 
        options
    );

    for (let brand of brandsResponse.data.data) {
        const campaignsResponse = await axios.get(
            "https://" + spaceURL + "/api/relay/rest/registry/beta/brands/" + brand.id + "/campaigns?page_size=1000", 
            options
        );

        for (let campaign of campaignsResponse.data.data) {
            await csv.writeRecords([[
                brand.id,
                brand.name,
                brand.state,
                campaign.id,
                campaign.name,
                campaign.description
            ]])
        }
    }
})();