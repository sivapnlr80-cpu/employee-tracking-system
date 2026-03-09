const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
// Serve static files
app.use(express.static('public'));

// Route handlers for clean URLs
app.get('/admin', (req, res) => {
  res.sendFile(__dirname + '/public/admin.html');
});

app.get('/track', (req, res) => {
  res.sendFile(__dirname + '/public/track.html');
});

app.get('/track/:sessionId', (req, res) => {
  res.sendFile(__dirname + '/public/track.html');
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Database setup
const db = new sqlite3.Database('./tracking.db');

// Initialize database tables
db.serialize(() => {
  // Admin users table
  db.run(`CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Employees table
  db.run(`CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    employee_id TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Tracking sessions table
  db.run(`CREATE TABLE IF NOT EXISTS tracking_sessions (
    id TEXT PRIMARY KEY,
    admin_id INTEGER NOT NULL,
    employee_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    FOREIGN KEY (admin_id) REFERENCES admins (id),
    FOREIGN KEY (employee_id) REFERENCES employees (id)
  )`);

  // Location data table
  db.run(`CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    accuracy REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES tracking_sessions (id)
  )`);

  // Consent records table
  db.run(`CREATE TABLE IF NOT EXISTS consent_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    employee_id INTEGER NOT NULL,
    consent_given BOOLEAN NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES tracking_sessions (id),
    FOREIGN KEY (employee_id) REFERENCES employees (id)
  )`);

  // Create default admin user (password: admin123)
  const defaultAdmin = {
    username: 'admin',
    password: bcrypt.hashSync('admin123', 10)
  };
  
  db.run(`INSERT OR IGNORE INTO admins (username, password) VALUES (?, ?)`, 
    [defaultAdmin.username, defaultAdmin.password]);
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware for JWT authentication
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Routes
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  db.get('SELECT * FROM admins WHERE username = ?', [username], (err, admin) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!admin || !bcrypt.compareSync(password, admin.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, user: { id: admin.id, username: admin.username } });
  });
});

app.post('/api/sessions', authenticateToken, (req, res) => {
  const { employeeId } = req.body;
  const sessionId = uuidv4();

  if (!employeeId) {
    return res.status(400).json({ error: 'Employee ID required' });
  }

  // Check if employee exists
  db.get('SELECT * FROM employees WHERE employee_id = ?', [employeeId], (err, employee) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!employee) {
      // Create new employee
      db.run('INSERT INTO employees (employee_id, name, email) VALUES (?, ?, ?)', 
        [employeeId, `Employee ${employeeId}`, `${employeeId}@company.com`], 
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to create employee' });
          }
          
          createSession(this.lastID);
        });
    } else {
      createSession(employee.id);
    }
  });

  function createSession(empId) {
    db.run('INSERT INTO tracking_sessions (id, admin_id, employee_id) VALUES (?, ?, ?)', 
      [sessionId, req.user.id, empId], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create session' });
      }

      res.json({ 
        sessionId,
        trackingLink: `${req.protocol}://${req.get('host')}/track/${sessionId}`
      });
    });
  }
});

app.get('/api/sessions/:sessionId', (req, res) => {
  const { sessionId } = req.params;

  db.get(`SELECT s.*, e.name as employee_name, e.employee_id 
           FROM tracking_sessions s 
           JOIN employees e ON s.employee_id = e.id 
           WHERE s.id = ?`, [sessionId], (err, session) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(session);
  });
});

app.post('/api/sessions/:sessionId/consent', (req, res) => {
  const { sessionId } = req.params;
  const { consent, employeeId } = req.body;
  const ipAddress = req.ip;
  const userAgent = req.get('User-Agent');

  if (typeof consent !== 'boolean') {
    return res.status(400).json({ error: 'Consent must be boolean' });
  }

  db.get('SELECT * FROM tracking_sessions WHERE id = ?', [sessionId], (err, session) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Record consent
    db.run(`INSERT INTO consent_records (session_id, employee_id, consent_given, ip_address, user_agent) 
            VALUES (?, ?, ?, ?, ?)`, 
      [sessionId, session.employee_id, consent, ipAddress, userAgent], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to record consent' });
      }

      // Update session status
      const newStatus = consent ? 'active' : 'declined';
      db.run('UPDATE tracking_sessions SET status = ? WHERE id = ?', [newStatus, sessionId]);

      // Notify admin about consent
      io.emit('consent_update', { sessionId, consent, employeeId: session.employee_id });

      res.json({ success: true, status: newStatus });
    });
  });
});

app.post('/api/sessions/:sessionId/location', (req, res) => {
  const { sessionId } = req.params;
  const { latitude, longitude, accuracy } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).json({ error: 'Latitude and longitude required' });
  }

  // Verify session is active
  db.get('SELECT * FROM tracking_sessions WHERE id = ? AND status = "active"', [sessionId], (err, session) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!session) {
      return res.status(404).json({ error: 'Session not found or not active' });
    }

    // Store location
    db.run('INSERT INTO locations (session_id, latitude, longitude, accuracy) VALUES (?, ?, ?, ?)', 
      [sessionId, latitude, longitude, accuracy], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to store location' });
      }

      // Broadcast location to admin dashboard
      io.emit('location_update', {
        sessionId,
        latitude,
        longitude,
        accuracy,
        timestamp: new Date().toISOString()
      });

      res.json({ success: true });
    });
  });
});

app.post('/api/sessions/:sessionId/end', authenticateToken, (req, res) => {
  const { sessionId } = req.params;

  db.run('UPDATE tracking_sessions SET status = "ended", ended_at = CURRENT_TIMESTAMP WHERE id = ?', [sessionId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to end session' });
    }

    // Notify all clients that session ended
    io.emit('session_ended', { sessionId });

    res.json({ success: true });
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join_session', (sessionId) => {
    socket.join(sessionId);
    console.log(`Client ${socket.id} joined session ${sessionId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Employee tracking system running on port ${PORT}`);
  console.log(`Admin dashboard: http://localhost:${PORT}/admin`);
  console.log(`Employee tracking: http://localhost:${PORT}/track`);
});
