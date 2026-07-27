import express from "express";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import fs from "fs";

const app = express();
app.use(express.json());

// Load your JSON model
const model = JSON.parse(fs.readFileSync("XOLModelCtl.json", "utf8"));

// Open SQLite database
const db = await open({
  filename: "xol.db",
  driver: sqlite3.Database
});

// Generic DMQ endpoint (matches your C# API)
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
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Start server
app.listen(3000, () => {
  console.log("XOL API running on port 3000");
});

