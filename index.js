'use strict';

var
    express = require('express'),
    bodyParser = require('body-parser'),
    messenger = require('./messenger.js'),
    questions = require('./importQuestions.js'),
    app = express().use(bodyParser.json());

var { Pool } = require('pg')

var pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
})

app.listen(process.env.PORT || 1337, () => console.log(`webhook is listening on port ${process.env.PORT}`));

app.post('/webhook', (req, res) => {
    let body = req.body;

    if (body.object === 'page') {
        body.entry.forEach(function(entry) {
            // Gets the body of the webhook event
            let webhook_event = entry.messaging[0];

            // Get the sender PSID
            let sender_psid = webhook_event.sender.id;

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
    var todays_question = questions.getQuestion(month, date);

    handleUserWithPsid(
        sender_psid,
        () => handleNewUser(sender_psid, todays_question),
        () => handleExistingUser(sender_psid, received_message, month, date, todays_question));
}

function handleUserWithPsid(psid, new_user_function, existing_user_function) {
    pool.connect((err, client, release) => {
        if (err) {
            return console.error('Error acquiring client', err.stack)
        }
        client.query('SELECT * FROM users WHERE psid = $1', [ psid ])
            .then(result => {
                if (result.rowCount === 0) {
                    new_user_function();
                } else {
                    existing_user_function();
                }
            })
            .catch(e => console.error(e.stack))
            .then(() => release())
    });
}

function handleNewUser(sender_psid, todays_question) {
    saveUser(sender_psid);

    var responses = [];
    responses.push({ "text": [`Welcome to the Question of the Day bot 😀`,
        `I will send you a question every morning which you can answer.`,
        `After you answer a question, you'll have the option to see your previous answers on that date.`,
        ``,
        `Today's question is: ${todays_question}`,
        `Please respond with your answer!`].join("\n")});    

    responses.forEach(response => messenger.callSendAPI(sender_psid, response));
}

function handleExistingUser(sender_psid, received_message, month, date, todays_question) {
    var responses = [];

    // Checks if the message contains text
    if (received_message.text) { 
        saveResponse(sender_psid, todays_question, received_message.text, month, date);

        responses.push({ "text": `Today's question was: ${todays_question}\nYour response was: ${received_message.text}` });
        responses.push({
            "attachment": {
                "type": "template",
                "payload": {
                    "template_type": "generic",
                    "elements": [{
                        "title": `Do you want to see your previous answers on this date?`,
                        "subtitle": `${todays_question}`,
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
        });
    } 
    responses.forEach(response => messenger.callSendAPI(sender_psid, response));
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
        listEntries(sender_psid, month, date, response, messenger.callSendAPI);
    } else if (payload === 'no') {
        response = { "text": "Ok, have a great day! See you tomorrow" }
        messenger.callSendAPI(sender_psid, response);
    }
    // Send the message to acknowledge the postback
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

function saveUser(psid) {
    var queryText = 'INSERT INTO users(psid) VALUES($1)'
    pool.connect((err, client, release) => {
        if (err) {
            return console.error('Error acquiring client', err.stack)
        }
        client.query(queryText, [psid], (err, res) => {
            release();
            if (err) throw err;
        });
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
