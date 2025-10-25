require('dotenv').config();
const mongoose = require("mongoose");
const Partner = require("./models/Partner");
const User = require("./models/User");


mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function linkPartners() {
  const partners = await Partner.find({}); // bütün partner-ları al
  const testUsers = await User.find({ email: /test/i }); // test user-ları al

  for (let i = 0; i < partners.length && i < testUsers.length; i++) {
    partners[i].user = testUsers[i]._id;
    await partners[i].save();
    console.log(`Partner ${partners[i].company_name} -> User ${testUsers[i].full_name}`);
  }

  console.log("Bütün test partner-lar user-larla bağlandı ✅");
  process.exit();
}

linkPartners().catch(err => {
  console.error(err);
  process.exit(1);
});
