const express = require("express");
const Blog = require("../models/Blog");
const User = require("../models/User");
const {
  success,
  error,
  created,
  notFound,
  paginated,
  forbidden,
} = require("../utils/response");
const { protect, adminOnly, optionalAuth } = require("../middleware/auth");
const {
  validateBlog,
  validatePagination,
  validateObjectId,
} = require("../middleware/validation");

const router = express.Router();

// @desc    Get all blogs
// @route   GET /api/blogs
// @access  Public
router.get("/", optionalAuth, validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build query
    let query = { is_published: true };

    // Search by title or content
    if (req.query.search) {
      query.$text = { $search: req.query.search };
    }

    // Filter by author
    if (req.query.author_id) {
      query.author_id = req.query.author_id;
    }

    // Filter by tags
    if (req.query.tags) {
      const tags = req.query.tags.split(",").map((tag) => tag.trim());
      query.tags = { $in: tags };
    }

    // Date range filter
    if (req.query.date_from) {
      query.created_at = {
        ...query.created_at,
        $gte: new Date(req.query.date_from),
      };
    }
    if (req.query.date_to) {
      query.created_at = {
        ...query.created_at,
        $lte: new Date(req.query.date_to),
      };
    }



    app.get('/drop-blog-id-index', async (req, res) => {
      try {
        await Blog.collection.dropIndex('id_1');
        res.send('Index id_1 dropped successfully');
      } catch (err) {
        res.status(500).send('Error dropping index: ' + err.message);
      }
    });






    // Get blogs and total count
    const [blogs, total] = await Promise.all([
      Blog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Blog.countDocuments(query),
    ]);

    if (limit === 0) {
      // Return all blogs without pagination
      const allBlogs = await Blog.find(query).sort({ createdAt: -1 });
      return success(res, allBlogs, "Blogs retrieved successfully");
    }

    paginated(res, blogs, page, limit, total, "Blogs retrieved successfully");
  } catch (err) {
    console.error("Get blogs error:", err);
    error(res, "Failed to retrieve blogs", 500);
  }
});

// @desc    Get single blog
// @route   GET /api/blogs/:id
// @access  Public
router.get("/:id", validateObjectId, async (req, res) => {
  try {
    const blog = await Blog.findByCustomId(req.params.id);
    if (!blog) {
      return notFound(res, "Blog not found");
    }

    success(res, blog, "Blog retrieved successfully");
  } catch (err) {
    console.error("Get blog error:", err);
    error(res, "Failed to retrieve blog", 500);
  }
});

// @desc    Create blog
// @route   POST /api/blogs
// @access  Private
router.post("/", protect, validateBlog, async (req, res) => {
  try {
    // ensure req.user exists
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: no user found from token",
      });
    }

    const authorName = req.user.full_name || req.user.email || "Unknown Author";
    const authorId = req.user._id;

    const blog = new Blog({
      title: req.body.title,
      content: req.body.content,
      image: req.body.image || "https://via.placeholder.com/400x250",
      author_id: authorId,
      author_name: authorName,
      category: req.body.category,
      tags: req.body.tags || [],
      is_published: req.body.is_published !== undefined ? req.body.is_published : true,
    });

    await blog.save();

    res.status(201).json({
      success: true,
      data: blog,
      message: "Blog created successfully",
    });
  } catch (err) {
    console.error("Create blog error:", err.message, err);
    res.status(500).json({
      success: false,
      message: "Failed to create blog",
      error: err.message,
      timestamp: new Date(),
    });
  }
});



// @desc    Update blog
// @route   PUT /api/blogs/:id
// @access  Private
router.put(
  "/:id",
  protect,
  validateObjectId,
  validateBlog,
  async (req, res) => {
    try {
      const { title, content, tags, is_published } = req.body;

      const blog = await Blog.findByCustomId(req.params.id);
      if (!blog) {
        return notFound(res, "Blog not found");
      }

      // Check if user owns the blog or is admin
      if (blog.author_id !== req.user.id && req.user.role !== "admin") {
        return forbidden(res, "Not authorized to update this blog");
      }

      // Update fields
      blog.title = title;
      blog.content = content;
      blog.tags = tags || [];
      if (is_published !== undefined) blog.is_published = is_published;

      await blog.save();

      success(res, blog, "Blog updated successfully");
    } catch (err) {
      console.error("Update blog error:", err);
      error(res, "Failed to update blog", 500);
    }
  }
);

// @desc    Delete blog (soft delete)
// @route   DELETE /api/blogs/:id
// @access  Private
router.delete("/:id", protect, validateObjectId, async (req, res) => {
  try {
    const blog = await Blog.findByCustomId(req.params.id);
    if (!blog) {
      return notFound(res, "Blog not found");
    }

    // Check if user owns the blog or is admin
    if (blog.author_id !== req.user.id && req.user.role !== "admin") {
      return forbidden(res, "Not authorized to delete this blog");
    }

    // Soft delete
    blog.is_published = false;
    await blog.save();

    success(res, null, "Blog deleted successfully");
  } catch (err) {
    console.error("Delete blog error:", err);
    error(res, "Failed to delete blog", 500);
  }
});

// @desc    Get user's own blogs
// @route   GET /api/blogs/my/posts
// @access  Private
router.get("/my/posts", protect, validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = { author_id: req.user.id };

    // Include unpublished blogs for the author
    if (req.query.include_unpublished !== "true") {
      query.is_published = true;
    }

    const [blogs, total] = await Promise.all([
      Blog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Blog.countDocuments(query),
    ]);

    paginated(
      res,
      blogs,
      page,
      limit,
      total,
      "Your blogs retrieved successfully"
    );
  } catch (err) {
    console.error("Get user blogs error:", err);
    error(res, "Failed to retrieve your blogs", 500);
  }
});

// @desc    Get blog statistics
// @route   GET /api/blogs/stats/overview
// @access  Private/Admin
router.get("/stats/overview", protect, adminOnly, async (req, res) => {
  try {
    const [totalBlogs, publishedBlogs, unpublishedBlogs, recentBlogs] =
      await Promise.all([
        Blog.countDocuments(),
        Blog.countDocuments({ is_published: true }),
        Blog.countDocuments({ is_published: false }),
        Blog.countDocuments({
          created_at: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          is_published: true,
        }),
      ]);

    // Get top authors
    const topAuthors = await Blog.aggregate([
      { $match: { is_published: true } },
      {
        $group: {
          _id: "$author_id",
          count: { $sum: 1 },
          author_name: { $first: "$author_name" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // Get popular tags
    const popularTags = await Blog.aggregate([
      { $match: { is_published: true } },
      { $unwind: "$tags" },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    const stats = {
      total_blogs: totalBlogs,
      published_blogs: publishedBlogs,
      unpublished_blogs: unpublishedBlogs,
      recent_blogs_30_days: recentBlogs,
      top_authors: topAuthors,
      popular_tags: popularTags,
    };

    success(res, stats, "Blog statistics retrieved successfully");
  } catch (err) {
    console.error("Get blog stats error:", err);
    error(res, "Failed to retrieve blog statistics", 500);
  }
});

module.exports = router;
