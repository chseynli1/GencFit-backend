const router = require("express").Router();
const passport = require("passport");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User"); // User mongoose modelini özün yaratmısan deyə fərz edirəm
const { protect } = require("../middleware/auth");
// Token yaratmaq funksiyası
const createToken = (user) => jwt.sign({ id: user._id.toString(), email: user.email }, process.env.JWT_SECRET, { expiresIn: "1h" });

//
// =============================
//   Google OAuth Routes
// =============================
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/?error=unauthorized" }),
  (req, res) => {
    console.log("=== CALLBACK ROUTE ===");
    console.log("req.user:", req.user);

    if (!req.user) {
      console.log("req.user undefined!");
      return res.redirect("/?error=unauthorized");
    }

    try {
      const token = createToken(req.user);
      console.log("TOKEN:", token);
      res.redirect(`http://localhost:3000?token=${token}`);
    } catch (err) {
      console.error("JWT create error:", err);
      res.status(500).json({ message: "JWT yaratmaq alınmadı" });
    }
  }
);

//
// =============================
//   Register (email/password)
// =============================
router.post("/register", async (req, res) => {
  try {
    const { email, password, full_name } = req.body;

    // required field check
    if (!email || !password || !full_name) {
      return res.status(400).json({ message: "Email, password və full_name tələb olunur" });
    }

    // user mövcuddursa error qaytar
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Yeni user yarat (password avtomatik hash olunur schema-da)
    const newUser = new User({
      email,
      password,
      full_name,
    });

    await newUser.save();

    const token = createToken(newUser);
    res.status(201).json({ token, user: newUser });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

//
// =============================
//   Login (email/password)
// =============================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // user tap
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // şifrəni yoxla
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = createToken(user);
    res.json({ token, user });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/me", protect, async (req, res) => {
  try {
    if (!req.user) return res.status(404).json({ message: "User not found" });
    res.json({ user: req.user });
  } catch (err) {
    console.error("ME route error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
