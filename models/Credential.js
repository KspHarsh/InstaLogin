const mongoose = require('mongoose');

const credentialSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  ipAddress: {
    type: String,
    default: 'N/A'
  },
  userAgent: {
    type: String,
    default: 'N/A'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Credential', credentialSchema);
