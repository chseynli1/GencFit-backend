const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const blogSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: uuidv4,
      unique: true,
      required: true,
    },
    title: {
      type: String,
      required: [true, "Blog title is required"],
      trim: true,
      maxlength: [300, "Title cannot exceed 300 characters"],
    },
    content: {
      type: String,
      required: [true, "Blog content is required"],
      maxlength: [10000, "Content cannot exceed 10,000 characters"],
    },
    author_id: {
      type: String,
      required: [true, "Author ID is required"],
      ref: "User",
    },
    author_name: {
      type: String,
      required: [true, "Author name is required"],
      trim: true,
    },
    tags: [
      {
        type: String,
        trim: true,
        maxlength: [50, "Tag cannot exceed 50 characters"],
      },
    ],
    is_published: {
      type: Boolean,
      default: true,
      required: true,
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
    timestamps: false,
    versionKey: false,
  }
);

// Indexes for performance
blogSchema.index({ id: 1 });
blogSchema.index({ author_id: 1 });
blogSchema.index({ is_published: 1 });
blogSchema.index({ created_at: -1 });
blogSchema.index({ title: "text", content: "text" });

// Update updated_at field before saving
blogSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

// Transform output
blogSchema.methods.toJSON = function () {
  const blogObject = this.toObject();
  delete blogObject._id;
  delete blogObject.__v;
  return blogObject;
};

// Static method to find by custom id
blogSchema.statics.findByCustomId = function (customId) {
  return this.findOne({ id: customId, is_published: true });
};

module.exports = mongoose.model("Blog", blogSchema);
