const express = require("express");
const Review = require("../models/Review");
const Venue = require("../models/Venue");
const Blog = require("../models/Blog");
const Partner = require("../models/Partner");
const {
  success,
  error,
  created,
  notFound,
  paginated,
  badRequest,
} = require("../utils/response");
const { protect, optionalAuth } = require("../middleware/auth");
const {
  validateReview,
  validatePagination,
  validateObjectId,
} = require("../middleware/validation");

const router = express.Router();

// @desc    Get reviews for a specific entity
// @route   GET /api/reviews/:entity_type/:entity_id
// @access  Public
router.get(
  "/:entity_type/:entity_id",
  optionalAuth,
  validatePagination,
  async (req, res) => {
    try {
      const { entity_type, entity_id } = req.params;

      // Validate entity type
      if (!["venue", "blog", "partner"].includes(entity_type)) {
        return badRequest(
          res,
          "Invalid entity type. Must be venue, blog, or partner"
        );
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      // Build query
      const query = { entity_type, entity_id };

      // Filter by rating
      if (req.query.rating) {
        const rating = parseInt(req.query.rating);
        if (rating >= 1 && rating <= 5) {
          query.rating = rating;
        }
      }

      // Get reviews and total count
      const [reviews, total] = await Promise.all([
        Review.find(query).sort({ created_at: -1 }).skip(skip).limit(limit),
        Review.countDocuments(query),
      ]);

      // Calculate average rating
      const ratingStats = await Review.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            average_rating: { $avg: "$rating" },
            total_reviews: { $sum: 1 },
            rating_distribution: {
              $push: "$rating",
            },
          },
        },
      ]);

      let stats = null;
      if (ratingStats.length > 0) {
        const distribution = [1, 2, 3, 4, 5].map((rating) => ({
          rating,
          count: ratingStats[0].rating_distribution.filter((r) => r === rating)
            .length,
        }));

        stats = {
          average_rating: Math.round(ratingStats[0].average_rating * 10) / 10,
          total_reviews: ratingStats[0].total_reviews,
          rating_distribution: distribution,
        };
      }

      const response = {
        reviews,
        stats,
        pagination: {
          current_page: page,
          per_page: limit,
          total_items: total,
          total_pages: Math.ceil(total / limit),
        },
      };

      success(res, response, "Reviews retrieved successfully");
    } catch (err) {
      console.error("Get reviews error:", err);
      error(res, "Failed to retrieve reviews", 500);
    }
  }
);

// @desc    Create review
// @route   POST /api/reviews
// @access  Private
router.post("/", protect, validateReview, async (req, res) => {
  try {
    const { entity_type, entity_id, rating, comment } = req.body;

    // Check if entity exists
    let entity;
    switch (entity_type) {
      case "venue":
        entity = await Venue.findByCustomId(entity_id);
        break;
      case "blog":
        entity = await Blog.findByCustomId(entity_id);
        break;
      case "partner":
        entity = await Partner.findByCustomId(entity_id);
        break;
      default:
        return badRequest(res, "Invalid entity type");
    }

    if (!entity) {
      return notFound(
        res,
        `${
          entity_type.charAt(0).toUpperCase() + entity_type.slice(1)
        } not found`
      );
    }

    // Check if user already reviewed this entity
    const existingReview = await Review.findOne({
      user_id: req.user.id,
      entity_type,
      entity_id,
    });

    if (existingReview) {
      return badRequest(res, "You have already reviewed this item");
    }

    // Create review
    const review = await Review.create({
      user_id: req.user.id,
      user_name: req.user.full_name,
      entity_type,
      entity_id,
      rating,
      comment,
    });

    created(res, review, "Review created successfully");
  } catch (err) {
    console.error("Create review error:", err);
    if (err.code === 11000) {
      error(res, "You have already reviewed this item", 400);
    } else {
      error(res, "Failed to create review", 500);
    }
  }
});

// @desc    Update review
// @route   PUT /api/reviews/:id
// @access  Private
router.put("/:id", protect, validateObjectId, async (req, res) => {
  try {
    const { rating, comment } = req.body;

    if (!rating || !comment) {
      return badRequest(res, "Rating and comment are required");
    }

    if (rating < 1 || rating > 5) {
      return badRequest(res, "Rating must be between 1 and 5");
    }

    const review = await Review.findByCustomId(req.params.id);
    if (!review) {
      return notFound(res, "Review not found");
    }

    // Check if user owns the review
    if (review.user_id !== req.user.id) {
      return error(res, "Not authorized to update this review", 403);
    }

    // Update review
    review.rating = rating;
    review.comment = comment;
    await review.save();

    success(res, review, "Review updated successfully");
  } catch (err) {
    console.error("Update review error:", err);
    error(res, "Failed to update review", 500);
  }
});

// @desc    Delete review
// @route   DELETE /api/reviews/:id
// @access  Private
router.delete("/:id", protect, validateObjectId, async (req, res) => {
  try {
    const review = await Review.findByCustomId(req.params.id);
    if (!review) {
      return notFound(res, "Review not found");
    }

    // Check if user owns the review or is admin
    if (review.user_id !== req.user.id && req.user.role !== "admin") {
      return error(res, "Not authorized to delete this review", 403);
    }

    await Review.deleteOne({ id: req.params.id });

    success(res, null, "Review deleted successfully");
  } catch (err) {
    console.error("Delete review error:", err);
    error(res, "Failed to delete review", 500);
  }
});

// @desc    Get user's own reviews
// @route   GET /api/reviews/my/reviews
// @access  Private
router.get("/my/reviews", protect, validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = { user_id: req.user.id };

    // Filter by entity type
    if (
      req.query.entity_type &&
      ["venue", "blog", "partner"].includes(req.query.entity_type)
    ) {
      query.entity_type = req.query.entity_type;
    }

    const [reviews, total] = await Promise.all([
      Review.find(query).sort({ created_at: -1 }).skip(skip).limit(limit),
      Review.countDocuments(query),
    ]);

    paginated(
      res,
      reviews,
      page,
      limit,
      total,
      "Your reviews retrieved successfully"
    );
  } catch (err) {
    console.error("Get user reviews error:", err);
    error(res, "Failed to retrieve your reviews", 500);
  }
});

// @desc    Get all reviews (admin only)
// @route   GET /api/reviews/admin/all
// @access  Private/Admin
router.get("/admin/all", protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== "admin") {
      return error(res, "Admin access required", 403);
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    let query = {};

    // Filter by entity type
    if (
      req.query.entity_type &&
      ["venue", "blog", "partner"].includes(req.query.entity_type)
    ) {
      query.entity_type = req.query.entity_type;
    }

    // Filter by rating
    if (req.query.rating) {
      const rating = parseInt(req.query.rating);
      if (rating >= 1 && rating <= 5) {
        query.rating = rating;
      }
    }

    const [reviews, total] = await Promise.all([
      Review.find(query).sort({ created_at: -1 }).skip(skip).limit(limit),
      Review.countDocuments(query),
    ]);

    paginated(
      res,
      reviews,
      page,
      limit,
      total,
      "All reviews retrieved successfully"
    );
  } catch (err) {
    console.error("Get all reviews error:", err);
    error(res, "Failed to retrieve reviews", 500);
  }
});

module.exports = router;
