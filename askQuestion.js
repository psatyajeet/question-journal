'use strict';

var
    fs = require('fs'),
    request = require('request'),
    messenger = require('./messenger.js'),
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

    sendToUsers(todaysQuestion, messenger.callSendAPI);
}

function sendToUsers(question, sendFunction) {
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
                    console.log(`Sending to: ${item.psid}`);
                    sendFunction(item.psid, textToSend);
                });
            }
        })
    });
}
