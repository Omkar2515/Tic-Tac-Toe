const mongoose = require("mongoose");

console.log("Attempting MongoDB connection...");

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected SUCCESSFULLY");
  })
  .catch(err => {
    console.error("MongoDB connection FAILED:", err.message);
  });
