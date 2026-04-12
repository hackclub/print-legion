const express = require("express");
const Airtable = require("airtable");
const dotenv = require("dotenv");
const path = require("path");
const cors = require("cors");
dotenv.config();

const app = express();
const port = 3000;
// 1. Configure Airtable
const base = new Airtable({ apiKey: process.env.AIRTABLE_KEY }).base(
    process.env.AIRTABLE_BASE_ID,
);

app.use(cors());

const CACHE_TTL = process.env.NODE_ENV === "production" ? 2 * 60 * 1000 : 0;
const cache = {};

function getCached(key) {
    const entry = cache[key];
    if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
        return entry.data;
    }
    return null;
}

function setCache(key, data) {
    cache[key] = { data, timestamp: Date.now() };
}

function getProfilePicUrl(slackId) {
    if (!slackId) return null;
    return `https://cachet.dunkirk.sh/users/${slackId}/r`;
}

app.get("/api/stats/alltime", async (req, res) => {
    const cached = getCached("alltime");
    if (cached) return res.json(cached);

    let total_weight = 0;
    let total_prints = 0;
    let total_printers = 0;
    let total_countries = 0;

    // fetch all time prints
    try {
        const records = await base(process.env.AIRTABLE_PRINT_TABLE_ID)
            .select({
                fields: ["weight_grams"], // Your actual field names
            })
            .all();
        records.forEach((record) => {
            total_prints++;
            total_weight += record.get("weight_grams") || 0;
        });
        total_spools_reimbursed = total_weight / 750; // spools are reimbursed every 750g
    } catch (error) {
        console.error("Error fetching all-time stats:", error);
        res.status(500).json({ error: "Failed to fetch all-time stats" });
    }

    try {
        const records = await base(process.env.AIRTABLE_PRINTER_TABLE_ID)
            .select({
                fields: ["Country"], // Your actual field names
            })
            .all();
        const countriesSet = new Set();
        records.forEach((record) => {
            total_printers++;
            const country = record.get("Country");
            if (country) {
                countriesSet.add(country);
            }
        });
        total_countries = countriesSet.size;
    } catch (error) {
        console.error("Error fetching printer stats:", error);
    }
    const data = { total_prints, total_weight, total_spools_reimbursed, total_countries };
    setCache("alltime", data);
    res.json(data);
});

app.get("/api/stats/leaderboard", async (req, res) => {
    const cached = getCached("leaderboard");
    if (cached) return res.json(cached);

    let leaderboard_position = 1;
    try {
        const records = await base(process.env.AIRTABLE_PRINTER_TABLE_ID)
            .select({
                fields: [
                    "slack_id",
                    "Display Name",
                    "total_grams",
                    "total_prints",
                ],
                view: "Leaderboard",
            })
            .all();
        const leaderboard = records.map((record) => {
            const slack_id = record.get("slack_id");
            return {
                position: leaderboard_position++,
                slack_id,
                nickname: record.get("Display Name"),
                total_grams: record.get("total_grams") || 0,
                total_prints: record.get("total_prints") || 0,
                profile_pic: getProfilePicUrl(slack_id),
            };
        });
        setCache("leaderboard", leaderboard);
        res.json(leaderboard);
    } catch (error) {
        console.error("Error fetching leaderboard stats:", error);
        res.status(500).json({ error: "Failed to fetch leaderboard stats" });
    }
});

app.get("/api/printers", async (req, res) => {
    const cached = getCached("printers");
    if (cached) return res.json(cached);

    try {
        const records = await base(process.env.AIRTABLE_PRINTER_TABLE_ID)
            .select({
                fields: [
                    "slack_id",
                    "Display Name",
                    "website",
                    "Bio",
                    "Country",
                    "total_prints",
                    "total_grams",
                ],
                view: "Leaderboard_inclusive",
            })
            .all();
        const printers = records.map((record) => {
            const slack_id = record.get("slack_id");
            return {
                slack_id,
                nickname: record.get("Display Name"),
                profile_pic: getProfilePicUrl(slack_id),
                website: record.get("website"),
                bio: record.get("Bio"),
                country: record.get("Country"),
                total_prints: record.get("total_prints") || 0,
                total_grams: record.get("total_grams") || 0,
            };
        });
        setCache("printers", printers);
        res.json(printers);
    } catch (error) {
        console.error("Error fetching printers:", error);
        res.status(500).json({ error: "Failed to fetch printers" });
    }
});

// Serve the frontend from the site/dist directory
app.use(express.static(path.resolve(__dirname, "../site/dist")));
app.get("/{*any}", (req, res, next) => {
    // Only serve index.html for non-API, non-static requests
    if (req.path.startsWith("/api/")) return next();
    // Prevent directory traversal attacks
    if (req.path.includes("..")) return res.status(400).send("Bad Request");
    res.sendFile(path.resolve(__dirname, "../site/dist", "index.html"));
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
