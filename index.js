'use strict';

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

const
    express = require('express'),
    bodyParser = require('body-parser'),
    request = require('request'),
    fs= require('fs'),
    app = express().use(bodyParser.json());

const { Pool } = require('pg')

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
})

const questions = JSON.parse(fs.readFileSync('questions.json', 'utf8'));

app.listen(process.env.PORT || 1337, () => console.log(`webhook is listening on port ${process.env.PORT}`));

app.post('/webhook', (req, res) => {

    let body = req.body;

    if (body.object === 'page') {
        body.entry.forEach(function(entry) {
            // Gets the body of the webhook event
            let webhook_event = entry.messaging[0];

            // Get the sender PSID
            let sender_psid = webhook_event.sender.id;
            console.log('Sender PSID: ' + sender_psid);

            // Check if the event is a message or postback and
            // pass the event to the appropriate handler function
            if (webhook_event.message) {
                handleMessage(sender_psid, webhook_event.message);
            } else if (webhook_event.postback) {
                handlePostback(sender_psid, webhook_event.postback);
            }
        });

        res.status(200).send('EVENT_RECEIVED\n');
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
            console.log('WEBHOOK_VERIFIED\n');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

// Handles messages events
function handleMessage(sender_psid, received_message) {
    var today = new Date();
    var month = today.getMonth();
    var date = today.getDate();
    var todaysQuestion = questions[month + "," + date];

    let response;

    // Checks if the message contains text
    if (received_message.text) { 
        saveResponse(sender_psid, todaysQuestion, received_message.text, month, date);   
        response = {
            "attachment": {
                "type": "template",
                "payload": {
                    "template_type": "generic",
                    "elements": [{
                        "title": `You sent the message: ${received_message.text}. Do you want to see your previous answers?`,
                        "subtitle": "Tap a button to answer.",
                        "buttons": [
                        {
                            "type": "postback",
                            "title": "Yes!",
                            "payload": "yes",
                        },
                        {
                            "type": "postback",
                            "title": "No!",
                            "payload": "no",
                        }
                        ],
                    }]
                }
            }
        }
    } 

    callSendAPI(sender_psid, response);
}

// Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {
    let response;
    var today = new Date();
    var month = today.getMonth();
    var date = today.getDate();

    // Get the payload for the postback
    let payload = received_postback.payload;

    // Set the response based on the postback payload
    if (payload === 'yes') {
        response = { "text": `Awesome! Here are your previous answers:` }
        listEntries(sender_psid, month, date, response, callSendAPI);
    } else if (payload === 'no') {
        response = { "text": "Ok, have a great day! See you tomorrow" }
        callSendAPI(sender_psid, response);
    }
    // Send the message to acknowledge the postback
}

// Sends response messages via the Send API
function callSendAPI(sender_psid, response) {
    // Construct the message body
    let request_body = {
        "recipient": {
            "id": sender_psid
        },
        "message": response
    }

    // Send the HTTP request to the Messenger Platform
    request({
        "uri": "https://graph.facebook.com/v2.6/me/messages",
        "qs": { "access_token": PAGE_ACCESS_TOKEN },
        "method": "POST",
        "json": request_body
    }, (err, res, body) => {
        if (!err) {
            console.log('message sent!');
        } else {
            console.error("Unable to send message:" + err);
        }
    }); 
}

function listEntries(psid, month, date, response, sendFunction) {
    pool.connect((err, client, release) => {
        if (err) {
            return console.error('Error acquiring client', err.stack)
        }
        client.query('SELECT * FROM responses WHERE psid = $1 AND month = $2 and day = $3', [ psid, month, date ], (err, res) => {
            release();
            if (err) {
                console.log(err.stack);
            } else {
                res.rows.forEach((item, index, array) => {
                    var textToSend = { "text": `${item.created_at}: ${item.answer}` };
                    console.log(textToSend);
                    sendFunction(psid, textToSend);
                });
            }
        })
    });
}

function saveResponse(psid, question, answer, month, day) {
    console.log(`${psid}, ${Date.now()}, ${question}, ${answer}, ${month}, ${day}`);
    var queryText = 'INSERT INTO responses(psid, created_at, question, answer, month, day) VALUES($1, now(), $2, $3, $4, $5)'
    pool.connect((err, client, release) => {
        if (err) {
            return console.error('Error acquiring client', err.stack)
        }
        client.query(queryText, [psid, String(question), String(answer), month, day], (err, res) => {
            release();
            if (err) throw err;
        });
    });

}
