require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const app = express();

app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("MongoDB Error:", err));

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: "expense-management",
    resource_type: "auto",
    public_id: `${Date.now()}-${file.originalname}`,
  }),
});

const upload = multer({
  storage,
});

// Expense Schema
const ExpenseSchema = new mongoose.Schema(
  {
    username: String,
    date: String,
    visitDate: String,
    expenseType: String,
    complaintNo: String,
    mainfrom: String,
    mainto: String,
    dealerName: String,

    travelDetails: [
      {
        travelMode: String,
        fromLocation: String,
        toLocation: String,
        startReading: Number,
        endReading: Number,
        totalKm: Number,
        startMeterImage: String,
        endMeterImage: String,
        travelBill: String,
        fareAmount: Number,
      },
    ],

    hotelName: String,
    hotelBill: String,
    accommodationAmount: Number,

    foodBill: String,
    foodAmount: Number,

    courierCompany: String,
    courierBill: String,
    courierAmount: Number,

    miscDescription: String,
    miscBill: String,
    miscAmount: Number,

    totalExpense: Number,

    status: {
      type: String,
      default: "Pending",
    },
  },
  {
    timestamps: true,
  }
);

const Expense = mongoose.model("Expense", ExpenseSchema);

// ============================================
// CREATE EXPENSE
// ============================================

app.post("/api/expenses", upload.any(), async (req, res) => {
  try {
    const files = req.files || [];

    let travelDetails = JSON.parse(req.body.travelDetails || "[]");

    travelDetails = travelDetails.map((route, index) => {
      const startMeter = files.find(
        (file) => file.fieldname === `startMeterImage_${index}`
      );

      const endMeter = files.find(
        (file) => file.fieldname === `endMeterImage_${index}`
      );

      const travelBill = files.find(
        (file) => file.fieldname === `travelBill_${index}`
      );

      return {
        ...route,

        startMeterImage: startMeter?.path || "",
        endMeterImage: endMeter?.path || "",
        travelBill: travelBill?.path || "",
      };
    });

    // Other bills
    const hotelBill =
      files.find((file) => file.fieldname === "hotelBill")?.path || "";

    const foodBill =
      files.find((file) => file.fieldname === "foodBill")?.path || "";

    const courierBill =
      files.find((file) => file.fieldname === "courierBill")?.path || "";

    const miscBill =
      files.find((file) => file.fieldname === "miscBill")?.path || "";

    // Calculate travel total
    const travelTotal = travelDetails.reduce((sum, route) => {
      if (
        route.travelMode === "Bike" ||
        route.travelMode === "Car"
      ) {
        const km = Number(route.totalKm || 0);

        const rate =
          route.travelMode === "Bike"
            ? 3
            : 7;

        return sum + km * rate;
      }

      return sum + Number(route.fareAmount || 0);
    }, 0);

    const accommodationAmount = Number(
      req.body.accommodationAmount || 0
    );

    const foodAmount = Number(
      req.body.foodAmount || 0
    );

    const courierAmount = Number(
      req.body.courierAmount || 0
    );

    const miscAmount = Number(
      req.body.miscAmount || 0
    );

    const totalExpense =
      travelTotal +
      accommodationAmount +
      foodAmount +
      courierAmount +
      miscAmount;

    // Create expense
    const expense = await Expense.create({
      username: req.body.username,
      date: req.body.date,
      visitDate: req.body.visitDate,
      expenseType: req.body.expenseType,
      complaintNo: req.body.complaintNo,
      mainfrom: req.body.mainfrom,
      mainto: req.body.mainto,
      dealerName: req.body.dealerName,

      travelDetails,

      hotelName: req.body.hotelName,
      hotelBill,
      accommodationAmount,

      foodBill,
      foodAmount,

      courierCompany: req.body.courierCompany,
      courierBill,
      courierAmount,

      miscDescription: req.body.miscDescription,
      miscBill,
      miscAmount,

      totalExpense,
    });

    res.status(201).json({
      success: true,
      message: "Expense Saved Successfully",
      data: expense,
    });
  } catch (error) {
    console.error("Create Expense Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================
// DELETE EXPENSE
// ============================================

app.delete("/api/expenses/:id", async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    res.json({
      success: true,
      message: "Expense Deleted",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================
// GET ALL EXPENSES
// ============================================

app.get("/api/expenses", async (req, res) => {
  try {
    const expenses = await Expense.find().sort({
      createdAt: -1,
    });

    res.json(expenses);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================
// UPDATE STATUS
// ============================================

app.patch("/api/expenses/:id/status", async (req, res) => {
  try {
    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      {
        status: req.body.status,
      },
      {
        new: true,
      }
    );

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    res.json({
      success: true,
      data: expense,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// IMPORTANT:
// Do NOT use app.listen() on Vercel.
//
// Export the Express app instead.
module.exports = app;
