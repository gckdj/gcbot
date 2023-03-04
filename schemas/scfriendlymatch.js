const mongoose = require('mongoose');
const { Schema } = mongoose;

const scFriMatch = new Schema({
    maps: Object,
    aPlyr: String,
    bPlyr: String,
    savedAt: Date,
    finalWinner: String,
    isComplete: Boolean
});

module.exports = mongoose.model('scFriMatch', scFriMatch);