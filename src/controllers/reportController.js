import prisma from "../config/db.js";
import supabase from "../config/supabase.js";
import jwt from "jsonwebtoken";

export const createReport = async (req, res) => {
  try {
    const { location, coordinates, waterLevel, description } = req.body;
    const image = req.file;
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        error: "Unauthorized: No token provided",
      });
    }

    let userId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Decoded JWT:", decoded); // Debug log
      userId = decoded.id; // Confirm 'id' is included in the JWT payload
    } catch (err) {
      console.error("JWT verification error:", err);
      return res.status(401).json({
        error: "Unauthorized: Invalid token",
      });
    }

    console.log("UserId extracted from token:", userId);

    let imageUrl = null;
    if (image) {
      const filename = `${Date.now()}-${image.originalname.replace(
        /\s+/g,
        "-"
      )}`;
      console.log("Uploading image with filename:", filename);

      const { data, error: uploadError } = await supabase.storage
        .from("banjirImage")
        .upload(filename, image.buffer, {
          contentType: image.mimetype,
          cacheControl: "3600",
        });

      if (uploadError) {
        console.error("Supabase upload error:", uploadError);
        throw new Error("Failed to upload image");
      }

      imageUrl = `https://gukvjyugftixrkgmcqtj.supabase.co/storage/v1/object/public/banjirImage/${filename}`;
    }

    const parsedCoordinates =
      typeof coordinates === "string" ? JSON.parse(coordinates) : coordinates;

    const report = await prisma.report.create({
      data: {
        location,
        coordinates: parsedCoordinates,
        waterLevel: parseFloat(waterLevel),
        description,
        imageUrl,
        userId, // Use the userId extracted from the token
      },
    });

    res.status(201).json(report);
  } catch (error) {
    console.error("Create report error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const updateReport = async (req, res) => {
  try {
    const { id } = req.params;

    // Log the incoming request
    console.log("Request body:", req.body);
    console.log("Request file:", req.file);

    // Extract fields from request body
    const {
      location,
      waterLevel,
      description,
      coordinates,
      status, // Add status extraction
    } = req.body;

    const image = req.file;

    // Log extracted values
    console.log("Extracted values:", {
      location,
      waterLevel,
      description,
      coordinates,
      status, // Add status to logging
    });

    // Validate all required fields are present
    if (!location || !coordinates || !waterLevel || !description) {
      return res.status(400).json({
        error: "Missing required fields",
        details: {
          location: !location,
          coordinates: !coordinates,
          waterLevel: !waterLevel,
          description: !description,
        },
      });
    }

    // Validate status if provided
    if (status && !["ACTIVE", "RESOLVED"].includes(status)) {
      return res.status(400).json({
        error: "Invalid status value",
        details: { status: "Status must be either 'ACTIVE' or 'RESOLVED'" },
      });
    }

    // Check if report exists
    const existingReport = await prisma.report.findUnique({
      where: { id },
    });

    if (!existingReport) {
      return res.status(404).json({ error: "Report not found" });
    }

    // Handle image upload if there's a new image
    let imageUrl = existingReport.imageUrl;
    if (image) {
      const filename = `${Date.now()}-${image.originalname.replace(
        /\s+/g,
        "-"
      )}`;

      const { data, error: uploadError } = await supabase.storage
        .from("banjirImage")
        .upload(filename, image.buffer, {
          contentType: image.mimetype,
          cacheControl: "3600",
        });

      if (uploadError) {
        throw new Error("Failed to upload image");
      }

      imageUrl = `https://gukvjyugftixrkgmcqtj.supabase.co/storage/v1/object/public/banjirImage/${filename}`;
    }

    // Parse coordinates
    let parsedCoordinates;
    try {
      parsedCoordinates =
        typeof coordinates === "string" ? JSON.parse(coordinates) : coordinates;
    } catch (error) {
      console.error("Error parsing coordinates:", error);
      return res.status(400).json({ error: "Invalid coordinates format" });
    }

    // Parse water level
    const parsedWaterLevel = parseFloat(waterLevel);
    if (isNaN(parsedWaterLevel)) {
      return res.status(400).json({ error: "Invalid water level value" });
    }

    // Create update data object
    const updateData = {
      location,
      coordinates: parsedCoordinates,
      waterLevel: parsedWaterLevel,
      description,
      imageUrl,
    };

    // Only include status in update if it's provided
    if (status) {
      updateData.status = status;
    }

    // Update the report
    const updatedReport = await prisma.report.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json(updatedReport);
  } catch (error) {
    console.error("Update report error:", error);
    res.status(500).json({
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};
export const deleteReport = async (req, res) => {
  try {
    const { id } = req.params;

    const existingReport = await prisma.report.findUnique({
      where: { id: id },
    });

    if (!existingReport) {
      return res.status(404).json({ error: "Report not found" });
    }

    if (existingReport.userId !== req.user.id) {
      return res.status(403).json({ error: "Forbidden: Not your report" });
    }

    await prisma.report.delete({
      where: { id: id },
    });

    res.status(200).json({ message: "Report deleted successfully" });
  } catch (error) {
    console.error("Delete report error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getTotalUser = async (req, res) => {
  try {
    const totalUser = await prisma.user.count();

    res.json(totalUser);
  } catch (error) {
    res.status(500).json({ messagge: error.message });
  }
};

export const getReports = async (req, res) => {
  try {
    const reports = await prisma.report.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
