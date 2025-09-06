const mongoose = require("mongoose");
// const { v4: uuidv4 } = require("uuid");

const contactSchema = new mongoose.Schema(
  {
    // id: {
    //   type: String,
    //   default: uuidv4,
    //   unique: true,
    //   required: true,
    // },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email",
      ],
    },
    phone: {
      type: String,
      required: [true, "Phone is required"],
      match: [/^[\+]?[1-9][\d]{0,15}$/, "Please provide a valid phone number"],
    },
    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
      maxlength: [200, "Subject cannot exceed 200 characters"],
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
      maxlength: [2000, "Message cannot exceed 2000 characters"],
    },
    is_resolved: {
      type: Boolean,
      default: false,
      required: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
    resolved_at: {
      type: Date,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

// Indexes for performance
// contactSchema.index({ id: 1 });
contactSchema.index({ is_resolved: 1 });
contactSchema.index({ created_at: -1 });
contactSchema.index({ email: 1 });

// Transform output
contactSchema.methods.toJSON = function () {
  const contactObject = this.toObject();
  delete contactObject._id;
  delete contactObject.__v;
  return contactObject;
};

// Static method to find by custom id
contactSchema.statics.findByCustomId = function (customId) {
  return this.findOne({ id: customId });
};

module.exports = mongoose.model("Contact", contactSchema);
