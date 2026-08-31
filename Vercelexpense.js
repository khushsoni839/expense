require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;

const app = express();

// ======================================================
// MIDDLEWARE
// ======================================================

app.use(cors());
app.use(express.json());

// ======================================================
// MONGODB
// ======================================================

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB Connected");
  })
  .catch((error) => {
    console.error("MongoDB Connection Error:", error);
  });

// ======================================================
// CLOUDINARY
// ======================================================

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ======================================================
// MULTER
// ======================================================

// Store uploaded files temporarily in memory.
// Cloudinary will receive the buffer directly.
const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB per file
    files: 30,
  },

  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `File type not allowed: ${file.mimetype}`
        )
      );
    }
  },
});

// ======================================================
// CLOUDINARY UPLOAD FUNCTION
// ======================================================

function uploadToCloudinary(file) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "expense-management",
        resource_type: "auto",
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    uploadStream.end(file.buffer);
  });
}

// ======================================================
// EXPENSE SCHEMA
// ======================================================

const ExpenseSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      default: "",
    },

    date: {
      type: String,
      default: "",
    },

    visitDate: {
      type: String,
      default: "",
    },

    expenseType: {
      type: String,
      default: "",
    },

    complaintNo: {
      type: String,
      default: "",
    },

    mainfrom: {
      type: String,
      default: "",
    },

    mainto: {
      type: String,
      default: "",
    },

    dealerName: {
      type: String,
      default: "",
    },

    // ==================================================
    // TRAVEL
    // ==================================================

    travelDetails: [
      {
        travelMode: {
          type: String,
          default: "",
        },

        fromLocation: {
          type: String,
          default: "",
        },

        toLocation: {
          type: String,
          default: "",
        },

        startReading: {
          type: Number,
          default: 0,
        },

        endReading: {
          type: Number,
          default: 0,
        },

        totalKm: {
          type: Number,
          default: 0,
        },

        startMeterImage: {
          type: String,
          default: "",
        },

        endMeterImage: {
          type: String,
          default: "",
        },

        travelBill: {
          type: String,
          default: "",
        },

        fareAmount: {
          type: Number,
          default: 0,
        },
      },
    ],

    // ==================================================
    // HOTEL
    // ==================================================

    hotelName: {
      type: String,
      default: "",
    },

    hotelBill: {
      type: String,
      default: "",
    },

    accommodationAmount: {
      type: Number,
      default: 0,
    },

    // ==================================================
    // FOOD
    // ==================================================

    foodBill: {
      type: String,
      default: "",
    },

    foodAmount: {
      type: Number,
      default: 0,
    },

    // ==================================================
    // COURIER
    // ==================================================

    courierCompany: {
      type: String,
      default: "",
    },

    courierBill: {
      type: String,
      default: "",
    },

    courierAmount: {
      type: Number,
      default: 0,
    },

    // ==================================================
    // MISC
    // ==================================================

    miscDescription: {
      type: String,
      default: "",
    },

    miscBill: {
      type: String,
      default: "",
    },

    miscAmount: {
      type: Number,
      default: 0,
    },

    // ==================================================
    // TOTAL
    // ==================================================

    totalExpense: {
      type: Number,
      default: 0,
    },

    // ==================================================
    // STATUS
    // ==================================================

    status: {
      type: String,
      default: "Pending",
    },

    approved: {
      type: Boolean,
      default: false,
    },
  },

  {
    timestamps: true,
  }
);

const Expense = mongoose.model(
  "Expense",
  ExpenseSchema
);

// ======================================================
// CREATE EXPENSE
// ======================================================

app.post(
  "/api/expenses",
  (req, res, next) => {
    upload.any()(req, res, (error) => {
      if (error) {
        console.error(
          "MULTER ERROR:",
          error
        );

        return res.status(400).json({
          success: false,
          message: "File upload failed",
          error: error.message,
        });
      }

      next();
    });
  },

  async (req, res) => {
    try {
      console.log(
        "=============================="
      );

      console.log(
        "CREATE EXPENSE REQUEST"
      );

      console.log(
        "BODY:",
        req.body
      );

      console.log(
        "FILES:",
        req.files?.map((file) => ({
          fieldname: file.fieldname,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        }))
      );

      console.log(
        "=============================="
      );

      const files = req.files || [];

      // ==================================================
      // PARSE TRAVEL DETAILS
      // ==================================================

      let travelDetails = [];

      try {
        travelDetails = JSON.parse(
          req.body.travelDetails || "[]"
        );
      } catch (error) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid travelDetails JSON",
        });
      }

      if (!Array.isArray(travelDetails)) {
        travelDetails = [];
      }

      // ==================================================
      // UPLOAD ALL FILES TO CLOUDINARY
      // ==================================================

      const uploadedFiles = {};

      for (const file of files) {
        try {
          console.log(
            `Uploading: ${file.fieldname}`
          );

          const result =
            await uploadToCloudinary(file);

          uploadedFiles[file.fieldname] =
            result.secure_url;

          console.log(
            `Uploaded successfully: ${file.fieldname}`
          );
        } catch (uploadError) {
          console.error(
            `Cloudinary upload failed: ${file.fieldname}`,
            uploadError
          );

          return res.status(500).json({
            success: false,
            message:
              `Cloudinary upload failed for ${file.fieldname}`,
            error: uploadError.message,
          });
        }
      }

      // ==================================================
      // ATTACH TRAVEL IMAGES
      // ==================================================

      travelDetails = travelDetails.map(
        (route, index) => {
          return {
            ...route,

            startMeterImage:
              uploadedFiles[
                `startMeterImage_${index}`
              ] || "",

            endMeterImage:
              uploadedFiles[
                `endMeterImage_${index}`
              ] || "",

            travelBill:
              uploadedFiles[
                `travelBill_${index}`
              ] || "",
          };
        }
      );

      // ==================================================
      // OTHER BILL FILES
      // ==================================================

      const hotelBill =
        uploadedFiles.hotelBill || "";

      const foodBill =
        uploadedFiles.foodBill || "";

      const courierBill =
        uploadedFiles.courierBill || "";

      const miscBill =
        uploadedFiles.miscBill || "";

      // ==================================================
      // CALCULATE TRAVEL TOTAL
      // ==================================================

      const travelTotal =
        travelDetails.reduce(
          (sum, route) => {
            const mode =
              route.travelMode;

            // Bike = ₹3/km
            if (mode === "Bike") {
              const km = Number(
                route.totalKm || 0
              );

              return sum + km * 3;
            }

            // Car = ₹7/km
            if (mode === "Car") {
              const km = Number(
                route.totalKm || 0
              );

              return sum + km * 7;
            }

            // Other travel modes
            return (
              sum +
              Number(
                route.fareAmount || 0
              )
            );
          },
          0
        );

      // ==================================================
      // OTHER AMOUNTS
      // ==================================================

      const accommodationAmount =
        Number(
          req.body.accommodationAmount || 0
        );

      const foodAmount =
        Number(
          req.body.foodAmount || 0
        );

      const courierAmount =
        Number(
          req.body.courierAmount || 0
        );

      const miscAmount =
        Number(
          req.body.miscAmount || 0
        );

      // ==================================================
      // TOTAL EXPENSE
      // ==================================================

      const totalExpense =
        travelTotal +
        accommodationAmount +
        foodAmount +
        courierAmount +
        miscAmount;

      console.log(
        "Travel Total:",
        travelTotal
      );

      console.log(
        "Total Expense:",
        totalExpense
      );

      // ==================================================
      // CREATE MONGODB DOCUMENT
      // ==================================================

      const expense =
        await Expense.create({
          username:
            req.body.username || "",

          date:
            req.body.date || "",

          visitDate:
            req.body.visitDate || "",

          expenseType:
            req.body.expenseType || "",

          complaintNo:
            req.body.complaintNo || "",

          mainfrom:
            req.body.mainfrom || "",

          mainto:
            req.body.mainto || "",

          dealerName:
            req.body.dealerName || "",

          travelDetails,

          hotelName:
            req.body.hotelName || "",

          hotelBill,

          accommodationAmount,

          foodBill,

          foodAmount,

          courierCompany:
            req.body.courierCompany || "",

          courierBill,

          courierAmount,

          miscDescription:
            req.body.miscDescription || "",

          miscBill,

          miscAmount,

          totalExpense,

          status: "Pending",

          approved: false,
        });

      console.log(
        "EXPENSE SAVED:",
        expense._id
      );

      // ==================================================
      // RESPONSE
      // ==================================================

      return res.status(201).json({
        success: true,
        message:
          "Expense Saved Successfully",

        data: expense,
      });
    } catch (error) {
      console.error(
        "CREATE EXPENSE ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to save expense",
      });
    }
  }
);

// ======================================================
// GET ALL EXPENSES
// ======================================================

app.get(
  "/api/expenses",
  async (req, res) => {
    try {
      const expenses =
        await Expense.find()
          .sort({
            createdAt: -1,
          });

      return res.json({
        success: true,
        data: expenses,
      });
    } catch (error) {
      console.error(
        "GET EXPENSE ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// ======================================================
// GET SINGLE EXPENSE
// ======================================================

app.get(
  "/api/expenses/:id",
  async (req, res) => {
    try {
      const expense =
        await Expense.findById(
          req.params.id
        );

      if (!expense) {
        return res.status(404).json({
          success: false,
          message: "Expense not found",
        });
      }

      return res.json({
        success: true,
        data: expense,
      });
    } catch (error) {
      console.error(
        "GET SINGLE EXPENSE ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// ======================================================
// DELETE EXPENSE
// ======================================================

app.delete(
  "/api/expenses/:id",
  async (req, res) => {
    try {
      const expense =
        await Expense.findByIdAndDelete(
          req.params.id
        );

      if (!expense) {
        return res.status(404).json({
          success: false,
          message: "Expense not found",
        });
      }

      return res.json({
        success: true,
        message: "Expense Deleted",
      });
    } catch (error) {
      console.error(
        "DELETE EXPENSE ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// ======================================================
// UPDATE STATUS
// ======================================================

app.patch(
  "/api/expenses/:id/status",
  async (req, res) => {
    try {
      const {
        status,
      } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message:
            "Status is required",
        });
      }

      const expense =
        await Expense.findByIdAndUpdate(
          req.params.id,

          {
            status,
          },

          {
            new: true,
            runValidators: true,
          }
        );

      if (!expense) {
        return res.status(404).json({
          success: false,
          message: "Expense not found",
        });
      }

      return res.json({
        success: true,
        message:
          "Status Updated Successfully",
        data: expense,
      });
    } catch (error) {
      console.error(
        "UPDATE STATUS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// ======================================================
// UPDATE APPROVAL
// ======================================================

app.patch(
  "/api/expenses/:id/approve",
  async (req, res) => {
    try {
      const expense =
        await Expense.findByIdAndUpdate(
          req.params.id,

          {
            approved:
              req.body.approved === true,
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

      return res.json({
        success: true,
        message:
          "Approval Updated Successfully",
        data: expense,
      });
    } catch (error) {
      console.error(
        "APPROVAL ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// ======================================================
// HEALTH CHECK
// ======================================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message:
      "Expense Management API is running",
  });
});

// ======================================================
// ERROR HANDLER
// ======================================================

app.use(
  (error, req, res, next) => {
    console.error(
      "GLOBAL ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Internal Server Error",
    });
  }
);

// ======================================================
// VERCEL
// ======================================================

// IMPORTANT:
// Do NOT use app.listen() on Vercel.
//
// Vercel imports this Express application
// as a serverless function.

module.exports = app;



// require("dotenv").config();

// const express = require("express");
// const mongoose = require("mongoose");
// const cors = require("cors");
// const multer = require("multer");
// const cloudinary = require("cloudinary").v2;
// const { CloudinaryStorage } = require("multer-storage-cloudinary");

// const app = express();

// app.use(cors());
// app.use(express.json());

// // MongoDB connection
// mongoose
//   .connect(process.env.MONGODB_URI)
//   .then(() => console.log("MongoDB Connected"))
//   .catch((err) => console.log("MongoDB Error:", err));

// // Cloudinary configuration
// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// // Cloudinary storage
// const storage = new CloudinaryStorage({
//   cloudinary,
//   params: async (req, file) => ({
//     folder: "expense-management",
//     resource_type: "auto",
//     public_id: `${Date.now()}-${file.originalname}`,
//   }),
// });

// const upload = multer({
//   storage,
// });

// // Expense Schema
// const ExpenseSchema = new mongoose.Schema(
//   {
//     username: String,
//     date: String,
//     visitDate: String,
//     expenseType: String,
//     complaintNo: String,
//     mainfrom: String,
//     mainto: String,
//     dealerName: String,

//     travelDetails: [
//       {
//         travelMode: String,
//         fromLocation: String,
//         toLocation: String,
//         startReading: Number,
//         endReading: Number,
//         totalKm: Number,
//         startMeterImage: String,
//         endMeterImage: String,
//         travelBill: String,
//         fareAmount: Number,
//       },
//     ],

//     hotelName: String,
//     hotelBill: String,
//     accommodationAmount: Number,

//     foodBill: String,
//     foodAmount: Number,

//     courierCompany: String,
//     courierBill: String,
//     courierAmount: Number,

//     miscDescription: String,
//     miscBill: String,
//     miscAmount: Number,

//     totalExpense: Number,

//     status: {
//       type: String,
//       default: "Pending",
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// const Expense = mongoose.model("Expense", ExpenseSchema);

// // ============================================
// // CREATE EXPENSE
// // ============================================

// app.post("/api/expenses", upload.any(), async (req, res) => {
//   try {
//     const files = req.files || [];

//     let travelDetails = JSON.parse(req.body.travelDetails || "[]");

//     travelDetails = travelDetails.map((route, index) => {
//       const startMeter = files.find(
//         (file) => file.fieldname === `startMeterImage_${index}`
//       );

//       const endMeter = files.find(
//         (file) => file.fieldname === `endMeterImage_${index}`
//       );

//       const travelBill = files.find(
//         (file) => file.fieldname === `travelBill_${index}`
//       );

//       return {
//         ...route,

//         startMeterImage: startMeter?.path || "",
//         endMeterImage: endMeter?.path || "",
//         travelBill: travelBill?.path || "",
//       };
//     });

//     // Other bills
//     const hotelBill =
//       files.find((file) => file.fieldname === "hotelBill")?.path || "";

//     const foodBill =
//       files.find((file) => file.fieldname === "foodBill")?.path || "";

//     const courierBill =
//       files.find((file) => file.fieldname === "courierBill")?.path || "";

//     const miscBill =
//       files.find((file) => file.fieldname === "miscBill")?.path || "";

//     // Calculate travel total
//     const travelTotal = travelDetails.reduce((sum, route) => {
//       if (
//         route.travelMode === "Bike" ||
//         route.travelMode === "Car"
//       ) {
//         const km = Number(route.totalKm || 0);

//         const rate =
//           route.travelMode === "Bike"
//             ? 3
//             : 7;

//         return sum + km * rate;
//       }

//       return sum + Number(route.fareAmount || 0);
//     }, 0);

//     const accommodationAmount = Number(
//       req.body.accommodationAmount || 0
//     );

//     const foodAmount = Number(
//       req.body.foodAmount || 0
//     );

//     const courierAmount = Number(
//       req.body.courierAmount || 0
//     );

//     const miscAmount = Number(
//       req.body.miscAmount || 0
//     );

//     const totalExpense =
//       travelTotal +
//       accommodationAmount +
//       foodAmount +
//       courierAmount +
//       miscAmount;

//     // Create expense
//     const expense = await Expense.create({
//       username: req.body.username,
//       date: req.body.date,
//       visitDate: req.body.visitDate,
//       expenseType: req.body.expenseType,
//       complaintNo: req.body.complaintNo,
//       mainfrom: req.body.mainfrom,
//       mainto: req.body.mainto,
//       dealerName: req.body.dealerName,

//       travelDetails,

//       hotelName: req.body.hotelName,
//       hotelBill,
//       accommodationAmount,

//       foodBill,
//       foodAmount,

//       courierCompany: req.body.courierCompany,
//       courierBill,
//       courierAmount,

//       miscDescription: req.body.miscDescription,
//       miscBill,
//       miscAmount,

//       totalExpense,
//     });

//     res.status(201).json({
//       success: true,
//       message: "Expense Saved Successfully",
//       data: expense,
//     });
//   } catch (error) {
//     console.error("Create Expense Error:", error);

//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// });

// // ============================================
// // DELETE EXPENSE
// // ============================================

// app.delete("/api/expenses/:id", async (req, res) => {
//   try {
//     const expense = await Expense.findByIdAndDelete(req.params.id);

//     if (!expense) {
//       return res.status(404).json({
//         success: false,
//         message: "Expense not found",
//       });
//     }

//     res.json({
//       success: true,
//       message: "Expense Deleted",
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// });

// // ============================================
// // GET ALL EXPENSES
// // ============================================

// app.get("/api/expenses", async (req, res) => {
//   try {
//     const expenses = await Expense.find().sort({
//       createdAt: -1,
//     });

//     res.json(expenses);
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// });

// // ============================================
// // UPDATE STATUS
// // ============================================

// app.patch("/api/expenses/:id/status", async (req, res) => {
//   try {
//     const expense = await Expense.findByIdAndUpdate(
//       req.params.id,
//       {
//         status: req.body.status,
//       },
//       {
//         new: true,
//       }
//     );

//     if (!expense) {
//       return res.status(404).json({
//         success: false,
//         message: "Expense not found",
//       });
//     }

//     res.json({
//       success: true,
//       data: expense,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// });

// // IMPORTANT:
// // Do NOT use app.listen() on Vercel.
// //
// // Export the Express app instead.
// module.exports = app;
