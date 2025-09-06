const mongoose = require('mongoose');
// const { v4: uuidv4 } = require('uuid');

const reviewSchema = new mongoose.Schema({
  // id: {
  //   type: String,
  //   default: uuidv4,
  //   unique: true,
  //   required: true
  // },
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
  entity_type: {
    type: String,
    required: [true, 'Entity type is required'],
    enum: ['venue', 'blog', 'partner'],
    lowercase: true
  },
  entity_id: {
    type: String,
    required: [true, 'Entity ID is required']
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5'],
    validate: {
      validator: Number.isInteger,
      message: 'Rating must be an integer'
    }
  },
  comment: {
    type: String,
    required: [true, 'Comment is required'],
    trim: true,
    maxlength: [1000, 'Comment cannot exceed 1000 characters']
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false,
  versionKey: false
});

// Indexes for performance
// reviewSchema.index({ id: 1 });
reviewSchema.index({ user_id: 1 });
reviewSchema.index({ entity_type: 1, entity_id: 1 });
reviewSchema.index({ user_id: 1, entity_type: 1, entity_id: 1 }, { unique: true });
reviewSchema.index({ created_at: -1 });

// Transform output
reviewSchema.methods.toJSON = function() {
  const reviewObject = this.toObject();
  delete reviewObject._id;
  delete reviewObject.__v;
  return reviewObject;
};

// Static method to find by custom id
reviewSchema.statics.findByCustomId = function(customId) {
  return this.findOne({ id: customId });
};

module.exports = mongoose.model('Review', reviewSchema);