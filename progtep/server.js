const express = require('express');
const sqlite = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerDocs = require('./swaggerOptions');

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

// Rotta per visualizzare la documentazione Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

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

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Registra un nuovo utente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *               email:
 *                 type: string
 *               citta:
 *                 type: string
 *               titolo_studio:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Registrazione completata
 *       500:
 *         description: Errore interno del server
 */
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

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Effettua il login di un utente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login riuscito
 *       401:
 *         description: Password errata
 *       404:
 *         description: Utente non trovato
 */
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

/**
 * @swagger
 * /logout:
 *   get:
 *     summary: Effettua il logout dell'utente
 *     responses:
 *       302:
 *         description: Reindirizza alla pagina di login
 */
app.get('/logout', (req, res) => {
    res.redirect('/index.html'); 
});

/**
 * @swagger
 * /dashboard:
 *   get:
 *     summary: Visualizza la dashboard per la scelta del ruolo
 *     responses:
 *       200:
 *         description: Ritorna la pagina della dashboard
 */
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

/**
 * @swagger
 * /lavoratore:
 *   get:
 *     summary: Visualizza la pagina del lavoratore
 *     responses:
 *       200:
 *         description: Ritorna la pagina del lavoratore
 */
app.get('/lavoratore', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'lavoratore.html'));
});

/**
 * @swagger
 * /ristoratore:
 *   get:
 *     summary: Visualizza la pagina del ristoratore
 *     responses:
 *       200:
 *         description: Ritorna la pagina del ristoratore
 */
app.get('/ristoratore', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'ristoratore.html'));
});

// Avvio del server
app.listen(port, () => {
});
