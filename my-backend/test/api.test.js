const request = require("supertest");
const app = require("../server");
const User = require("../models/User");
const Venue = require("../models/Venue");

describe("Sports & Entertainment Platform API", () => {
  let userToken;
  let adminToken;
  let testUser;
  let testAdmin;
  let testVenue;

  beforeAll(async () => {
    // Clean up database before tests
    await User.deleteMany({});
    await Venue.deleteMany({});
  });

  afterAll(async () => {
    // Clean up database after tests
    await User.deleteMany({});
    await Venue.deleteMany({});
  });

  describe("Authentication", () => {
    it("should register a new user", async () => {
      const userData = {
        email: "test@example.com",
        password: "password123",
        full_name: "Test User",
        role: "user",
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.access_token).toBeDefined();
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.role).toBe("user");

      userToken = response.body.data.access_token;
      testUser = response.body.data.user;
    });

    it("should register an admin user", async () => {
      const adminData = {
        email: "admin@example.com",
        password: "adminpass123",
        full_name: "Test Admin",
        role: "admin",
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(adminData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.role).toBe("admin");

      adminToken = response.body.data.access_token;
      testAdmin = response.body.data.user;
    });

    it("should login with valid credentials", async () => {
      const loginData = {
        email: "test@example.com",
        password: "password123",
      };

      const response = await request(app)
        .post("/api/auth/login")
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.access_token).toBeDefined();
    });

    it("should not login with invalid credentials", async () => {
      const loginData = {
        email: "test@example.com",
        password: "wrongpassword",
      };

      const response = await request(app)
        .post("/api/auth/login")
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it("should get current user profile", async () => {
      const response = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe("test@example.com");
    });
  });

  describe("Venues", () => {
    it("should create a venue (admin only)", async () => {
      const venueData = {
        name: "Test Sports Complex",
        description: "A comprehensive sports facility for testing",
        venue_type: "sports",
        location: "123 Test Street, Test City",
        capacity: 500,
        amenities: ["Parking", "WiFi", "Cafeteria"],
        contact_phone: "+1-555-0123",
        contact_email: "contact@testsports.com",
      };

      const response = await request(app)
        .post("/api/venues")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(venueData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(venueData.name);
      expect(response.body.data.venue_type).toBe(venueData.venue_type);

      testVenue = response.body.data;
    });

    it("should not allow regular user to create venue", async () => {
      const venueData = {
        name: "Unauthorized Venue",
        description: "This should fail",
        venue_type: "sports",
        location: "Nowhere",
        capacity: 100,
        amenities: [],
        contact_phone: "+1-555-0000",
        contact_email: "fail@test.com",
      };

      const response = await request(app)
        .post("/api/venues")
        .set("Authorization", `Bearer ${userToken}`)
        .send(venueData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it("should get all venues (public)", async () => {
      const response = await request(app).get("/api/venues").expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it("should get single venue by ID", async () => {
      const response = await request(app)
        .get(`/api/venues/${testVenue.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testVenue.id);
      expect(response.body.data.name).toBe(testVenue.name);
    });

    it("should update venue (admin only)", async () => {
      const updateData = {
        name: "Updated Sports Complex",
        description: "Updated description",
        venue_type: "sports",
        location: "123 Test Street, Test City",
        capacity: 600,
        amenities: ["Parking", "WiFi", "Cafeteria", "Restaurant"],
        contact_phone: "+1-555-0123",
        contact_email: "contact@testsports.com",
      };

      const response = await request(app)
        .put(`/api/venues/${testVenue.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.capacity).toBe(updateData.capacity);
    });
  });

  describe("Users Management", () => {
    it("should get all users (admin only)", async () => {
      const response = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it("should not allow regular user to access users list", async () => {
      const response = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe("Dashboard", () => {
    it("should get dashboard stats (admin only)", async () => {
      const response = await request(app)
        .get("/api/dashboard/stats")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("total_users");
      expect(response.body.data).toHaveProperty("active_users");
      expect(response.body.data).toHaveProperty("total_venues");
      expect(response.body.data.total_users).toBeGreaterThanOrEqual(2);
    });

    it("should not allow regular user to access dashboard stats", async () => {
      const response = await request(app)
        .get("/api/dashboard/stats")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe("Error Handling", () => {
    it("should return 404 for non-existent endpoint", async () => {
      const response = await request(app).get("/api/nonexistent").expect(404);

      expect(response.body.success).toBe(false);
    });

    it("should return 401 for protected routes without token", async () => {
      const response = await request(app).get("/api/auth/me").expect(401);

      expect(response.body.success).toBe(false);
    });

    it("should return 401 for invalid token", async () => {
      const response = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer invalidtoken")
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe("Validation", () => {
    it("should validate required fields for user registration", async () => {
      const invalidData = {
        email: "invalid-email",
        password: "123", // Too short
        // Missing full_name
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it("should validate required fields for venue creation", async () => {
      const invalidVenueData = {
        name: "A", // Too short
        // Missing required fields
      };

      const response = await request(app)
        .post("/api/venues")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(invalidVenueData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
