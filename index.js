'use strict';

const PAGE_ACCESS_TOKEN = "EAAB6iyZCFz9QBALUmTjfQc8po0Kfe1iXZAwfhiss6sF2906C50fktxM1ofH3R8S8bXuwS4ZAahzba4DwXWiIZBZC2MwiC5TYYQXnlIFhuZCbAGvccuvhMe2XouybuSbjhkXTuZCngbLU2E6rBN2OiCrowra9f72znVVPZBqqiMUfAgZDZD";

const
    express = require('express'),
    bodyParser = require('body-parser'),
    app = express().use(bodyParser.json());

app.listen(process.env.PORT || 1337, () => console.log(`webhook is listening on port ${process.env.PORT}`));

app.post('/webhook', (req, res) => {

    let body = req.body;

    if (body.object === 'page') {
        body.entry.forEach(function(entry) {
            // Gets the body of the webhook event
            let webhook_event = entry.messaging[0];
            console.log(webhook_event);

            // Get the sender PSID
            let sender_psid = webhook_event.sender.id;
            console.log('Sender PSID: ' + sender_psid);
        });

        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }

});

app.get('/webhook', (req, res) => {
    let VERIFY_TOKEN = "DFB2E1A21263E745F3B467C5C56427C1";

    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

// Handles messages events
function handleMessage(sender_psid, received_message) {

}

// Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {

}

// Sends response messages via the Send API
function callSendAPI(sender_psid, response) {
  
}