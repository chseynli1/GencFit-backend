const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL, {
      dbName: process.env.DB_NAME, 
    });

    console.log(`✅ MongoDB Connected: ${mongoose.connection.host}`);
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
