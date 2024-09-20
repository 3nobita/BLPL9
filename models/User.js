const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const UserSchema = new Schema({
    name: String,
    password: String,
    role: {
        type: String,
        enum: ['admin', 'hod', 'driver', 'employee','Dhod'],
        required: true
    },
    department: String,
    userId: {
        type: String, // Adjust type if longer IDs are acceptable
        required: true,
        maxlength: 64 // Example max length
    },
});

module.exports = mongoose.model('User', UserSchema);
