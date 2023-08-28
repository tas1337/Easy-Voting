require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const validator = require('validator');

const app = express();
app.disable('x-powered-by');

// Basic security setup with Helmet
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Serve static files from the "public" directory
app.use(express.static('public'));

// Database connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE
});

// Connect to the database
db.connect((err) => {
  if (err) throw err;
  console.log('Connected to the database.');
});

// Use body-parser for parsing application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

// Function to get client IP address
const getClientIp = (req) => {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  return ip;
};

// Route handler for root URL
app.get('/', (req, res) => {
  const ip = getClientIp(req);



  const query = 'SELECT * FROM voting WHERE ip = ?';


  db.execute(query, [ip], (err, results) => {
    if (err) throw err;
    if (results.length > 0) {
      res.sendFile(__dirname + '/public/voted.html');
    } else {
      res.sendFile(__dirname + '/public/vote.html');
    }
  });
});

// POST handler for /vote
app.post('/vote', (req, res) => {
  const choice = req.body.choice;
  let name = req.body.name;
  const ip = getClientIp(req);

  // Validate 'choice' - it should be one of the predefined options
  const validChoices = ['Choice 1', 'Choice 2', 'Choice 3'];
  if (!validChoices.includes(choice)) {
    return res.status(400).send('Invalid choice');
  }

  // Validate 'name' - it should be a non-empty string with a max length of 50
  if (typeof name !== 'string' || name.length === 0 || name.length > 50) {
    return res.status(400).send('Invalid name');
  }

  // Sanitize 'name' to remove any dangerous characters
  name = validator.escape(name);

  // Further validate 'name' to check for any dangerous characters
  if (!validator.isAlphanumeric(name.replace(/\s+/g, ''))) {
    return res.status(400).send('Name contains invalid characters');
  }

  // If validation passes, proceed to insert into the database
  const query = 'INSERT INTO voting (ip, vote, name) VALUES (?, ?, ?)';
  db.execute(query, [ip, choice, name], (err, result) => {
    if (err) throw err;
    res.redirect('/voted.html');
  });
});

// POST handler to remove a vote
app.post('/remove-vote', (req, res) => {
  const ip = getClientIp(req);
  const query = 'DELETE FROM voting WHERE ip = ?';
  db.execute(query, [ip], (err, result) => {
    if (err) throw err;
    res.redirect('/');
  });
});

// Route to fetch and display all the votes
app.get('/results', (req, res) => {
  const query = 'SELECT vote, COUNT(*) as count FROM voting GROUP BY vote';
  db.query(query, (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});