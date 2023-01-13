const mongoose = require('mongoose');
const { Schema } = mongoose;

const scMap = new Schema({
    name: String,
    people: Number,
    description: String,
    isUsing: Boolean,
    isUniq: Boolean,
    savedAt: Date
});

module.exports = mongoose.model('ScMap', scMap);