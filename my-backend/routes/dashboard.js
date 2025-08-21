const express = require("express");
const User = require("../models/User");
const Venue = require("../models/Venue");
const Blog = require("../models/Blog");
const Partner = require("../models/Partner");
const Review = require("../models/Review");
const Contact = require("../models/Contact");
const Appointment = require("../models/Appointment");
const { success, error } = require("../utils/response");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private/Admin
router.get("/stats", protect, adminOnly, async (req, res) => {
  try {
    // Get basic counts
    const [
      totalUsers,
      activeUsers,
      totalVenues,
      totalBlogs,
      totalPartners,
      totalReviews,
      pendingContacts,
      pendingAppointments,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ is_active: true }),
      Venue.countDocuments({ is_active: true }),
      Blog.countDocuments({ is_published: true }),
      Partner.countDocuments({ is_active: true }),
      Review.countDocuments(),
      Contact.countDocuments({ is_resolved: false }),
      Appointment.countDocuments({ status: "pending" }),
    ]);

    const stats = {
      total_users: totalUsers,
      active_users: activeUsers,
      total_venues: totalVenues,
      total_blogs: totalBlogs,
      total_partners: totalPartners,
      total_reviews: totalReviews,
      pending_contacts: pendingContacts,
      pending_appointments: pendingAppointments,
    };

    success(res, stats, "Dashboard statistics retrieved successfully");
  } catch (err) {
    console.error("Get dashboard stats error:", err);
    error(res, "Failed to retrieve dashboard statistics", 500);
  }
});

// @desc    Get detailed analytics
// @route   GET /api/dashboard/analytics
// @access  Private/Admin
router.get("/analytics", protect, adminOnly, async (req, res) => {
  try {
    // User analytics
    const userRegistrationTrends = await User.aggregate([
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

    // Blog analytics
    const blogPublishingTrends = await Blog.aggregate([
      { $match: { is_published: true } },
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

    // Appointment analytics
    const appointmentTrends = await Appointment.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$created_at" },
            month: { $month: "$created_at" },
            status: "$status",
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
      { $limit: 24 },
    ]);

    // Review analytics
    const reviewAnalytics = await Review.aggregate([
      {
        $group: {
          _id: "$entity_type",
          count: { $sum: 1 },
          average_rating: { $avg: "$rating" },
        },
      },
    ]);

    // Top venues by appointments
    const topVenuesByAppointments = await Appointment.aggregate([
      {
        $group: {
          _id: "$venue_id",
          count: { $sum: 1 },
          venue_name: { $first: "$venue_name" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Top blogs by author
    const topBlogAuthors = await Blog.aggregate([
      { $match: { is_published: true } },
      {
        $group: {
          _id: "$author_id",
          count: { $sum: 1 },
          author_name: { $first: "$author_name" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    const analytics = {
      user_registration_trends: userRegistrationTrends,
      blog_publishing_trends: blogPublishingTrends,
      appointment_trends: appointmentTrends,
      review_analytics: reviewAnalytics,
      top_venues_by_appointments: topVenuesByAppointments,
      top_blog_authors: topBlogAuthors,
    };

    success(res, analytics, "Dashboard analytics retrieved successfully");
  } catch (err) {
    console.error("Get dashboard analytics error:", err);
    error(res, "Failed to retrieve dashboard analytics", 500);
  }
});

// @desc    Get recent activities
// @route   GET /api/dashboard/activities
// @access  Private/Admin
router.get("/activities", protect, adminOnly, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    // Get recent users
    const recentUsers = await User.find()
      .select("full_name email role created_at")
      .sort({ created_at: -1 })
      .limit(5);

    // Get recent blogs
    const recentBlogs = await Blog.find({ is_published: true })
      .select("title author_name created_at")
      .sort({ created_at: -1 })
      .limit(5);

    // Get recent appointments
    const recentAppointments = await Appointment.find()
      .select("user_name venue_name appointment_date status created_at")
      .sort({ created_at: -1 })
      .limit(5);

    // Get recent contacts
    const recentContacts = await Contact.find()
      .select("name subject is_resolved created_at")
      .sort({ created_at: -1 })
      .limit(5);

    // Get recent reviews
    const recentReviews = await Review.find()
      .select("user_name entity_type rating comment created_at")
      .sort({ created_at: -1 })
      .limit(5);

    const activities = {
      recent_users: recentUsers,
      recent_blogs: recentBlogs,
      recent_appointments: recentAppointments,
      recent_contacts: recentContacts,
      recent_reviews: recentReviews,
    };

    success(res, activities, "Recent activities retrieved successfully");
  } catch (err) {
    console.error("Get dashboard activities error:", err);
    error(res, "Failed to retrieve recent activities", 500);
  }
});

// @desc    Get system health
// @route   GET /api/dashboard/health
// @access  Private/Admin
router.get("/health", protect, adminOnly, async (req, res) => {
  try {
    const health = {
      server: {
        status: "healthy",
        uptime: process.uptime(),
        memory_usage: process.memoryUsage(),
        node_version: process.version,
        environment: process.env.NODE_ENV || "development",
      },
      database: {
        status: "connected",
        connection_state: "active",
      },
      api: {
        status: "operational",
        version: "1.0.0",
      },
      timestamp: new Date().toISOString(),
    };

    success(res, health, "System health retrieved successfully");
  } catch (err) {
    console.error("Get system health error:", err);
    error(res, "Failed to retrieve system health", 500);
  }
});

module.exports = router;
