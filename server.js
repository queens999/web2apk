const express = require("express");
const multer = require("multer");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const os = require("os");

const app = express();
const PORT = process.env.PORT || 3000;

const upload = multer({
  dest: path.join(os.tmpdir(), "web2apk-uploads"),
  limits: {
    fileSize: 50 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() !== ".zip") {
      return cb(new Error("File harus berformat ZIP"));
    }
    cb(null, true);
  }
});

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    name: "WEB2APK Worker",
    status: "online",
    inputs: ["website URL", "ZIP"],
    endpoints: {
      website: "POST /api/website",
      zip: "POST /api/zip"
    }
  });
});

app.post("/api/website", async (req, res) => {
  const { url } = req.body || {};

  try {
    if (!url) {
      return res.status(400).json({
        success: false,
        message: "URL website wajib diisi"
      });
    }

    const parsed = new URL(url);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return res.status(400).json({
        success: false,
        message: "URL harus menggunakan HTTP atau HTTPS"
      });
    }

    const response = await axios.get(parsed.href, {
      timeout: 15000,
      maxRedirects: 3,
      maxContentLength: 5 * 1024 * 1024,
      responseType: "text",
      headers: {
        "User-Agent": "WEB2APK-Worker/1.0"
      }
    });

    res.json({
      success: true,
      message: "Website berhasil diakses. Build APK belum dijalankan.",
      contentType: response.headers["content-type"] || "",
      title: parsed.hostname
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Website gagal diakses atau URL tidak valid"
    });
  }
});

app.post("/api/zip", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "Upload file ZIP menggunakan field bernama file"
    });
  }

  const filePath = req.file.path;
  const originalName = req.file.originalname;

  fs.unlink(filePath, () => {});

  res.status(202).json({
    success: true,
    filename: originalName,
    message: "ZIP diterima, tetapi build APK belum diimplementasikan."
  });
});

app.use((err, req, res, next) => {
  res.status(400).json({
    success: false,
    message: err.message || "Permintaan gagal"
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`WEB2APK Worker berjalan di port ${PORT}`);
});
