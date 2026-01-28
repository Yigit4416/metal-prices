import { Database } from "bun:sqlite";

console.log("Initializing database connection...");

// This will create the 'gold_prices.sqlite' file in the backend directory
export const db = new Database("gold_prices.sqlite");

// --- SCHEMA SETUP ---
// This query defines the structure of our data table.
const createTableQuery = `
CREATE TABLE IF NOT EXISTS gold_prices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  buying TEXT NOT NULL,
  selling TEXT NOT NULL,
  status TEXT CHECK(status IN ('up', 'down', 'neutral')),
  changeRate TEXT,
  changeAmount TEXT,
  time TEXT,
  scrapedAt DATETIME DEFAULT (datetime('now','localtime'))
);`;

// Run the query to ensure the table exists when the app starts.
db.run(createTableQuery);

console.log("Database initialized and 'gold_prices' table is ready.");
