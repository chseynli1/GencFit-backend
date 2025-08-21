const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { generateToken } = require("../utils/auth");
const { success, error, created, unauthorized } = require("../utils/response");
const {
  validateUserRegistration,
  validateUserLogin,
} = require("../middleware/validation");
const { protect } = require("../middleware/auth");

const router = express.Router();

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
router.post("/register", validateUserRegistration, async (req, res) => {
  try {
    const { email, password, full_name, role = "user" } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return error(res, "Email already registered", 400);
    }

    // Create user
    const user = await User.create({
      email,
      password,
      full_name,
      role,
    });

    // Generate token
    const token = generateToken(user.id);

    // User response without password
    const userResponse = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active,
      created_at: user.created_at,
    };

    created(
      res,
      {
        access_token: token,
        token_type: "bearer",
        user: userResponse,
      },
      "User registered successfully"
    );
  } catch (err) {
    console.error("Registration error:", err);
    error(res, "Registration failed", 500);
  }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post("/login", validateUserLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user with password field
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return unauthorized(res, "Invalid email or password");
    }

    // Check if user is active
    if (!user.is_active) {
      return unauthorized(res, "Account is deactivated");
    }

    // Validate password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return unauthorized(res, "Invalid email or password");
    }

    // Update last login
    user.last_login = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user.id);

    // User response without password
    const userResponse = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active,
      created_at: user.created_at,
      last_login: user.last_login,
    };

    success(
      res,
      {
        access_token: token,
        token_type: "bearer",
        user: userResponse,
      },
      "Login successful"
    );
  } catch (err) {
    console.error("Login error:", err);
    error(res, "Login failed", 500);
  }
});

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
router.get("/me", protect, async (req, res) => {
  try {
    const userResponse = {
      id: req.user.id,
      email: req.user.email,
      full_name: req.user.full_name,
      role: req.user.role,
      is_active: req.user.is_active,
      created_at: req.user.created_at,
      last_login: req.user.last_login,
    };

    success(res, userResponse, "User profile retrieved successfully");
  } catch (err) {
    console.error("Get profile error:", err);
    error(res, "Failed to get user profile", 500);
  }
});

// @desc    Update user profile
// @route   PUT /api/auth/me
// @access  Private
router.put("/me", protect, async (req, res) => {
  try {
    const { full_name } = req.body;

    // Update user
    const user = await User.findByCustomId(req.user.id);
    if (!user) {
      return error(res, "User not found", 404);
    }

    if (full_name) user.full_name = full_name;
    await user.save();

    const userResponse = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active,
      created_at: user.created_at,
    };

    success(res, userResponse, "Profile updated successfully");
  } catch (err) {
    console.error("Update profile error:", err);
    error(res, "Failed to update profile", 500);
  }
});

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
router.put("/change-password", protect, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return error(res, "Current password and new password are required", 400);
    }

    if (new_password.length < 6) {
      return error(res, "New password must be at least 6 characters long", 400);
    }

    // Get user with password
    const user = await User.findByCustomId(req.user.id).select("+password");
    if (!user) {
      return error(res, "User not found", 404);
    }

    // Check current password
    const isCurrentPasswordValid = await user.comparePassword(current_password);
    if (!isCurrentPasswordValid) {
      return unauthorized(res, "Current password is incorrect");
    }

    // Update password
    user.password = new_password;
    await user.save();

    success(res, null, "Password changed successfully");
  } catch (err) {
    console.error("Change password error:", err);
    error(res, "Failed to change password", 500);
  }
});

module.exports = router;
