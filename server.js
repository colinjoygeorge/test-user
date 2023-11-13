const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

const db = new sqlite3.Database('data.db');

// Create a table to store the calendar data
db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS calendar (year INT NOT NULL, month INT NOT NULL, day INT NOT NULL, PRIMARY KEY (year, month, day))");

  // Create a stored procedure to populate the calendar for a specific month and year
  db.run(`CREATE TRIGGER IF NOT EXISTS PopulateCalendar
          AFTER INSERT ON calendar
          BEGIN
              -- Calculate the last day of the target month
              UPDATE calendar
              SET day = (SELECT DAY(LAST_DAY(NEW.year || '-' || NEW.month || '-01')))
              WHERE rowid = NEW.rowid;
          END`);

  // Create a users table
  db.run("CREATE TABLE IF NOT EXISTS users (user_id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL, password_hash TEXT NOT NULL, email TEXT NOT NULL)");
});

// Insert a new user into the users table (assuming the password is already hashed)
app.post('/adduser', (req, res) => {
  const { username, password_hash, email } = req.body;
  db.run("INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)", [username, password_hash, email], function(err) {
    if (err) {
      return res.status(500).send(err.message);
    }
    res.status(200).send('User added successfully.');
  });
});

// Check if a user with the provided username and password exists
app.post('/checkuser', (req, res) => {
  const { username, password_hash } = req.body;
  db.get("SELECT * FROM users WHERE username = ? AND password_hash = ?", [username, password_hash], (err, row) => {
    if (err) {
      return res.status(500).send(err.message);
    }
    if (row) {
      res.status(200).send('User found.');
    } else {
      res.status(404).send('User not found.');
    }
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
