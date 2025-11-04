# DB API TEST


## .env

```
DATABASE_URL=your db connection string
PORT=3000

```

---

## Package Installation

```
npm install express dotenv pg

```

---

## Index.js file

Create an index.js file and paste the codes bellow to test the API

```

console.log(' Starting index.js...');

require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 5000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: { rejectUnauthorized: false },
});

pool.on('connect', () => {
  console.log(' Connected to community_wallet database on Supabase');
});

pool.on('error', (err) => {
  console.error(' PostgreSQL client error', err);
  process.exit(-1);
});

// Controllers
const getBalance = async (req, res) => {
  const { group_id } = req.params;
  try {
    const q = 'SELECT * FROM vw_group_balance WHERE group_id = $1';
    const result = await pool.query(q, [group_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Balance not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching balance:', error);
    res.status(500).json({ message: error.message });
  }
};

const getContributions = async (req, res) => {
  const { group_id } = req.params;
  try {
    const q = 'SELECT * FROM vw_member_contributions WHERE group_id = $1';
    const result = await pool.query(q, [group_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Contributions not found' });
    }

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching contributions:', error);
    res.status(500).json({ message: error.message });
  }
};

// API routes
app.get('/groups/:group_id/balance', getBalance);
app.get('/groups/:group_id/contributions', getContributions);

// Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


```

---

## Response
After successfully testing the APIs on Postman

1. http://localhost:3000/groups/09e7a2ad-25c4-4820-9dbc-35439a133b8e/balance
```
{
    "group_id": "09e7a2ad-25c4-4820-9dbc-35439a133b8e",
    "balance_kobo": "4500000"
}

```

2. http://localhost:3000/groups/09e7a2ad-25c4-4820-9dbc-35439a133b8e/contributions
```
[
    {
        "group_id": "09e7a2ad-25c4-4820-9dbc-35439a133b8e",
        "user_id": "40385fa1-4d2f-4116-800b-da941a4bf8c9",
        "total_contributed_kobo": "2500000"
    },
    {
        "group_id": "09e7a2ad-25c4-4820-9dbc-35439a133b8e",
        "user_id": "9898960e-af02-4838-b877-3478a4119018",
        "total_contributed_kobo": "5000000"
    }
]

```
