const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema(
    {
        phone: { type: String, required: true, trim: true },
        source: { type: String, default: "partners_page" },
        status: { type: String, enum: ["new", "contacted", "done"], default: "new" },
        note: { type: String },
        ip: { type: String },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Lead", leadSchema);
