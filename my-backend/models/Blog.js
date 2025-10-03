const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema(
  {
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
    image: {
      type: String,
      default: "https://via.placeholder.com/400x250",
    },
    author_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Author ID is required"],
    },
    author_name: {
      type: String,
      required: false,
      trim: true,
    },
    category: {
      type: String,
      enum: ["idman-sağlamlıq", "motivasiya", "incəsənət"],
      required: false,
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
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes for performance
// blogSchema.index({ id: 1 });
blogSchema.index({ author_id: 1 });
blogSchema.index({ is_published: 1 });
blogSchema.index({ created_at: -1 });
blogSchema.index({ title: "text", content: "text" });


// Transform output
blogSchema.methods.toJSON = function () {
  const blogObject = this.toObject();
  blogObject.id = blogObject._id
  delete blogObject._id;
  delete blogObject.__v;
  return blogObject;
};

// Static method to find by custom id
blogSchema.statics.findByCustomId = function (customId) {
  return this.findOne({ _id: customId});
};

module.exports = mongoose.model("Blog", blogSchema);
