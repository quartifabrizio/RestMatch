const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
const path = require('path');
const serveStatic = require('serve-static');
app.use(serveStatic(path.join(__dirname, 'views')));

// Connessione al database
const db = new sqlite3.Database('database.db', (err) => {
    if (err) {
        console.error('Errore durante la connessione al database:', err);
    } else {
        console.log('Connesso al database SQLite.');

        // Creazione della tabella utenti
        db.run(`
            CREATE TABLE IF NOT EXISTS userss (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE,
                telefono TEXT NOT NULL,
                data_nascita TEXT NOT NULL,
                citta TEXT NOT NULL,
                ruolo TEXT NOT NULL,
                password TEXT NOT NULL
            )
        `, (err) => {
            if (err) console.error('Errore durante la creazione della tabella:', err);
        });

        // Creazione della tabella preferenze
        db.run(`
            CREATE TABLE IF NOT EXISTS preferences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                country TEXT NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                job_type TEXT NOT NULL,
                restaurant_type TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES userss(id)
            )
        `, (err) => {
            if (err) console.error('Errore durante la creazione della tabella preferenze:', err);
        });
    }
});

// Endpoint di registrazione
app.post('/register', (req, res) => {
    const { email, telefono, data_nascita, citta, ruolo, password } = req.body;

    const query = `
        INSERT INTO userss (email, telefono, data_nascita, citta, ruolo, password) 
        VALUES (?, ?, ?, ?, ?, ?)
    `;
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

// Endpoint di login
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
        res.json({ redirect: '/dashboard' });
    });
});

app.post('/savePreferences', (req, res) => {
    const { region, city, startDate, endDate, jobType, restaurantType } = req.body;

    // Puoi salvare queste preferenze nel database, aggiungendo la logica di autenticazione
    console.log('Preferenze ricevute:', { region, city, startDate, endDate, jobType, restaurantType });

    // Simula una risposta di successo
    res.status(200).send('Preferenze salvate con successo');
});


// Servire i file HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/views/index.html'));
});
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '/views/registra.html'));
});
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '/views/dashboard.html'));
});

// Avviare il server
app.listen(port, () => {
    console.log(`Server in esecuzione su http://localhost:${port}`);
});
