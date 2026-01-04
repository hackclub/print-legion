const express = require("express");
const Airtable = require("airtable");
const dotenv = require("dotenv");
const path = require("path");
const cors = require("cors");
dotenv.config();

const app = express();
const port = 3000;
if (!process.env.AIRTABLE_KEY || !process.env.AIRTABLE_BASE_ID) {
    throw new Error("Both AIRTABLE_KEY and AIRTABLE_BASE_ID must be defined.");
}

const base = new Airtable({ apiKey: process.env.AIRTABLE_KEY }).base(
    process.env.AIRTABLE_BASE_ID
);

app.use(cors());
app.use(express.json());

const ratingsTableId = process.env.AIRTABLE_RATINGS_TABLE_ID;
const ratingsTable = ratingsTableId ? base(ratingsTableId) : null;

const escapeFormulaValue = (value) => (value || "").replace(/'/g, "\\'");

const aggregateSummaries = (records) =>
    records.reduce((acc, record) => {
        const slackId = record.get("slack_id");
        const ratingValue = Number(record.get("rating"));
        if (!slackId || !Number.isFinite(ratingValue)) return acc;

        if (!acc[slackId]) {
            acc[slackId] = { sum: 0, count: 0 };
        }

        acc[slackId].sum += ratingValue;
        acc[slackId].count += 1;
        return acc;
    }, {});

const summarizeAggregates = (aggregateMap) => {
    const summary = {};
    Object.entries(aggregateMap).forEach(([slackId, stats]) => {
        const count = stats.count || 0;
        summary[slackId] = {
            average: count ? stats.sum / count : 0,
            count,
        };
    });
    return summary;
};

const hasRecentAirtableRating = async (slackId, raterSlackId) => {
    if (!ratingsTable) return false;
    const filterByFormula = `AND({slack_id}='${escapeFormulaValue(
        slackId
    )}', {rater_slack_id}='${escapeFormulaValue(
        raterSlackId
    )}', IS_AFTER(CREATED_TIME(), DATEADD(NOW(), -1, 'day'))) `;

    const records = await ratingsTable
        .select({
            fields: ["slack_id"],
            filterByFormula,
            maxRecords: 1,
        })
        .all();
    return records.length > 0;
};

async function fetchRatingsSummary(targetSlackId) {
    if (!ratingsTable) return {};

    const selectConfig = {
        fields: ["slack_id", "rating"],
    };

    if (targetSlackId) {
        selectConfig.filterByFormula = `({slack_id} = '${escapeFormulaValue(targetSlackId)}')`;
    }

    const records = await ratingsTable.select(selectConfig).all();
    const aggregate = aggregateSummaries(records);
    return summarizeAggregates(aggregate);
}

app.get("/api/stats/alltime", async (req, res) => {
    let total_weight = 0;
    let total_prints = 0;
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
        res.json({ total_prints, total_weight, total_spools_reimbursed });
    } catch (error) {
        console.error("Error fetching all-time stats:", error);
        res.status(500).json({ error: "Failed to fetch all-time stats" });
    }
});

app.get("/api/stats/leaderboard", async (req, res) => {
    let leaderboard_position = 1;
    try {
        const records = await base(process.env.AIRTABLE_TABLE_ID)
            .select({
                fields: [
                    "slack_id",
                    "Display Name",
                    "total_grams",
                    "Profile Picture",
                ],
                view: "Leaderboard",
            })
            .all();
        const leaderboard = records.map((record) => ({
            position: leaderboard_position++,
            slack_id: record.get("slack_id"),
            nickname: record.get("Display Name"),
            total_grams: record.get("total_grams") || 0,
            profile_pic: record.get("Profile Picture")[0]?.url,
        }));
        res.json(leaderboard);
    } catch (error) {
        console.error("Error fetching leaderboard stats:", error);
        res.status(500).json({ error: "Failed to fetch leaderboard stats" });
    }
});

app.get("/api/printers", async (req, res) => {
    try {
        const records = await base(process.env.AIRTABLE_TABLE_ID)
            .select({
                fields: [
                    "slack_id",
                    "Display Name",
                    "Profile Picture",
                    "website",
                    "Bio",
                    "Country",
                ], // Your actual field names
            })
            .all();
        const printers = records.map((record) => ({
            slack_id: record.get("slack_id"),
            nickname: record.get("Display Name"),
            profile_pic: record.get("Profile Picture")[0]?.url, // First attachment URL
            website: record.get("website"),
            bio: record.get("Bio"),
            country: record.get("Country"), // Assuming you have a 'Country' field
        }));
        res.json(printers);
    } catch (error) {
        console.error("Error fetching printers:", error);
        res.status(500).json({ error: "Failed to fetch printers" });
    }
});

app.get("/api/printers/ratings", async (req, res) => {
    if (!ratingsTable) {
        return res.status(500).json({ error: "Ratings table is not configured." });
    }

    try {
        const summary = await fetchRatingsSummary();
        res.json(summary);
    } catch (error) {
        console.error("Error loading ratings:", error);
        res.status(500).json({ error: "Failed to load ratings" });
    }
});

app.post("/api/printers/:slackId/rate", async (req, res) => {
    const { slackId } = req.params;
    const { rating, rater_slack_id: raterSlackId } = req.body || {};
    const numericRating = Number(rating);

    if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
        return res
            .status(400)
            .json({ error: "Rating must be a number between 1 and 5." });
    }

    if (!raterSlackId || typeof raterSlackId !== "string") {
        return res.status(400).json({ error: "Please include your Slack ID." });
    }

    if (!ratingsTable) {
        return res.status(500).json({ error: "Ratings table is not configured." });
    }

    try {
        if (await hasRecentAirtableRating(slackId, raterSlackId.trim())) {
            return res
                .status(429)
                .json({ error: "You already rated this printer in the last 24 hours." });
        }

        await ratingsTable.create([
            {
                fields: {
                    slack_id: slackId,
                    rating: numericRating,
                    rater_slack_id: raterSlackId,
                },
            },
        ]);

        const summary = await fetchRatingsSummary(slackId);
        res.json({ slack_id: slackId, summary: summary[slackId] || { average: 0, count: 0 } });
    } catch (error) {
        console.error("Error saving rating:", error);
        res.status(500).json({ error: "Failed to save rating" });
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
