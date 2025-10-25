const mongoose = require("mongoose");
// const { v4: uuidv4 } = require("uuid");

const partnerSchema = new mongoose.Schema(
  {
    company_name: {
      type: String,
      // required: [true, "Company name is required"],
      default: "",
      trim: true,
      maxlength: [200, "Company name cannot exceed 200 characters"],
    },
    contact_person: {
      type: String,
      // required: [true, "Contact person is required"],
      default: "",
      trim: true,
      maxlength: [100, "Contact person name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      default: "",
      // required: [true, "Email is required"],
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email",
      ],
    },
    phone: {
      type: String,
      default: "",
      // required: [true, "Phone is required"],
      match: [/^[\+]?[1-9][\d]{0,15}$/, "Please provide a valid phone number"],
    },
    location: {
      type: String,
      // required: [true, "Location is required"],
      default: "",
      trim: true,
      maxlength: [200, "Location cannot exceed 200 characters"],
    },
    partnership_type: {
      type: String,
      default: "",
      // required: [true, "Partnership type is required"],
      trim: true,
      maxlength: [100, "Partnership type cannot exceed 100 characters"],
    },
    description: {
      type: String,
      default: "",
      // required: [true, "Description is required"],
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    website: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/, "Please provide a valid website URL"],
    },
    image: {
      type: String,
      default: "https://res.cloudinary.com/dzsjtq4zd/image/upload/v1756229683/default-avatar-icon-of-social-media-user-vector_abij8s.jpg"
    },
    is_active: {
      type: Boolean,
      default: true,
      // required: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes for performance
// partnerSchema.index({ id: 1 });
partnerSchema.index({ is_active: 1 });
partnerSchema.index({ partnership_type: 1 });
partnerSchema.index({ company_name: "text", description: "text" });

// Update updated_at field before saving
partnerSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

// Transform output
partnerSchema.methods.toJSON = function () {
  const partnerObject = this.toObject();
  delete partnerObject._id;
  delete partnerObject.__v;
  return partnerObject;
};

// Static method to find by custom id
partnerSchema.statics.findByCustomId = function (customId) {
  return this.findOne({ _id: customId, is_active: true });
};

module.exports = mongoose.model("Partner", partnerSchema);
