require('dotenv').config();
const express = require('express');
const mysql = require('mysql');

const app = express();
const port = process.env.PORT || 3306;

// --- CSP Middleware Add કરો ---
app.use((req, res, next) => {
  const csp = [
    "default-src 'self'",
    "frame-ancestors https://*.myshopify.com https://admin.shopify.com",
    "script-src 'self' 'unsafe-inline' https://cdn.shopify.com https://*.shopifycloud.com",
    "style-src 'self' 'unsafe-inline' https://cdn.shopify.com",
    "img-src 'self' data: https://cdn.shopify.com https://*.shopifycdn.net",
    "connect-src 'self' https://*.shopifycloud.com https://*.shopifysvc.com https://monorail-edge.shopifysvc.com https://monorail.shopifysvc.com https://admin.shopify.com https://*.myshopify.com https://cdn.shopify.com",
    "font-src 'self' https://cdn.shopify.com",
  ].join('; ');

  res.setHeader('Content-Security-Policy', csp);
  next();
});

// MySQL સાથે કનેક્શન
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect(err => {
  if (err) console.error('MySQL connection error:', err);
  else console.log('Connected to MySQL database');
});

app.use(express.json());

// Home Route
app.get('/', (req, res) => {
  res.send('Hello! Node.js + MySQL + Ngrok template is running.');
});

// Table થી data લાવવા માટે
app.get('/data/:table', (req, res) => {
  const table = req.params.table;
  db.query(`SELECT * FROM \`${table}\``, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Table માં data insert કરવા માટે
app.post('/data/:table', (req, res) => {
  const table = req.params.table;
  const data = req.body; // Example: { column1: "value1", column2: "value2" }
  db.query(`INSERT INTO \`${table}\` SET ?`, data, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ insertedId: result.insertId });
  });
});

// Server start
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
