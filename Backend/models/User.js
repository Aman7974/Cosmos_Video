const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,      
    trim: true,        
    minlength: 2,
    maxlength: 20,
  },
  color: {
    type: String,
    default: '#7c6dfa', 
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Export the model so other files can use it
module.exports = mongoose.model('User', UserSchema);