const express = require("express");
const cron = require("node-cron");
const Appointment = require("../models/Appointment");
const Venue = require("../models/Venue");
const {
  success,
  error,
  created,
  notFound,
  paginated,
  badRequest,
  forbidden,
} = require("../utils/response");
const { protect, adminOnly } = require("../middleware/auth");
const {
  validateAppointment,
  validateAppointmentStatus,
  validatePagination,
  validateObjectId,
} = require("../middleware/validation");

const router = express.Router();


const cron = require("node-cron");
const Appointment = require("../models/Appointment");

function registerAppointmentCron() {
  // Hər 15 dəqiqədən bir
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



// @desc    Create appointment
// @route   POST /api/appointments
// @access  Private
router.post("/", protect, validateAppointment, async (req, res) => {
  try {
    const {
      venue_id,
      appointment_date,
      duration_hours = 1,
      purpose,
      notes = "",
    } = req.body; // ⬅️ venue_name-ı bura almağa ehtiyac yoxdur

    // 1) Venue var və aktivdir?
    const venue = await Venue.findByCustomId(venue_id);
    if (!venue || venue.is_active === false) {
      return notFound(res, "Venue not found or inactive");
    }

    // 2) Tarixi obyektə çevir və gələcək olmasını yoxla
    const dt = new Date(appointment_date); // FE ISO string göndərsin
    if (isNaN(dt.getTime())) {
      return badRequest(res, "Invalid appointment date");
    }
    if (dt <= new Date()) {
      return badRequest(res, "Appointment date must be in the future");
    }

    // 3) Zaman toqquşması (basic overlap)
    const windowMs = duration_hours * 60 * 60 * 1000;
    const conflictingAppointment = await Appointment.findOne({
      venue_id,
      appointment_date: {
        $gte: new Date(dt.getTime() - windowMs),
        $lte: new Date(dt.getTime() + windowMs),
      },
      status: { $in: ["pending", "confirmed"] },
    });
    if (conflictingAppointment) {
      return badRequest(res, "Time slot is not available");
    }

    const appointment = await Appointment.create({
      id: undefined, 
      user_id: req.user.id,
      user_name: req.user.full_name,
      venue_id,
      venue_name: venue.name, 
      appointment_date: dt,  
      duration_hours,
      purpose: (purpose || "").trim(),
      notes: (notes || "").trim(),
    });

    return created(res, appointment, "Appointment booked successfully");
  } catch (err) {
    // Validation error-ları açıq qaytar
    if (err.name === "ValidationError") {
      return badRequest(res, {
        message: "Validation failed",
        errors: Object.fromEntries(
          Object.entries(err.errors).map(([k, v]) => [k, v.message])
        ),
      });
    }
    console.error("Create appointment error:", err);
    return error(res, "Failed to book appointment", 500);
  }
});

// @desc    Get appointments
// @route   GET /api/appointments
// @access  Private
router.get("/", protect, validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build query based on user role
    let query = {};

    if (req.user.role === "admin") {
      // Admin can see all appointments
      // Filter by user if specified
      if (req.query.user_id) {
        query.user_id = req.query.user_id;
      }
    } else {
      // Regular users can only see their own appointments
      query.user_id = req.user.id;
    }

    // Filter by venue
    if (req.query.venue_id) {
      query.venue_id = req.query.venue_id;
    }

    // Filter by status
    if (
      req.query.status &&
      ["pending", "confirmed", "cancelled", "completed"].includes(
        req.query.status
      )
    ) {
      query.status = req.query.status;
    }

    // Date range filter
    if (req.query.date_from) {
      query.appointment_date = {
        ...query.appointment_date,
        $gte: new Date(req.query.date_from),
      };
    }
    if (req.query.date_to) {
      query.appointment_date = {
        ...query.appointment_date,
        $lte: new Date(req.query.date_to),
      };
    }

    // Get appointments and total count
    const [appointments, total] = await Promise.all([
      Appointment.find(query)
        .sort({ appointment_date: 1 })
        .skip(skip)
        .limit(limit),
      Appointment.countDocuments(query),
    ]);

    if (limit === 0) {
      // Return all appointments without pagination
      const allAppointments = await Appointment.find(query).sort({
        appointment_date: 1,
      });
      return success(
        res,
        allAppointments,
        "Appointments retrieved successfully"
      );
    }

    paginated(
      res,
      appointments,
      page,
      limit,
      total,
      "Appointments retrieved successfully"
    );
  } catch (err) {
    console.error("Get appointments error:", err);
    error(res, "Failed to retrieve appointments", 500);
  }
});

// @desc    Get single appointment
// @route   GET /api/appointments/:id
// @access  Private
router.get("/:id", protect, validateObjectId, async (req, res) => {
  try {
    const appointment = await Appointment.findOne({ id: req.params.id });
    if (!appointment) {
      return notFound(res, "Appointment not found");
    }

    // Check if user owns the appointment or is admin
    if (appointment.user_id !== req.user.id && req.user.role !== "admin") {
      return forbidden(res, "Not authorized to view this appointment");
    }

    success(res, appointment, "Appointment retrieved successfully");
  } catch (err) {
    console.error("Get appointment error:", err);
    error(res, "Failed to retrieve appointment", 500);
  }
});

// @desc    Update appointment
// @route   PUT /api/appointments/:id
// @access  Private
router.put("/:id", protect, validateObjectId, async (req, res) => {
  try {
    const { appointment_date, duration_hours, purpose, notes } = req.body;

    const appointment = await Appointment.findByCustomId(req.params.id);
    if (!appointment) {
      return notFound(res, "Appointment not found");
    }

    // Check if user owns the appointment or is admin
    if (appointment.user_id !== req.user.id && req.user.role !== "admin") {
      return forbidden(res, "Not authorized to update this appointment");
    }

    // Don't allow updates to completed or cancelled appointments
    if (["completed", "cancelled"].includes(appointment.status)) {
      return badRequest(
        res,
        "Cannot update completed or cancelled appointments"
      );
    }

    // Update fields
    if (appointment_date) {
      const newDate = new Date(appointment_date);
      if (newDate <= new Date()) {
        return badRequest(res, "Appointment date must be in the future");
      }
      appointment.appointment_date = newDate;
    }

    if (duration_hours) appointment.duration_hours = duration_hours;
    if (purpose) appointment.purpose = purpose;
    if (notes !== undefined) appointment.notes = notes;

    await appointment.save();

    success(res, appointment, "Appointment updated successfully");
  } catch (err) {
    console.error("Update appointment error:", err);
    error(res, "Failed to update appointment", 500);
  }
});

// @desc    Update appointment status
// @route   PUT /api/appointments/:id/status
// @access  Private
router.put(
  "/:id/status",
  protect,
  validateObjectId,
  validateAppointmentStatus,
  async (req, res) => {
    try {
      const { status } = req.body;

      const appointment = await Appointment.findByCustomId(req.params.id);
      if (!appointment) {
        return notFound(res, "Appointment not found");
      }

      // Check permissions
      if (req.user.role === "admin") {
        // Admin can update any status
      } else if (appointment.user_id === req.user.id) {
        // Users can only cancel their own appointments
        if (status !== "cancelled") {
          return forbidden(res, "Users can only cancel appointments");
        }
      } else {
        return forbidden(res, "Not authorized to update this appointment");
      }

      // Prevent certain status transitions
      if (appointment.status === "completed" && status !== "completed") {
        return badRequest(
          res,
          "Cannot change status of completed appointments"
        );
      }

      appointment.status = status;
      await appointment.save();

      success(res, appointment, `Appointment status updated to ${status}`);
    } catch (err) {
      console.error("Update appointment status error:", err);
      error(res, "Failed to update appointment status", 500);
    }
  }
);

// @desc    Delete appointment
// @route   DELETE /api/appointments/:id
// @access  Private
router.delete("/:id", protect, validateObjectId, async (req, res) => {
  try {
    const appointment = await Appointment.findOne({ id: req.params.id });
    if (!appointment) {
      return notFound(res, "Appointment not found");
    }

    // Check if user owns the appointment or is admin
    if (appointment.user_id !== req.user.id && req.user.role !== "admin") {
      return forbidden(res, "Not authorized to delete this appointment");
    }

    await Appointment.deleteOne({ id: req.params.id });

    success(res, null, "Appointment deleted successfully");
  } catch (err) {
    console.error("Delete appointment error:", err);
    error(res, "Failed to delete appointment", 500);
  }
});

// @desc    Get appointment availability for a venue
// @route   GET /api/appointments/availability/:venue_id
// @access  Public
router.get("/availability/:venue_id", async (req, res) => {
  try {
    const { venue_id } = req.params;
    const { date } = req.query;

    if (!date) {
      return badRequest(res, "Date parameter is required");
    }

    // Check if venue exists
    const venue = await Venue.findByCustomId(venue_id);
    if (!venue) {
      return notFound(res, "Venue not found");
    }

    const queryDate = new Date(date);
    const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));

    // Get all appointments for the venue on the specified date
    const appointments = await Appointment.find({
      venue_id,
      appointment_date: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
      status: { $in: ["pending", "confirmed"] },
    }).sort({ appointment_date: 1 });

    const bookedSlots = appointments.map((apt) => ({
      start: apt.appointment_date,
      end: new Date(
        apt.appointment_date.getTime() + apt.duration_hours * 60 * 60 * 1000
      ),
      duration: apt.duration_hours,
    }));

    success(
      res,
      {
        venue_id,
        date: date,
        booked_slots: bookedSlots,
        total_bookings: bookedSlots.length,
      },
      "Availability retrieved successfully"
    );
  } catch (err) {
    console.error("Get availability error:", err);
    error(res, "Failed to retrieve availability", 500);
  }
});

// @desc    Get appointment statistics
// @route   GET /api/appointments/stats/overview
// @access  Private/Admin
router.get("/stats/overview", protect, adminOnly, async (req, res) => {
  try {
    const [
      totalAppointments,
      pendingAppointments,
      confirmedAppointments,
      cancelledAppointments,
      completedAppointments,
    ] = await Promise.all([
      Appointment.countDocuments(),
      Appointment.countDocuments({ status: "pending" }),
      Appointment.countDocuments({ status: "confirmed" }),
      Appointment.countDocuments({ status: "cancelled" }),
      Appointment.countDocuments({ status: "completed" }),
    ]);

    // Get appointments by venue
    const appointmentsByVenue = await Appointment.aggregate([
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

    // Get upcoming appointments
    const upcomingAppointments = await Appointment.countDocuments({
      appointment_date: { $gte: new Date() },
      status: { $in: ["pending", "confirmed"] },
    });

    const stats = {
      total_appointments: totalAppointments,
      pending_appointments: pendingAppointments,
      confirmed_appointments: confirmedAppointments,
      cancelled_appointments: cancelledAppointments,
      completed_appointments: completedAppointments,
      upcoming_appointments: upcomingAppointments,
      appointments_by_venue: appointmentsByVenue,
    };

    success(res, stats, "Appointment statistics retrieved successfully");
  } catch (err) {
    console.error("Get appointment stats error:", err);
    error(res, "Failed to retrieve appointment statistics", 500);
  }
});
module.exports = { registerAppointmentCron };
module.exports = router;
