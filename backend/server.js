const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize SQLite Database (creates a file called database.db)
const db = new Database('database.db');

// Create the Expenses table
// We use idempotency_key to prevent duplicate submissions on network retries
db.exec(`
  CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    amount INTEGER NOT NULL, 
    category TEXT NOT NULL,
    description TEXT,
    date TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    idempotency_key TEXT UNIQUE
  )
`);

// Prepared statements for performance and security
const insertExpense = db.prepare(`
  INSERT INTO expenses (id, amount, category, description, date, idempotency_key)
  VALUES (@id, @amount, @category, @description, @date, @idempotency_key)
`);

const checkIdempotency = db.prepare(`
  SELECT * FROM expenses WHERE idempotency_key = ?
`);

// POST /expenses
app.post('/expenses', (req, res) => {
  try {
    const { amount, category, description, date } = req.body;
    const idempotencyKey = req.headers['idempotency-key'];

    // 1. Check for Idempotency (Network Retry Handling)
    if (idempotencyKey) {
      const existing = checkIdempotency.get(idempotencyKey);
      if (existing) {
        // Return existing record formatted properly
        existing.amount = existing.amount / 100; 
        return res.status(200).json(existing);
      }
    }

    // 2. Basic Validation
    if (amount === undefined || !category || !date) {
      return res.status(400).json({ error: "Amount, category, and date are required." });
    }

    // 3. Money Handling: Convert float (e.g. 10.50) to integer cents/paise (1050)
    const amountInCents = Math.round(Number(amount) * 100);

    const newExpense = {
      id: uuidv4(),
      amount: amountInCents,
      category,
      description: description || '',
      date,
      idempotency_key: idempotencyKey || null
    };

    insertExpense.run(newExpense);

    // Format for response
    newExpense.amount = newExpense.amount / 100;
    res.status(201).json(newExpense);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /expenses
app.get('/expenses', (req, res) => {
  try {
    const { category, sort } = req.query;
    let query = "SELECT * FROM expenses";
    const params = [];

    // Filter by Category
    if (category) {
      query += " WHERE category = ?";
      params.push(category);
    }

   // Sort by Date
    if (sort === 'date_desc') {
      query += " ORDER BY date DESC, created_at DESC";
    } else if (sort === 'date_asc') {
      query += " ORDER BY date ASC, created_at ASC";
    } else {
      // Default fallback
      query += " ORDER BY date DESC, created_at DESC"; 
    }

    const stmt = db.prepare(query);
    const expenses = stmt.all(...params);

    // Convert integer cents back to decimal for the frontend
    const formattedExpenses = expenses.map(exp => ({
      ...exp,
      amount: exp.amount / 100
    }));

    res.status(200).json(formattedExpenses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});