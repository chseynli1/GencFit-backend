const express = require("express");
const Venue = require("../models/Venue");
const {
  success,
  error,
  created,
  notFound,
  paginated,
} = require("../utils/response");
const { protect, adminOnly, optionalAuth } = require("../middleware/auth");
const {
  validateVenue,
  validatePagination,
  validateObjectId,
} = require("../middleware/validation");

const router = express.Router();

// @desc    Get all venues
// @route   GET /api/venues
// @access  Public
router.get("/", optionalAuth, validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build query
    let query = { is_active: true };

    // Filter by venue type
    if (
      req.query.venue_type &&
      ["sports", "entertainment", "both"].includes(req.query.venue_type)
    ) {
      query.venue_type = req.query.venue_type;
    }

    // Search by name, description, or location
    if (req.query.search) {
      query.$text = { $search: req.query.search };
    }

    // Filter by capacity range
    if (req.query.min_capacity) {
      query.capacity = {
        ...query.capacity,
        $gte: parseInt(req.query.min_capacity),
      };
    }
    if (req.query.max_capacity) {
      query.capacity = {
        ...query.capacity,
        $lte: parseInt(req.query.max_capacity),
      };
    }

    // Get venues and total count
    const [venues, total] = await Promise.all([
      Venue.find(query).sort({ created_at: -1 }).skip(skip).limit(limit),
      Venue.countDocuments(query),
    ]);

    if (limit === 0) {
      // Return all venues without pagination
      const allVenues = await Venue.find(query).sort({ created_at: -1 });
      return success(res, allVenues, "Venues retrieved successfully");
    }

    paginated(res, venues, page, limit, total, "Venues retrieved successfully");
  } catch (err) {
    console.error("Get venues error:", err);
    error(res, "Failed to retrieve venues", 500);
  }
});

// @desc    Get single venue
// @route   GET /api/venues/:id
// @access  Public
router.get("/:id", validateObjectId, async (req, res) => {
  try {
    const venue = await Venue.findByCustomId(req.params.id);
    if (!venue) {
      return notFound(res, "Venue not found");
    }

    success(res, venue, "Venue retrieved successfully");
  } catch (err) {
    console.error("Get venue error:", err);
    error(res, "Failed to retrieve venue", 500);
  }
});

// @desc    Create venue
// @route   POST /api/venues
// @access  Private/Admin
router.post("/", protect, adminOnly, validateVenue, async (req, res) => {
  try {
    const {
      name,
      description,
      venue_type,
      location,
      capacity,
      amenities = [],
      contact_phone,
      contact_email,
    } = req.body;

    const venue = await Venue.create({
      name,
      description,
      venue_type,
      location,
      capacity,
      amenities,
      contact_phone,
      contact_email,
    });

    created(res, venue, "Venue created successfully");
  } catch (err) {
    console.error("Create venue error:", err);
    if (err.code === 11000) {
      error(res, "Venue with this name already exists", 400);
    } else {
      error(res, "Failed to create venue", 500);
    }
  }
});

// @desc    Update venue
// @route   PUT /api/venues/:id
// @access  Private/Admin
router.put(
  "/:id",
  protect,
  adminOnly,
  validateObjectId,
  validateVenue,
  async (req, res) => {
    try {
      const {
        name,
        description,
        venue_type,
        location,
        capacity,
        amenities,
        contact_phone,
        contact_email,
      } = req.body;

      const venue = await Venue.findByCustomId(req.params.id);
      if (!venue) {
        return notFound(res, "Venue not found");
      }

      // Update fields
      venue.name = name;
      venue.description = description;
      venue.venue_type = venue_type;
      venue.location = location;
      venue.capacity = capacity;
      venue.amenities = amenities || [];
      venue.contact_phone = contact_phone;
      venue.contact_email = contact_email;

      await venue.save();

      success(res, venue, "Venue updated successfully");
    } catch (err) {
      console.error("Update venue error:", err);
      error(res, "Failed to update venue", 500);
    }
  }
);

// @desc    Delete venue (soft delete)
// @route   DELETE /api/venues/:id
// @access  Private/Admin
router.delete(
  "/:id",
  protect,
  adminOnly,
  validateObjectId,
  async (req, res) => {
    try {
      const venue = await Venue.findByCustomId(req.params.id);
      if (!venue) {
        return notFound(res, "Venue not found");
      }

      // Soft delete
      venue.is_active = false;
      await venue.save();

      success(res, null, "Venue deleted successfully");
    } catch (err) {
      console.error("Delete venue error:", err);
      error(res, "Failed to delete venue", 500);
    }
  }
);

// @desc    Restore venue
// @route   PUT /api/venues/:id/restore
// @access  Private/Admin
router.put(
  "/:id/restore",
  protect,
  adminOnly,
  validateObjectId,
  async (req, res) => {
    try {
      const venue = await Venue.findOne({ id: req.params.id });
      if (!venue) {
        return notFound(res, "Venue not found");
      }

      venue.is_active = true;
      await venue.save();

      success(res, venue, "Venue restored successfully");
    } catch (err) {
      console.error("Restore venue error:", err);
      error(res, "Failed to restore venue", 500);
    }
  }
);

// @desc    Get venue statistics
// @route   GET /api/venues/stats/overview
// @access  Private/Admin
router.get("/stats/overview", protect, adminOnly, async (req, res) => {
  try {
    const [
      totalVenues,
      activeVenues,
      sportsVenues,
      entertainmentVenues,
      bothVenues,
    ] = await Promise.all([
      Venue.countDocuments(),
      Venue.countDocuments({ is_active: true }),
      Venue.countDocuments({ venue_type: "sports", is_active: true }),
      Venue.countDocuments({ venue_type: "entertainment", is_active: true }),
      Venue.countDocuments({ venue_type: "both", is_active: true }),
    ]);

    const stats = {
      total_venues: totalVenues,
      active_venues: activeVenues,
      inactive_venues: totalVenues - activeVenues,
      sports_venues: sportsVenues,
      entertainment_venues: entertainmentVenues,
      both_venues: bothVenues,
    };

    success(res, stats, "Venue statistics retrieved successfully");
  } catch (err) {
    console.error("Get venue stats error:", err);
    error(res, "Failed to retrieve venue statistics", 500);
  }
});

module.exports = router;
