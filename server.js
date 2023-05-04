const express = require('express');
const path = require('path');
const http = require('http');
const socketio = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const User = require('./user');
const bcrypt = require('bcrypt');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const port = process.env.PORT || 3000;
const databasePath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(databasePath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error('Failed to open database', err);
    return;
  }
  console.log('Connected to the database.');
});

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'register.html'));
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Check if the user already exists
    const user = await User.getByUsername(username, db);
    if (user) {
      return res.status(400).send('User already exists');
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create the user
    const newUser = new User(username, hashedPassword);
    await newUser.save(db);

    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

io.on('connection', (socket) => {
  console.log('New user connected.');

  // Send the message history to the new user
  db.all('SELECT * FROM messages', [], async (err, rows) => {
    if (err) {
      console.error(err);
      return;
    }

    for (const row of rows) {
      const sender = await User.getById(row.sender_id, db);
      const message = {
        username: sender.username,
        text: row.text,
        timestamp: row.timestamp,
      };
      socket.emit('message', message);
    }
  });

  socket.on('message', async (text) => {
    console.log('Message received:', text);

    // Get the current user
    const senderId = socket.handshake.query.userId;
    const sender = await User.getById(senderId, db);

    // Save the message in the database
    const timestamp = Date.now();
    db.run('INSERT INTO messages (sender_id, text, timestamp) VALUES (?, ?, ?)', [sender.id, text, timestamp], (err) => {
      if (err) {
        console.error(err);
        return;
      }

      // Send the message to all users
      const message = {
        username: sender.username,
        text,
        timestamp,
      };
      io.emit('message', message);
    });
  });
});

server.listen(port, () => {
  console.log(`Server listening on port ${port}.`);
});
