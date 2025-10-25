const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const appointmentSchema = new mongoose.Schema({
  id: {
    type: String,
    default: uuidv4,
    unique: true,
    required: true
  },
  user_id: {
    type: String,
    required: [true, 'User ID is required'],
    ref: 'User'
  },
  user_name: {
    type: String,
    required: [true, 'User name is required'],
    trim: true
  },
  venue_id: {
    type: String,
    required: [true, 'Venue ID is required'],
    ref: 'Venue'
  },
  venue_name: {
    type: String,
    required: [true, 'Venue name is required'],
    trim: true
  },
  appointment_date: {
    type: Date,
    required: [true, 'Appointment date is required'],
    validate: {
      validator: function (value) {
        return value > new Date();
      },
      message: 'Appointment date must be in the future'
    }
  },
  duration_hours: {
    type: Number,
    required: [true, 'Duration is required'],
    min: [1, 'Duration must be at least 1 hour'],
    max: [24, 'Duration cannot exceed 24 hours'],
    default: 1
  },
  purpose: {
    type: String,
    required: [true, 'Purpose is required'],
    trim: true,
    maxlength: [500, 'Purpose cannot exceed 500 characters']
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending',
    required: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false,
  versionKey: false
});

// Indexes for performance
// appointmentSchema.index({ id: 1 });
appointmentSchema.index({ user_id: 1 });
appointmentSchema.index({ venue_id: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ appointment_date: 1 });
appointmentSchema.index({ created_at: -1 });

// Update updated_at field before saving
appointmentSchema.pre('save', function (next) {
  this.updated_at = new Date();
  next();
});

// Transform output
appointmentSchema.methods.toJSON = function () {
  const appointmentObject = this.toObject();
  appointmentObject.id = this.id;
  delete appointmentObject._id;
  delete appointmentObject.__v;
  return appointmentObject;
};

// Static method to find by custom id
appointmentSchema.statics.findByCustomId = function (customId) {
  return this.findOne({ id: customId });
};

module.exports = mongoose.model('Appointment', appointmentSchema);