const express = require("express");
const Partner = require("../models/Partner");
// const {generateToken} = require("../utils/auth")
const {
  success,
  error,
  created,
  notFound,
  paginated,
} = require("../utils/response");
const { protect, adminOnly, optionalAuth } = require("../middleware/auth");
const {
  validatePartner,
  validatePagination,
  validateObjectId,
} = require("../middleware/validation");

const router = express.Router();

// @desc    Get all partners
// @route   GET /api/partners
// @access  Public
router.get("/", optionalAuth, validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build query
    let query = { is_active: true };

    // Filter by partnership type
    if (req.query.partnership_type) {
      query.partnership_type = {
        $regex: req.query.partnership_type,
        $options: "i",
      };
    }

    // Search by company name or description
    if (req.query.search) {
      query.$text = { $search: req.query.search };
    }

    // Get partners and total count
    const [partners, total] = await Promise.all([
      Partner.find(query).sort({ created_at: -1 }).skip(skip).limit(limit),
      Partner.countDocuments(query),
    ]);

    if (limit === 0) {
      // Return all partners without pagination
      const allPartners = await Partner.find(query).sort({ created_at: -1 });
      return success(res, allPartners, "Partners retrieved successfully");
    }

    paginated(
      res,
      partners,
      page,
      limit,
      total,
      "Partners retrieved successfully"
    );
  } catch (err) {
    console.error("Get partners error:", err);
    error(res, "Failed to retrieve partners", 500);
  }
});

// @desc    Get single partner
// @route   GET /api/partners/:id
// @access  Public
router.get("/:id", validateObjectId, async (req, res) => {
  try {
    const partner = await Partner.findByCustomId(req.params.id);
    if (!partner) {
      return notFound(res, "Partner not found");
    }

    success(res, partner, "Partner retrieved successfully");
  } catch (err) {
    console.error("Get partner error:", err);
    error(res, "Failed to retrieve partner", 500);
  }
});

// @desc    Create partner
// @route   POST /api/partners
// @access  Private/Admin
router.post("/", protect, adminOnly, validatePartner, async (req, res) => {
  try {
    const {
      company_name,
      contact_person,
      email,
      phone,
      partnership_type,
      description,
      website,
      image,
      location,
    } = req.body;

    const partner = await Partner.create({
      company_name,
      contact_person,
      email,
      phone,
      partnership_type,
      description,
      website,
      image,
      location,
    });

    created(res, partner, "Partner created successfully");
  } catch (err) {
    console.error("Create partner error:", err);
    if (err.code === 11000) {
      error(res, "Partner with this email already exists", 400);
    } else {
      error(res, "Failed to create partner", 500);
    }
  }
});

// @desc    Update partner
// @route   PUT /api/partners/:id
// @access  Private/Admin
router.put(
  "/:id",
  protect,
  adminOnly,
  validateObjectId,
  validatePartner,
  async (req, res) => {
    try {
      const {
        company_name,
        contact_person,
        email,
        phone,
        partnership_type,
        description,
        website,
        image,
        location,
      } = req.body;

      const partner = await Partner.findByCustomId(req.params.id);
      if (!partner) {
        return notFound(res, "Partner not found");
      }

      // Update fields
      partner.company_name = company_name;
      partner.contact_person = contact_person;
      partner.email = email;
      partner.phone = phone;
      partner.partnership_type = partnership_type;
      partner.description = description;
      partner.website = website;
      partner.image = image;
      partner.location = location;

      await partner.save();

      success(res, partner, "Partner updated successfully");
    } catch (err) {
      console.error("Update partner error:", err);
      error(res, "Failed to update partner", 500);
    }
  }
);

// @desc    Delete partner (soft delete)
// @route   DELETE /api/partners/:id
// @access  Private/Admin
router.delete(
  "/:id",
  protect,
  adminOnly,
  validateObjectId,
  async (req, res) => {
    try {
      const partner = await Partner.findByCustomId(req.params.id);
      if (!partner) {
        return notFound(res, "Partner not found");
      }

      // Soft delete
      partner.is_active = false;
      await partner.save();

      success(res, null, "Partner deleted successfully");
    } catch (err) {
      console.error("Delete partner error:", err);
      error(res, "Failed to delete partner", 500);
    }
  }
);

// @desc    Restore partner
// @route   PUT /api/partners/:id/restore
// @access  Private/Admin
router.put(
  "/:id/restore",
  protect,
  adminOnly,
  validateObjectId,
  async (req, res) => {
    try {
      const partner = await Partner.findOne({ id: req.params.id });
      if (!partner) {
        return notFound(res, "Partner not found");
      }

      partner.is_active = true;
      await partner.save();

      success(res, partner, "Partner restored successfully");
    } catch (err) {
      console.error("Restore partner error:", err);
      error(res, "Failed to restore partner", 500);
    }
  }
);

// @desc    Get partnership types
// @route   GET /api/partners/types/list
// @access  Public
router.get("/types/list", async (req, res) => {
  try {
    const partnershipTypes = await Partner.distinct("partnership_type", {
      is_active: true,
    });
    success(res, partnershipTypes, "Partnership types retrieved successfully");
  } catch (err) {
    console.error("Get partnership types error:", err);
    error(res, "Failed to retrieve partnership types", 500);
  }
});

// @desc    Get partner statistics
// @route   GET /api/partners/stats/overview
// @access  Private/Admin
router.get("/stats/overview", protect, adminOnly, async (req, res) => {
  try {
    const [totalPartners, activePartners, recentPartners] = await Promise.all([
      Partner.countDocuments(),
      Partner.countDocuments({ is_active: true }),
      Partner.countDocuments({
        created_at: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        is_active: true,
      }),
    ]);

    // Get partnership type distribution
    const partnershipTypeStats = await Partner.aggregate([
      { $match: { is_active: true } },
      { $group: { _id: "$partnership_type", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const stats = {
      total_partners: totalPartners,
      active_partners: activePartners,
      inactive_partners: totalPartners - activePartners,
      recent_partners_30_days: recentPartners,
      partnership_type_distribution: partnershipTypeStats,
    };

    success(res, stats, "Partner statistics retrieved successfully");
  } catch (err) {
    console.error("Get partner stats error:", err);
    error(res, "Failed to retrieve partner statistics", 500);
  }
});

module.exports = router;
