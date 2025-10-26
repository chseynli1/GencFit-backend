const cron = require("node-cron");
const Appointment = require("../models/Appointment");

function registerAppointmentCron() {
  cron.schedule("*/15 * * * *", async () => {
    try {
      const now = new Date();
      const result = await Appointment.updateMany(
        { appointment_date: { $lt: now }, status: { $in: ["pending", "confirmed"] } },
        { $set: { status: "completed", updated_at: now } }
      );
      if (result.modifiedCount) {
        console.log(`✅ Completed: ${result.modifiedCount} appointments`);
      }
    } catch (e) {
      console.error("⛔ appointment cron error:", e);
    }
  });
}

module.exports = { registerAppointmentCron };
