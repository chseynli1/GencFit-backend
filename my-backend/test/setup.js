const mongoose = require("mongoose");

// Setup test database connection
beforeAll(async () => {
  // Use test database
  const MONGO_URL =
    process.env.MONGO_URL || "mongodb://localhost:27017/sports_platform_test";

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  }
});

// Clean up after all tests
afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});

jest.setTimeout(30000);
