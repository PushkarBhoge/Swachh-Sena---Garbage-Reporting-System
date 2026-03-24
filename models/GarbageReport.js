const mongoose = require('mongoose');

const imageSchema = { url: String, public_id: String };

const garbageReportSchema = new mongoose.Schema({
  beforeImages: {
    type: [imageSchema],
    validate: v => v.length > 0
  },
  afterImages: [imageSchema],
  location: {
    area: { type: String, required: true },
    landmark: { type: String, required: true },
    city: { type: String, required: true },
    pincode: { type: String, required: true }
  },
  description: { type: String, required: true },
  reportedBy: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: {
    type: String,
    enum: ['Pending', 'Assigned', 'Cleaned'],
    default: 'Pending'
  },
  assignedTeam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  adminRemarks: String,
  cleanedAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('GarbageReport', garbageReportSchema);