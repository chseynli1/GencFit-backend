const express = require("express");
const User = require("../models/User");
const { success, error, notFound, paginated } = require("../utils/response");
const { protect, adminOnly } = require("../middleware/auth");
const {
  validatePagination,
  validateObjectId,
} = require("../middleware/validation");
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Şəkillər üçün qovluq
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });


// Temporary public route for testing users
router.get("/test-users", async (req, res) => {
  try {
    const users = await User.find(); // bütün istifadəçiləri gətir
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to get users" });
  }
});

// @desc    Get logged-in user info
// @route   GET /api/users/me
// @access  Private
router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) return notFound(res, "User not found");

    const userResponse = {
      id: user._id.toString(),
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      phone: user.phone || "",
      location: user.location || "",
      image: user.image,
      is_active: user.is_active,
      last_login: user.last_login,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    };

    return success(res, userResponse, "User retrieved successfully");

  } catch (err) {
    console.error(err);
    return error(res, "Failed to retrieve user", 500);
  }
});



// Apply authentication to all routes
router.use(protect);
// router.use(adminOnly); // All user management routes require admin access

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
router.get("/", validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build query
    let query = {};

    // Filter by role
    if (req.query.role && ["user", "admin"].includes(req.query.role)) {
      query.role = req.query.role;
    }

    // Filter by active status
    if (req.query.is_active !== undefined) {
      query.is_active = req.query.is_active === "true";
    }

    // Search by name or email
    if (req.query.search) {
      query.$or = [
        { full_name: { $regex: req.query.search, $options: "i" } },
        { email: { $regex: req.query.search, $options: "i" } },
      ];
    }

    // Get users and total count
    const [users, total] = await Promise.all([
      User.find(query)
        .select("-password")
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query),
    ]);

    const usersResponse = users.map((user) => ({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active,
      phone: user.phone,
      location: user.location,
      created_at: user.created_at,
      last_login: user.last_login,

    }));

    paginated(
      res,
      usersResponse,
      page,
      limit,
      total,
      "Users retrieved successfully"
    );
  } catch (err) {
    console.error("Get users error:", err);
    error(res, "Failed to retrieve users", 500);
  }
});

// @desc    Get user statistics
// @route   GET /api/users/stats
// @access  Private/Admin
router.get("/stats/overview", async (req, res) => {
  try {
    const [totalUsers, activeUsers, adminUsers, recentUsers] =
      await Promise.all([
        User.countDocuments(),
        User.countDocuments({ is_active: true }),
        User.countDocuments({ role: "admin" }),
        User.countDocuments({
          created_at: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        }),
      ]);

    const stats = {
      total_users: totalUsers,
      active_users: activeUsers,
      inactive_users: totalUsers - activeUsers,
      admin_users: adminUsers,
      regular_users: totalUsers - adminUsers,
      recent_users_30_days: recentUsers,
    };

    success(res, stats, "User statistics retrieved successfully");
  } catch (err) {
    console.error("Get user stats error:", err);
    error(res, "Failed to retrieve user statistics", 500);
  }
});

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private/Admin


router.get("/:id", validateObjectId, async (req, res) => {
  try {
    const user = await User.findByCustomId(req.params.id).select("-password");
    if (!user) {
      return notFound(res, "User not found");
    }

    const userResponse = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active,
      phone: user.phone,
      location: user.location,
      created_at: user.created_at,
      last_login: user.last_login,
    };

    success(res, userResponse, "User retrieved successfully");
  } catch (err) {
    console.error("Get user error:", err);
    error(res, "Failed to retrieve user", 500);
  }
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin



router.put("/:id", validateObjectId, async (req, res) => {
  try {
    const { full_name, role, is_active } = req.body;

    const user = await User.findByCustomId(req.params.id);
    if (!user) {
      return notFound(res, "User not found");
    }

    // Prevent admin from deactivating themselves
    if (req.user.id === user.id && is_active === false) {
      return error(res, "You cannot deactivate your own account", 400);
    }

    // Update fields
    if (full_name !== undefined) user.full_name = full_name;
    if (role !== undefined && ["user", "admin"].includes(role))
      user.role = role;
    if (is_active !== undefined) user.is_active = is_active;

    await user.save();

    const userResponse = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      phone: user.phone,
      location: user.location,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };

    success(res, userResponse, "User updated successfully");
  } catch (err) {
    console.error("Update user error:", err);
    error(res, "Failed to update user", 500);
  }
});

// @desc    Toggle user active status
// @route   PUT /api/users/:id/toggle-active
// @access  Private/Admin
router.put("/:id/toggle-active", validateObjectId, async (req, res) => {
  try {
    const user = await User.findByCustomId(req.params.id);
    if (!user) {
      return notFound(res, "User not found");
    }

    // Prevent admin from deactivating themselves
    if (req.user.id === user.id) {
      return error(res, "You cannot change your own active status", 400);
    }

    // Toggle status
    user.is_active = !user.is_active;
    await user.save();

    const statusMessage = user.is_active ? "activated" : "deactivated";
    success(
      res,
      { is_active: user.is_active },
      `User ${statusMessage} successfully`
    );
  } catch (err) {
    console.error("Toggle user status error:", err);
    error(res, "Failed to toggle user status", 500);
  }
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
router.delete("/:id", validateObjectId, async (req, res) => {
  try {
    const user = await User.findByCustomId(req.params.id);
    if (!user) {
      return notFound(res, "User not found");
    }

    // Prevent admin from deleting themselves
    if (req.user.id === user.id) {
      return error(res, "You cannot delete your own account", 400);
    }

    await User.deleteOne({ id: req.params.id });
    success(res, null, "User deleted successfully");
  } catch (err) {
    console.error("Delete user error:", err);
    error(res, "Failed to delete user", 500);
  }
});

// Profil məlumatlarını yenilə + avatar upload
router.put('/profile/:id', upload.single('image'), async (req, res) => {
  try {
    const updateData = {
      full_name: req.body.full_name,
      email: req.body.email,
      phone: req.body.phone,
      location: req.body.location,
    };

    if (req.file?.path) {
      updateData.image = req.file.path;
    }

    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});





module.exports = router;
