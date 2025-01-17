import express from "express";
import {
  createReport,
  deleteReport,
  getReports,
  getTotalUser,
  updateReport,
} from "../controllers/reportController.js";
import { protect } from "../middlewares/authMiddleware.js";
import multer from "multer";

const storage = multer.memoryStorage();
const upload = multer({ storage });

const router = express.Router();

router.post("/", protect, upload.single("image"), createReport);
router.get("/", getReports);
router.get("/total-user", getTotalUser);
router.delete("/:id", protect, deleteReport);
router.put("/:id", protect, upload.single("image"), updateReport);

export default router;
