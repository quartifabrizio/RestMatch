const express = require('express');
const sqlite = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');
const app = express();
const port = 3000;

// Connessione al database SQLite
let db = new sqlite.Database('./database.db', (err) => {
    if (err) {
        return console.error(err.message);
    }
    console.log('Connesso al database SQLite');
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Servire il file index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Creazione della tabella utenti
db.run(`CREATE TABLE IF NOT EXISTS utenti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT,
    email TEXT,
    citta TEXT,
    titolo_studio TEXT,
    password TEXT
)`);

// API di registrazione
app.post('/register', async (req, res) => {
    const { nome, email, citta, titolo_studio, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(`INSERT INTO utenti (nome, email, citta, titolo_studio, password) VALUES (?, ?, ?, ?, ?)`, 
    [nome, email, citta, titolo_studio, hashedPassword], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Registrazione completata', id: this.lastID });
    });
});

app.get('/logout', (req, res) => {
    // Puoi gestire qui la logica di logout, come cancellare la sessione
    res.redirect('/index.html'); // Reindirizza alla pagina di login
});

// API di login
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    db.get('SELECT * FROM utenti WHERE email = ?', [email], async (err, user) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!user) {
            return res.status(404).json({ message: 'Utente non trovato' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Password errata' });
        }

        // Login riuscito, reindirizza alla dashboard
        res.json({ message: 'Login riuscito', redirect: '/dashboard' });
    });
});

// Dashboard per la scelta del ruolo
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

// Rotte per le pagine dei ruoli
app.get('/lavoratore', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'lavoratore.html'));
});

app.get('/ristoratore', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'ristoratore.html'));
});

// Avvio del server
app.listen(port, '37.27.91.38', () => {
    console.log(`Server in esecuzione su http://37.27.91.38:${port}`);
});;

