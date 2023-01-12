const mongoose = require('mongoose');
const { Schema } = mongoose;

const scMatch = new Schema({
    maps: Object,
    aPlyr: String,
    bPlyr: String,
    aGm: String,
    bGm: String,
    cGm: String,
    savedAt: Date,
    isComplete: Boolean
});

module.exports = mongoose.model('ScMatch', scMatch);