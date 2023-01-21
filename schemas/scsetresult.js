const mongoose = require('mongoose');
const { Schema } = mongoose;

const scSetResult = new Schema({
    matchId: String,
    plyr: String,
    isWin: Number,
    set: Number,
    savedAt: Date
});

module.exports = mongoose.model('ScSetResult', scSetResult);