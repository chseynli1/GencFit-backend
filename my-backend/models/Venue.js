const mongoose = require('mongoose');
// const { v4: uuidv4 } = require('uuid');

const venueSchema = new mongoose.Schema({
  // id: {
  //   type: String,
  //   default: uuidv4,
  //   unique: true,
  //   required: true
  // },
  name: {
    type: String,
    required: [true, 'Venue name is required'],
    trim: true,
    maxlength: [200, 'Venue name cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Venue description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  venue_type: {
    type: String,
    enum: ['sports', 'entertainment', 'both'],
    required: [true, 'Venue type is required']
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    maxlength: [500, 'Location cannot exceed 500 characters']
  },
  capacity: {
    type: Number,
    required: [true, 'Capacity is required'],
    min: [1, 'Capacity must be at least 1'],
    max: [100000, 'Capacity cannot exceed 100,000']
  },
  amenities: [{
    type: String,
    trim: true,
    maxlength: [100, 'Amenity name cannot exceed 100 characters']
  }],
  contact_phone: {
    type: String,
    required: [true, 'Contact phone is required'],
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please provide a valid phone number']
  },
  contact_email: {
    type: String,
    required: [true, 'Contact email is required'],
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },

  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0,
  },

  image: {
    type: String,
    default: ""
  },
  is_active: {
    type: Boolean,
    default: true,
    required: true
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
// venueSchema.index({ id: 1 });
venueSchema.index({ venue_type: 1 });
venueSchema.index({ is_active: 1 });
venueSchema.index({ name: 'text', description: 'text', location: 'text' });

// Update updated_at field before saving
venueSchema.pre('save', function (next) {
  this.updated_at = new Date();
  next();
});

// Transform output
venueSchema.methods.toJSON = function () {
  const venueObject = this.toObject();
  venueObject.id = venueObject._id;
  delete venueObject._id;
  delete venueObject.__v;
  return venueObject;
};

// Static method to find by custom id
venueSchema.statics.findByCustomId = function (customId) {
  return this.findOne({ _id: customId });
};

module.exports = mongoose.model('Venue', venueSchema);