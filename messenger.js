'use strict'

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

var
    request = require('request');

module.exports = {
    callSendAPI
}

// Sends response messages via the Send API
function callSendAPI(psid, response) {
    // Construct the message body
    let request_body = {
        "recipient": {
            "id": psid
        },
        "message": response,
        "messaging_type": "MESSAGE_TAG",
        "tag": "BUSINESS_PRODUCTIVITY"
    }

    // Send the HTTP request to the Messenger Platform
    request({
        "uri": "https://graph.facebook.com/v5.0/me/messages",
        "qs": { "access_token": PAGE_ACCESS_TOKEN },
        "method": "POST",
        "json": request_body
    }, (err, res, body) => {
        if (!err) {
            console.log('message sent!: ' + JSON.stringify(request_body));
        } else {
            console.error("Unable to send message:" + err);
        }
    });
}