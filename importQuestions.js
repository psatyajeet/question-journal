'use strict'

var
    fs = require('fs');

module.exports = {
    getQuestion
}

const questions = JSON.parse(fs.readFileSync('questions.json', 'utf8'));

function getQuestion(month, date) {
    return questions[month + "," + date];
}