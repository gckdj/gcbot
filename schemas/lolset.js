const mongoose = require('mongoose');
const { Schema } = mongoose;

const lolSet = new Schema({
    top: String,
    jug: String,
    mid: String,
    adc: String,
    spt: String,
    name: String,
    isWin: Number,
    captureUrl: String,
    savedAt: Date
});

module.exports = mongoose.model('lolSet', lolSet);