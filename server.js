const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();


// ==================================================
// PORT
// ==================================================

const PORT = process.env.PORT || 3000;


// ==================================================
// ADMIN LOGIN
// ==================================================
//
// Railway Environment Variables use karna recommended hai.
//
// ADMIN_USERNAME
// ADMIN_PASSWORD
//
// Agar variables set nahi hain to fallback values use hongi.
// Production mein Railway Variables zaroor set karna.
//

const ADMIN_USERNAME =
    process.env.ADMIN_USERNAME || "Ayush";

const ADMIN_PASSWORD =
    process.env.ADMIN_PASSWORD || "CHANGE_THIS_PASSWORD";


// ==================================================
// MIDDLEWARE
// ==================================================

app.use(cors());

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);


// ==================================================
// UPLOAD DIRECTORY
// ==================================================

const uploadsDir =
    path.join(__dirname, "uploads");


if (!fs.existsSync(uploadsDir)) {

    fs.mkdirSync(
        uploadsDir,
        {
            recursive: true
        }
    );

}


// ==================================================
// LATEST APK INFORMATION
// ==================================================

const apkInfoPath =
    path.join(
        uploadsDir,
        "latest-apk.json"
    );


// ==================================================
// APK STORAGE
// ==================================================

const storage =
    multer.diskStorage({

        destination: (req, file, cb) => {

            cb(
                null,
                uploadsDir
            );

        },


        filename: (req, file, cb) => {

            // Original filename preserve hoga.
            //
            // Example:
            // DreamAnime Vision 1.0.apk

            let safeName =
                path.basename(
                    file.originalname
                );


            // Dangerous/special characters remove
            safeName =
                safeName.replace(
                    /[^a-zA-Z0-9._ -]/g,
                    "_"
                );


            // Empty filename protection
            if (!safeName) {

                safeName =
                    "DreamAnime.apk";

            }


            cb(
                null,
                safeName
            );

        }

    });


// ==================================================
// APK UPLOAD CONFIG
// ==================================================

const upload =
    multer({

        storage: storage,

        limits: {

            // Maximum 500 MB
            fileSize:
                500 * 1024 * 1024

        },

        fileFilter:
            (req, file, cb) => {

                const extension =
                    path
                        .extname(
                            file.originalname
                        )
                        .toLowerCase();


                if (extension !== ".apk") {

                    return cb(
                        new Error(
                            "Only APK files are allowed."
                        )
                    );

                }


                cb(
                    null,
                    true
                );

            }

    });


// ==================================================
// VERSION EXTRACTOR
// ==================================================

function extractVersion(filename) {

    // Example:
    //
    // DreamAnime Vision 1.0.apk
    // -> 1.0
    //
    // DreamAnime Vision 2.0.apk
    // -> 2.0

    const visionMatch =
        filename.match(
            /(?:Vision|Version)\s*([0-9]+(?:\.[0-9]+)*)/i
        );


    if (visionMatch) {

        return visionMatch[1];

    }


    // Backup:
    //
    // DreamAnime 1.0.apk

    const numberMatch =
        filename.match(
            /([0-9]+(?:\.[0-9]+)+)/
        );


    if (numberMatch) {

        return numberMatch[1];

    }


    // Agar filename mein version nahi hai
    return "1.0";

}


// ==================================================
// READ LATEST APK
// ==================================================

function getLatestApk() {

    if (
        !fs.existsSync(
            apkInfoPath
        )
    ) {

        return null;

    }


    try {

        const data =
            fs.readFileSync(
                apkInfoPath,
                "utf8"
            );


        return JSON.parse(
            data
        );


    } catch (error) {

        console.error(
            "Latest APK information read error:",
            error
        );


        return null;

    }

}


// ==================================================
// SAVE LATEST APK
// ==================================================

function saveLatestApk(data) {

    fs.writeFileSync(

        apkInfoPath,

        JSON.stringify(
            data,
            null,
            2
        ),

        "utf8"

    );

}


// ==================================================
// ADMIN LOGIN
// ==================================================

app.post(
    "/api/admin-login",
    (req, res) => {

        const {
            username,
            password
        } = req.body;


        if (
            username === ADMIN_USERNAME &&
            password === ADMIN_PASSWORD
        ) {

            return res.json({

                success: true,

                message:
                    "Login successful"

            });

        }


        return res.status(401).json({

            success: false,

            message:
                "Invalid username or password"

        });

    }
);


// ==================================================
// PUBLIC WEBSITE
// ==================================================

app.use(
    express.static(
        path.join(
            __dirname,
            "public"
        )
    )
);


// ==================================================
// LATEST APK API
// ==================================================

app.get(
    "/api/latest-apk",
    (req, res) => {

        const latestApk =
            getLatestApk();


        if (!latestApk) {

            return res.status(404).json({

                success: false,

                message:
                    "Latest APK abhi available nahi hai."

            });

        }


        return res.json({

            success: true,

            filename:
                latestApk.filename,

            originalName:
                latestApk.originalName,

            version:
                latestApk.version,

            uploadedAt:
                latestApk.uploadedAt,

            downloadUrl:
                "/download"

        });

    }
);


// ==================================================
// APK DOWNLOAD
// ==================================================

app.get(
    "/download",
    (req, res) => {

        const latestApk =
            getLatestApk();


        if (!latestApk) {

            return res.status(404).send(
                "DreamAnime APK abhi available nahi hai."
            );

        }


        const apkPath =
            path.join(
                uploadsDir,
                latestApk.filename
            );


        if (
            !fs.existsSync(
                apkPath
            )
        ) {

            return res.status(404).send(
                "Latest DreamAnime APK file nahi mili."
            );

        }


        // Latest APK original filename ke saath download hoga.

        return res.download(
            apkPath,
            latestApk.originalName ||
            latestApk.filename
        );

    }
);


// ==================================================
// APK UPLOAD
// ==================================================

app.post(
    "/api/upload-apk",

    upload.single("apk"),

    (req, res) => {

        if (!req.file) {

            return res.status(400).json({

                success: false,

                message:
                    "APK file select nahi ki gayi."

            });

        }


        // Filename se version nikalo

        const version =
            extractVersion(
                req.file.originalname
            );


        // Latest APK information

        const latestApk = {

            filename:
                req.file.filename,

            originalName:
                req.file.originalname,

            version:
                version,

            uploadedAt:
                new Date().toISOString()

        };


        // Metadata save

        saveLatestApk(
            latestApk
        );


        console.log(
            "======================================"
        );

        console.log(
            "NEW DREAMANIME APK UPLOADED"
        );

        console.log(
            "Original:",
            req.file.originalname
        );

        console.log(
            "Saved:",
            req.file.filename
        );

        console.log(
            "Version:",
            version
        );

        console.log(
            "Size:",
            (
                req.file.size /
                (1024 * 1024)
            ).toFixed(2),
            "MB"
        );

        console.log(
            "======================================"
        );


        return res.json({

            success: true,

            message:
                "DreamAnime APK successfully upload ho gayi.",

            filename:
                req.file.originalname,

            version:
                version,

            downloadUrl:
                "/download"

        });

    }
);


// ==================================================
// ADMIN CURRENT APK STATUS
// ==================================================

app.get(
    "/api/admin/latest-apk",
    (req, res) => {

        const latestApk =
            getLatestApk();


        if (!latestApk) {

            return res.json({

                success: true,

                available: false

            });

        }


        return res.json({

            success: true,

            available: true,

            filename:
                latestApk.filename,

            originalName:
                latestApk.originalName,

            version:
                latestApk.version,

            uploadedAt:
                latestApk.uploadedAt

        });

    }
);


// ==================================================
// HEALTH CHECK
// ==================================================

app.get(
    "/api/health",
    (req, res) => {

        return res.json({

            success: true,

            service:
                "DreamAnime Website",

            status:
                "online",

            time:
                new Date().toISOString()

        });

    }
);


// ==================================================
// 404 API HANDLER
// ==================================================

app.use(
    (req, res, next) => {

        if (
            req.path.startsWith(
                "/api/"
            )
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "API endpoint not found."

            });

        }


        next();

    }
);


// ==================================================
// ERROR HANDLER
// ==================================================

app.use(
    (
        err,
        req,
        res,
        next
    ) => {

        console.error(
            "SERVER ERROR:",
            err
        );


        if (
            err.code ===
            "LIMIT_FILE_SIZE"
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "APK 500 MB se zyada nahi ho sakti."

            });

        }


        return res.status(400).json({

            success: false,

            message:
                err.message ||
                "Something went wrong."

        });

    }
);


// ==================================================
// START SERVER
// ==================================================

app.listen(
    PORT,
    () => {

        console.log(
            "======================================"
        );

        console.log(
            "DreamAnime Website Server"
        );

        console.log(
            `Server running on port ${PORT}`
        );

        console.log(
            `Uploads directory: ${uploadsDir}`
        );

        console.log(
            "======================================"

        );

    }
);