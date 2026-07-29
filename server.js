// ------------------------------------------------------
// 1) Import modules (CommonJS for Render/Railway)
// ------------------------------------------------------
const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const fs = require("fs");
const path = require("path");

// ------------------------------------------------------
// 2) Create Express app
// ------------------------------------------------------
const app = express();
app.use(cors());
app.use(express.json());

// ------------------------------------------------------
// 3) Load JSON model
// ------------------------------------------------------
const modelPath = path.join(__dirname, "XOLModelCtl.json");
const model = JSON.parse(fs.readFileSync(modelPath, "utf8"));

// ------------------------------------------------------
// 4) Initialize SQLite (must be inside async function)
// ------------------------------------------------------
let db;

async function initDatabase() {
  db = await open({
    filename: path.join(__dirname, "xol.db"),
    driver: sqlite3.Database
  });

  console.log("SQLite database loaded successfully");
}

// ------------------------------------------------------
// 5) DMQ endpoint (matches your C# API)
// ------------------------------------------------------
app.post("/DMQ/:project/:xtgo/:tbxx/all", async (req, res) => {
  try {
    const { tbxx } = req.params;

    // Body contains base64 WHERE clause
    const encodedWhere = req.body["@"];
    const whereClause = Buffer.from(encodedWhere, "base64").toString("utf8");

    // Find config by TokenKey
    const cfg = model.ApiResCtl.find(
      x => x.TokenKey.toLowerCase() === tbxx.toLowerCase()
    );

    if (!cfg) {
      return res.status(404).json({ error: "Unknown TokenKey" });
    }

    const selectFields = cfg.SelectFields || "*";
    const tableName = cfg.TableName;

    // Build SQL
    const sql = `SELECT ${selectFields} FROM ${tableName} WHERE ${whereClause}`;

    // Query SQLite
    const rows = await db.all(sql);

    // Return same shape as your C# API
    res.json(rows);

  } catch (err) {
    console.error("DMQ error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ------------------------------------------------------
// 6) PORT + Start server
// ------------------------------------------------------
const PORT = process.env.PORT || 3000;

initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log("XOL API running on port " + PORT);
  });
});
