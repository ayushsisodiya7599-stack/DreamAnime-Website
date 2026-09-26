const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

// Admin credentials
const ADMIN_USERNAME = "Ayush";
const ADMIN_PASSWORD = "Ayush759966";

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadsDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// APK storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },

    filename: (req, file, cb) => {
        cb(null, "DreamAnime.apk");
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 500 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        if (path.extname(file.originalname).toLowerCase() !== ".apk") {
            return cb(new Error("Only APK files are allowed."));
        }

        cb(null, true);
    }
});

// =========================
// ADMIN LOGIN
// =========================

app.post("/api/admin-login", (req, res) => {
    const { username, password } = req.body;

    if (
        username === ADMIN_USERNAME &&
        password === ADMIN_PASSWORD
    ) {
        return res.json({
            success: true,
            message: "Login successful"
        });
    }

    res.status(401).json({
        success: false,
        message: "Invalid username or password"
    });
});

// =========================
// PUBLIC WEBSITE
// =========================

app.use(express.static(path.join(__dirname, "public")));

// =========================
// APK DOWNLOAD
// =========================

app.get("/download", (req, res) => {

    const apkPath = path.join(
        uploadsDir,
        "DreamAnime.apk"
    );

    if (!fs.existsSync(apkPath)) {
        return res.status(404).send(
            "DreamAnime APK abhi available nahi hai."
        );
    }

    res.download(
        apkPath,
        "DreamAnime.apk"
    );
});

// =========================
// APK UPLOAD
// =========================

app.post(
    "/api/upload-apk",
    upload.single("apk"),
    (req, res) => {

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "APK file select nahi ki gayi."
            });
        }

        res.json({
            success: true,
            message: "DreamAnime APK successfully upload ho gayi.",
            filename: req.file.filename
        });
    }
);

// =========================
// ERROR HANDLER
// =========================

app.use((err, req, res, next) => {

    console.error(err);

    res.status(400).json({
        success: false,
        message: err.message
    });
});

// =========================
// START SERVER
// =========================

app.listen(PORT, () => {
    console.log(
        `DreamAnime server running on http://localhost:${PORT}`
    );
});