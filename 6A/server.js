
const express = require("express");
const multer = require("multer");
const sharp = require("sharp");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const db = require("./database");

const app = express();
app.use(express.json());

const UPLOAD_DIR = "uploads";
const THUMB_DIR = "thumbnails";

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(THUMB_DIR, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Check actual file content, not just the extension
function getFileType(buffer) {
  if (buffer.subarray(0, 5).toString() === "%PDF-")
    return { ext: "pdf", mime: "application/pdf" };

  if (
    buffer[0] === 0xFF &&
    buffer[1] === 0xD8 &&
    buffer[2] === 0xFF
  )
    return { ext: "jpg", mime: "image/jpeg" };

  if (
    buffer.subarray(0, 8).equals(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
    )
  )
    return { ext: "png", mime: "image/png" };

  return null;
}

// Upload one or multiple documents
app.post("/documents", (req, res) => {
  upload.array("files", 10)(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        error: err.code === "LIMIT_FILE_SIZE"
          ? "Each file must be 5 MB or smaller"
          : err.message
      });
    }

    if (!req.files || req.files.length === 0)
      return res.status(400).json({ error: "Upload at least one file" });

    const saved = [];
    const errors = [];

    for (const file of req.files) {
      let filename;
      let thumbnail;

      try {
        const detected = getFileType(file.buffer);

        if (!detected) {
          errors.push({
            file: file.originalname,
            reason: "Only genuine PDF, JPG and PNG files are allowed"
          });
          continue;
        }

        // Check duplicate content using SHA-256
        const hash = crypto
          .createHash("sha256")
          .update(file.buffer)
          .digest("hex");

        if (db.prepare("SELECT id FROM documents WHERE hash = ?")
          .get(hash)) {
          errors.push({
            file: file.originalname,
            reason: "Duplicate file already exists"
          });
          continue;
        }

        // Generate a safe, unique filename
        filename = crypto.randomUUID() + "." + detected.ext;
        const filePath = path.join(UPLOAD_DIR, filename);

        let thumbnailPath = null;

        if (detected.ext === "jpg" || detected.ext === "png") {
          thumbnail = crypto.randomUUID() + ".jpg";
          thumbnailPath = path.join(THUMB_DIR, thumbnail);

          // Validate the image and create a 200px-wide thumbnail
          await sharp(file.buffer)
            .resize({ width: 200, withoutEnlargement: true })
            .jpeg()
            .toFile(thumbnailPath);
        }

        fs.writeFileSync(filePath, file.buffer);

        try {
          const result = db.prepare(`
            INSERT INTO documents
            (title, type, tags, filename, originalname,
             mimetype, hash, size, thumbnail)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            req.body.title || file.originalname,
            req.body.type || detected.ext,
            req.body.tags || "",
            filename,
            path.basename(file.originalname),
            detected.mime,
            hash,
            file.size,
            thumbnail
          );

          saved.push({
            id: result.lastInsertRowid,
            name: file.originalname,
            message: "Uploaded successfully"
          });
        } catch (error) {
          fs.unlinkSync(filePath);
          if (thumbnailPath) fs.unlinkSync(thumbnailPath);
          throw error;
        }
      } catch (error) {
        errors.push({
          file: file.originalname,
          reason: error.code === "SQLITE_CONSTRAINT_UNIQUE"
            ? "Duplicate file already exists"
            : "Invalid image or file could not be saved"
        });
      }
    }

    res.status(saved.length ? 201 : 400).json({ saved, errors });
  });
});

// List documents with optional filters
app.get("/documents", (req, res) => {
  const { type, tag, from, to } = req.query;

  let sql = "SELECT * FROM documents WHERE deleted_at IS NULL";
  const params = [];

  if (type) {
    sql += " AND type = ?";
    params.push(type);
  }

  if (tag) {
    sql += " AND (',' || tags || ',') LIKE ?";
    params.push("%," + tag + ",%");
  }

  if (from) {
    sql += " AND date(created_at) >= date(?)";
    params.push(from);
  }

  if (to) {
    sql += " AND date(created_at) <= date(?)";
    params.push(to);
  }

  const documents = db.prepare(sql).all(...params);
  res.json(documents);
});

// Download document by ID
app.get("/documents/:id/download", (req, res) => {
  const doc = db.prepare(`
    SELECT * FROM documents
    WHERE id = ? AND deleted_at IS NULL
  `).get(req.params.id);

  if (!doc) return res.status(404).json({ error: "Document not found" });

  res.setHeader("Content-Type", doc.mimetype);
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="' +
    path.basename(doc.originalname).replace(/["\\\r\n]/g, "_") + '"'
  );

  const stream = fs.createReadStream(path.join(UPLOAD_DIR, doc.filename));
  stream.on("error", () => {
    if (!res.headersSent) res.status(404).json({ error: "File missing" });
    else res.destroy();
  });
  stream.pipe(res);
});

// Soft delete: keep the file for possible restoration
app.delete("/documents/:id", (req, res) => {
  const result = db.prepare(`
    UPDATE documents SET deleted_at = CURRENT_TIMESTAMP
    WHERE id = ? AND deleted_at IS NULL
  `).run(req.params.id);

  if (!result.changes)
    return res.status(404).json({ error: "Document not found" });

  res.json({ message: "Document moved to trash for 7 days" });
});

// Restore a document within 7 days
app.post("/documents/:id/restore", (req, res) => {
  const result = db.prepare(`
    UPDATE documents SET deleted_at = NULL
    WHERE id = ?
      AND deleted_at IS NOT NULL
      AND deleted_at >= datetime('now', '-7 days')
  `).run(req.params.id);

  if (!result.changes)
    return res.status(400).json({
      error: "Document not found or restoration period expired"
    });

  res.json({ message: "Document restored successfully" });
});

// List documents currently in trash
app.get("/trash", (req, res) => {
  const docs = db.prepare(`
    SELECT id, title, originalname, deleted_at
    FROM documents WHERE deleted_at IS NOT NULL
  `).all();

  res.json(docs);
});

// Start server
app.listen(3000, () => {
  console.log("Document service running at http://localhost:3000");
});
