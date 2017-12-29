'use strict';

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

var
    fs = require('fs'),
    request = require('request'),
    questions = require('./importQuestions.js');

var { Pool } = require('pg')

var pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
})

messageUsersQuestionOfDay();

function messageUsersQuestionOfDay() {
    var today = new Date();
    var month = today.getMonth();
    var date = today.getDate();
    var todaysQuestion = questions.getQuestion(month, date);

    console.log(todaysQuestion);

    listUsers(todaysQuestion, callSendAPI);

}

function listUsers(question, sendFunction) {
    var textToSend = { "text": `Today's question is: ${question}` };
    console.log(textToSend);
    pool.connect((err, client, release) => {
        if (err) {
            return console.error('Error acquiring client', err.stack)
        }
        client.query('SELECT DISTINCT psid FROM responses', (err, res) => {
            release();
            if (err) {
                console.log(err.stack);
            } else {
                res.rows.forEach((item, index, array) => {
                    sendFunction(item.psid, textToSend);
                });
            }
        })
    });
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