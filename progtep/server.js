const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const cookieParser = require('cookie-parser');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');
const serveStatic = require('serve-static');
const http = require('http');
const { Server } = require('socket.io');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const app = express();
const port = 3000;

// Create HTTP server
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(serveStatic(path.join(__dirname, 'views')));

// Configure sessions
app.use(
    session({
        store: new SQLiteStore(),
        secret: 'ilTuoSegretoSuperSegreto123',
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false, maxAge: 60000 }, // Set secure: true if using HTTPS
    })
);


// Configurazione per il login tramite Google
passport.use(new GoogleStrategy({
    clientID: '13892389865-r5k64i2d6s5rkjg2nstafvq7husg13nh.apps.googleusercontent.com',
    clientSecret: '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',
    callbackURL: '/auth/google/callback'
}, (accessToken, refreshToken, profile, done) => {
    // Puoi salvare o gestire il profilo utente qui
    return done(null, profile);
}));

// Serializzazione e deserializzazione utente
passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

// Rotte per il login tramite Google
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', passport.authenticate('google', {
    failureRedirect: '/login'
}), (req, res) => {
    // Reindirizza dopo il successo del login tramite Google
    res.redirect('/home');
});


// Connect to the database
const db = new sqlite3.Database('database.db', (err) => {
    if (err) {
        console.error('Errore durante la connessione al database:', err);
    } else {
        console.log('Connesso al database SQLite.');

        // Create users table
        db.run(
            `CREATE TABLE IF NOT EXISTS userss (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE,
                telefono TEXT NOT NULL,
                data_nascita TEXT NOT NULL,
                citta TEXT NOT NULL,
                ruolo TEXT NOT NULL,
                password TEXT NOT NULL
            )`,
            (err) => {
                if (err) console.error('Errore durante la creazione della tabella utenti:', err);
            }
        );

        // Create preferences table
        db.run(
            `CREATE TABLE IF NOT EXISTS preferences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                country TEXT NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                job_type TEXT NOT NULL,
                restaurant_type TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES userss(id)
            )`,
            (err) => {
                if (err) console.error('Errore durante la creazione della tabella preferenze:', err);
            }
        );
    }
});

// Registration endpoint
app.post('/register', (req, res) => {
    const { email, telefono, data_nascita, citta, ruolo, password } = req.body;

    const query = `INSERT INTO userss (email, telefono, data_nascita, citta, ruolo, password) VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(query, [email, telefono, data_nascita, citta, ruolo, password], function (err) {
        if (err) {
            if (err.code === 'SQLITE_CONSTRAINT') {
                return res.status(400).send('Utente già registrato');
            }
            console.error('Errore durante la registrazione:', err);
            return res.status(500).send('Errore del server');
        }
        res.status(201).send('Registrazione completata!');
    });
});

// Login endpoint
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    const query = `SELECT * FROM userss WHERE email = ? AND password = ?`;
    db.get(query, [email, password], (err, row) => {
        if (err) {
            console.error('Errore durante il login:', err);
            return res.status(500).send('Errore del server');
        }
        if (!row) {
            return res.status(401).send('Credenziali non valide');
        }

        req.session.user = {
            id: row.id,
            email: row.email,
            ruolo: row.ruolo,
        };

        res.json({ redirect: '/dashboard' });
    });
});

// Logout endpoint
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Errore durante il logout:', err);
            return res.status(500).send('Errore del server');
        }
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
});

// Dashboard route
app.get('/dashboard', (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('Accesso non autorizzato');
    }
    res.sendFile(path.join(__dirname, '/views/dashboard.html'));
});

// Chat route
app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, '/views/chat.html'));
});

// Serve index and registration pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/views/index.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '/views/registra.html'));
});

// WebSocket events
io.on('connection', (socket) => {
    console.log('Un utente si è connesso');

    socket.on('chat message', (msg) => {
        io.emit('chat message', msg);
    });

    socket.on('disconnect', () => {
        console.log('Un utente si è disconnesso');
    });
});

// Start server
server.listen(port, 'localhost', (err) => {
    if (err) {
        console.error('Errore durante l\'avvio del server:', err);
    } else {
        console.log(`Server in esecuzione su http://localhost:${port}`);
    }
});
