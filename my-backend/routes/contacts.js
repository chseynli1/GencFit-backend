const express = require("express");
const Contact = require("../models/Contact");
const {
  success,
  error,
  created,
  notFound,
  paginated,
} = require("../utils/response");
const { protect, adminOnly } = require("../middleware/auth");
const {
  validateContact,
  validatePagination,
  validateObjectId,
} = require("../middleware/validation");

const router = express.Router();

// @desc    Create contact message
// @route   POST /api/contacts
// @access  Public
router.post("/", validateContact, async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    const contact = await Contact.create({
      name,
      email,
      phone,
      subject,
      message,
    });

    created(res, contact, "Contact message sent successfully");
  } catch (err) {
    console.error("Create contact error:", err);
    error(res, "Failed to send contact message", 500);
  }
});

// @desc    Get all contact messages
// @route   GET /api/contacts
// @access  Private/Admin
router.get("/", protect, adminOnly, validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build query
    let query = {};

    // Filter by resolution status
    if (req.query.is_resolved !== undefined) {
      query.is_resolved = req.query.is_resolved === "true";
    }

    // Search by name, email, or subject
    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: "i" } },
        { email: { $regex: req.query.search, $options: "i" } },
        { subject: { $regex: req.query.search, $options: "i" } },
      ];
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

    // Get contacts and total count
    const [contacts, total] = await Promise.all([
      Contact.find(query).sort({ created_at: -1 }).skip(skip).limit(limit),
      Contact.countDocuments(query),
    ]);

    if (limit === 0) {
      // Return all contacts without pagination
      const allContacts = await Contact.find(query).sort({ created_at: -1 });
      return success(
        res,
        allContacts,
        "Contact messages retrieved successfully"
      );
    }

    paginated(
      res,
      contacts,
      page,
      limit,
      total,
      "Contact messages retrieved successfully"
    );
  } catch (err) {
    console.error("Get contacts error:", err);
    error(res, "Failed to retrieve contact messages", 500);
  }
});

// @desc    Get single contact message
// @route   GET /api/contacts/:id
// @access  Private/Admin
router.get("/:id", protect, adminOnly, validateObjectId, async (req, res) => {
  try {
    const contact = await Contact.findByCustomId(req.params.id);
    if (!contact) {
      return notFound(res, "Contact message not found");
    }

    success(res, contact, "Contact message retrieved successfully");
  } catch (err) {
    console.error("Get contact error:", err);
    error(res, "Failed to retrieve contact message", 500);
  }
});

// @desc    Mark contact as resolved
// @route   PUT /api/contacts/:id/resolve
// @access  Private/Admin
router.put(
  "/:id/resolve",
  protect,
  adminOnly,
  validateObjectId,
  async (req, res) => {
    try {
      const contact = await Contact.findByCustomId(req.params.id);
      if (!contact) {
        return notFound(res, "Contact message not found");
      }

      if (contact.is_resolved) {
        return error(res, "Contact message is already resolved", 400);
      }

      contact.is_resolved = true;
      contact.resolved_at = new Date();
      await contact.save();

      success(res, contact, "Contact message marked as resolved");
    } catch (err) {
      console.error("Resolve contact error:", err);
      error(res, "Failed to resolve contact message", 500);
    }
  }
);

// @desc    Mark contact as unresolved
// @route   PUT /api/contacts/:id/unresolve
// @access  Private/Admin
router.put(
  "/:id/unresolve",
  protect,
  adminOnly,
  validateObjectId,
  async (req, res) => {
    try {
      const contact = await Contact.findByCustomId(req.params.id);
      if (!contact) {
        return notFound(res, "Contact message not found");
      }

      if (!contact.is_resolved) {
        return error(res, "Contact message is already unresolved", 400);
      }

      contact.is_resolved = false;
      contact.resolved_at = null;
      await contact.save();

      success(res, contact, "Contact message marked as unresolved");
    } catch (err) {
      console.error("Unresolve contact error:", err);
      error(res, "Failed to unresolve contact message", 500);
    }
  }
);

// @desc    Delete contact message
// @route   DELETE /api/contacts/:id
// @access  Private/Admin
router.delete(
  "/:id",
  protect,
  adminOnly,
  validateObjectId,
  async (req, res) => {
    try {
      const contact = await Contact.findByCustomId(req.params.id);
      if (!contact) {
        return notFound(res, "Contact message not found");
      }

      await Contact.deleteOne({ id: req.params.id });

      success(res, null, "Contact message deleted successfully");
    } catch (err) {
      console.error("Delete contact error:", err);
      error(res, "Failed to delete contact message", 500);
    }
  }
);

// @desc    Get contact statistics
// @route   GET /api/contacts/stats/overview
// @access  Private/Admin
router.get("/stats/overview", protect, adminOnly, async (req, res) => {
  try {
    const [totalContacts, resolvedContacts, pendingContacts, recentContacts] =
      await Promise.all([
        Contact.countDocuments(),
        Contact.countDocuments({ is_resolved: true }),
        Contact.countDocuments({ is_resolved: false }),
        Contact.countDocuments({
          created_at: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        }),
      ]);

    // Get monthly contact trends
    const monthlyTrends = await Contact.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$created_at" },
            month: { $month: "$created_at" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
      { $limit: 12 },
    ]);

    const stats = {
      total_contacts: totalContacts,
      resolved_contacts: resolvedContacts,
      pending_contacts: pendingContacts,
      recent_contacts_30_days: recentContacts,
      monthly_trends: monthlyTrends,
    };

    success(res, stats, "Contact statistics retrieved successfully");
  } catch (err) {
    console.error("Get contact stats error:", err);
    error(res, "Failed to retrieve contact statistics", 500);
  }
});

module.exports = router;
