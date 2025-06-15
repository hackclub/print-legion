const express = require('express')
const Airtable = require('airtable')
const dotenv = require('dotenv')
dotenv.config()

const app = express()
const port = 3000
// 1. Configure Airtable
const base = new Airtable({ apiKey: process.env.AIRTABLE_KEY }).base(process.env.AIRTABLE_BASE_ID);

app.get('/', (req, res) => {
  res.send('Hello World!')
})

// 2. Minimal Endpoint
app.get('/api/printers', async (req, res) => {
  try {
    const records = await base(process.env.AIRTABLE_TABLE_ID).select({
      fields: ['slack_id', 'Display Name', 'Profile Picture', "website", "Bio", "Country"] // Your actual field names
    }).all();
    const printers = records.map(record => ({
      slack_id: record.get('slack_id'),
      nickname: record.get('Display Name'),
      profile_pic: record.get('Profile Picture')[0]?.url, // First attachment URL
      website: record.get('website'),
      bio: record.get('Bio'),
      country: record.get('Country') // Assuming you have a 'Country' field
    }));
    res.json(printers);
  } catch (error) {
    console.error('Error fetching printers:', error);
    res.status(500).json({ error: 'Failed to fetch printers' });
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
