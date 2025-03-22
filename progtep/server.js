require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const cookieParser = require('cookie-parser');
//const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');
const serveStatic = require('serve-static');
const http = require('http');
const { Server } = require('socket.io');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
// Swagger dependencies
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const hbs = require('hbs');

const app = express();
const port = 3000;

// Imposta la cartella dei template e il view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.use(express.static('public'));

// Register Handlebars helpers
hbs.registerHelper('equals', function(a, b) {
    return a === b;
});

hbs.registerHelper('eq', function(a, b, options) {
    if (arguments.length === 3) {
        // Block usage: {{#eq a b}}...{{/eq}}
        return a === b ? options.fn(this) : options.inverse(this);
    } else {
        // Non-block usage: {{eq a b}} or (eq a b)
        return a === b;
    }
});

// Swagger definition
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Documentazione',
      version: '1.0.0',
      description: 'Documentazione delle API del server',
      contact: {
        name: 'Supporto',
        url: 'https://example.com',
        email: 'support@example.com'
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Server di sviluppo'
      }
    ],
    components: {
      securitySchemes: {
        sessionAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'connect.sid'
        }
      },
      schemas: {
        User: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            id: {
              type: 'integer',
              description: 'ID utente generato automaticamente'
            },
            email: {
              type: 'string',
              description: 'Email dell\'utente'
            },
            telefono: {
              type: 'string',
              description: 'Numero di telefono dell\'utente'
            },
            data_nascita: {
              type: 'string',
              description: 'Data di nascita dell\'utente'
            },
            citta: {
              type: 'string',
              description: 'Città dell\'utente'
            },
            ruolo: {
              type: 'string',
              description: 'Ruolo dell\'utente'
            },
            password: {
              type: 'string',
              description: 'Password dell\'utente'
            }
          }
        },
        Preference: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'ID preferenza generato automaticamente'
            },
            user_id: {
              type: 'integer',
              description: 'ID utente di riferimento'
            },
            country: {
              type: 'string',
              description: 'Paese selezionato'
            },
            start_date: {
              type: 'string',
              description: 'Data di inizio'
            },
            end_date: {
              type: 'string',
              description: 'Data di fine'
            },
            job_type: {
              type: 'string',
              description: 'Tipo di lavoro'
            },
            restaurant_type: {
              type: 'string',
              description: 'Tipo di ristorante'
            }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              description: 'Email dell\'utente'
            },
            password: {
              type: 'string',
              description: 'Password dell\'utente'
            }
          }
        },
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              description: 'Email dell\'utente'
            },
            telefono: {
              type: 'string',
              description: 'Numero di telefono dell\'utente'
            },
            data_nascita: {
              type: 'string',
              description: 'Data di nascita dell\'utente'
            },
            citta: {
              type: 'string',
              description: 'Città dell\'utente'
            },
            ruolo: {
              type: 'string',
              description: 'Ruolo dell\'utente'
            },
            password: {
              type: 'string',
              description: 'Password dell\'utente'
            }
          }
        }
      }
    }
  },
  apis: ['./server.js'], // Percorso allo stesso file per leggere i commenti JSDoc
};

// Create HTTP server
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(serveStatic(path.join(__dirname, 'public'))); // Modificato per utilizzare una cartella public per gli asset statici

// Configure sessions - MODIFICATO per sessioni persistenti
app.use(
  session({
      secret: 'ilTuoSegretoSuperSegreto123',
      resave: false,
      saveUninitialized: false,
      cookie: {
          secure: false, // Cambiare a true se si usa HTTPS
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 giorni in millisecondi
      }
  })
);
// Initialize Passport.js
app.use(passport.initialize());
app.use(passport.session());

// Swagger init after all middleware
const specs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, { explorer: true }));

// Middleware per verificare l'autenticazione
function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/');
    }
    next();
}

// Configurazione per il login tramite Google
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_SECRET,
    callbackURL: 'http://localhost:3000/auth/google/callback'
}, (accessToken, refreshToken, profile, done) => {
    const email = profile.emails[0].value;
    const query = `SELECT * FROM userss WHERE email = ?`;

    db.get(query, [email], (err, row) => {
        if (err) return done(err);
        if (row) {
            return done(null, row);
        } else {
            const insertQuery = `INSERT INTO userss (email, telefono, data_nascita, citta, ruolo, password) VALUES (?, '', '', '', 'google', '')`;
            db.run(insertQuery, [email], function (err) {
                if (err) return done(err);
                return done(null, { id: this.lastID, email });
            });
        }
    });
}));

// Serializzazione e deserializzazione utente
passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

/**
 * @swagger
 * /auth/google:
 *   get:
 *     summary: Inizia l'autenticazione tramite Google
 *     description: Reindirizza l'utente alla pagina di autenticazione di Google
 *     tags: [Autenticazione]
 *     responses:
 *       302:
 *         description: Reindirizza alla pagina di Google per autenticazione
 */
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

/**
 * @swagger
 * /auth/google/callback:
 *   get:
 *     summary: Callback per l'autenticazione di Google
 *     description: Endpoint di callback dopo l'autenticazione tramite Google
 *     tags: [Autenticazione]
 *     responses:
 *       302:
 *         description: Reindirizza alla dashboard in caso di successo o alla pagina di login in caso di fallimento
 */
app.get('/auth/google/callback', passport.authenticate('google', {
    failureRedirect: '/login'
}), (req, res) => {
    // Salva i dati dell'utente nella sessione
    req.session.user = {
        id: req.user.id,
        email: req.user.email,
        ruolo: req.user.ruolo || 'google',
    };
    // Reindirizza dopo il successo del login tramite Google
    res.redirect('/dashboard');
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
            )`, (err) => {
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
            )`, (err) => {
                if (err) console.error('Errore durante la creazione della tabella preferenze:', err);
            }
        );
    }
});

/**
 * @swagger
 * /registra:
 *   post:
 *     summary: Registra un nuovo utente
 *     description: Registra un nuovo utente nel sistema
 *     tags: [Utenti]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Registrazione completata con successo
 *       400:
 *         description: Utente già registrato
 *       500:
 *         description: Errore del server
 */
app.post('/registra', (req, res) => {
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

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Effettua il login
 *     description: Autentica un utente tramite email e password
 *     tags: [Autenticazione]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *         application/x-www-form-urlencoded:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login avvenuto con successo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 redirect:
 *                   type: string
 *                   description: URL di reindirizzamento
 *       401:
 *         description: Credenziali non valide
 *       500:
 *         description: Errore del server
 */
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

/**
 * @swagger
 * /logout:
 *   get:
 *     summary: Effettua il logout
 *     description: Termina la sessione dell'utente
 *     tags: [Autenticazione]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       302:
 *         description: Reindirizza alla home page dopo il logout
 *       500:
 *         description: Errore del server
 */
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Errore durante il logout:', err);
            return res.status(500).send('Errore del server');
        }
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
});

/**
 * @swagger
 * /dashboard:
 *   get:
 *     summary: Pagina dashboard
 *     description: Restituisce la pagina dashboard dell'utente
 *     tags: [Pagine]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Pagina dashboard
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *       401:
 *         description: Accesso non autorizzato
 */
app.get('/dashboard', requireAuth, (req, res) => {
  // Recupera le preferenze dell'utente
  const queryPreferences = `SELECT * FROM preferences WHERE user_id = ?`;
  db.get(queryPreferences, [req.session.user.id], (err, preferences) => {
      if (err) {
          console.error('Errore durante il recupero delle preferenze:', err);
      }
      
      // Esempio di recupero delle offerte di lavoro (puoi personalizzare questa logica)
      const jobs = []; // Array vuoto per ora, puoi popolarlo con dati dal database
      
      // Modificato per utilizzare il template HBS con le preferenze
      res.render('dashboard', {
          user: req.session.user,
          preferences: preferences || {},
          jobs: jobs,
          year: new Date().getFullYear()
      });
  });
});

/**
 * @swagger
 * /chat:
 *   get:
 *     summary: Pagina chat
 *     description: Restituisce la pagina della chat
 *     tags: [Pagine]
 *     responses:
 *       200:
 *         description: Pagina della chat
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 */
app.get('/chat', (req, res) => {
    // Modificato per utilizzare il template HBS
    res.render('chat', {
        user: req.session.user,
        year: new Date().getFullYear()
    });
});

/**
 * @swagger
 * /:
 *   get:
 *     summary: Home page
 *     description: Restituisce la pagina principale
 *     tags: [Pagine]
 *     responses:
 *       200:
 *         description: Home page
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 */
app.get('/', (req, res) => {
    // Se l'utente è già autenticato, reindirizza alla dashboard
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    // Altrimenti mostra la pagina di login
    res.render('index', {
        year: new Date().getFullYear()
    });
});

/**
 * @swagger
 * /registra:
 *   get:
 *     summary: Pagina di registrazione
 *     description: Restituisce la pagina di registrazione utente
 *     tags: [Pagine]
 *     responses:
 *       200:
 *         description: Pagina di registrazione
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 */
app.get('/registra', (req, res) => {
    // Modificato per utilizzare il template HBS
    res.render('registra', {
        year: new Date().getFullYear()
    });
});

/**
 * @swagger
 * /save-preferences:
 *   post:
 *     summary: Salva le preferenze utente
 *     description: Salva le preferenze dell'utente nel database
 *     tags: [Utenti]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               region:
 *                 type: string
 *               city:
 *                 type: string
 *               startDate:
 *                 type: string
 *               endDate:
 *                 type: string
 *               jobType:
 *                 type: string
 *               restaurantType:
 *                 type: string
 *     responses:
 *       200:
 *         description: Preferenze salvate con successo
 *       401:
 *         description: Utente non autenticato
 *       500:
 *         description: Errore del server
 */
app.post('/save-preferences', requireAuth, (req, res) => {
    const { region, city, startDate, endDate, jobType, restaurantType } = req.body;
    const userId = req.session.user.id;

    const checkQuery = `SELECT * FROM preferences WHERE user_id = ?`;
    db.get(checkQuery, [userId], (err, row) => {
        if (err) {
            console.error('Errore durante il controllo delle preferenze:', err);
            return res.status(500).send('Errore del server');
        }

        if (row) {
            // Update existing preferences
            const updateQuery = `UPDATE preferences SET country = ?, start_date = ?, end_date = ?, job_type = ?, restaurant_type = ? WHERE user_id = ?`;
            db.run(updateQuery, [region, startDate, endDate, jobType, restaurantType, userId], function(err) {
                if (err) {
                    console.error('Errore durante l\'aggiornamento delle preferenze:', err);
                    return res.status(500).send('Errore del server');
                }
                res.status(200).send('Preferenze aggiornate con successo');
            });
        } else {
            // Insert new preferences
            const insertQuery = `INSERT INTO preferences (user_id, country, start_date, end_date, job_type, restaurant_type) VALUES (?, ?, ?, ?, ?, ?)`;
            db.run(insertQuery, [userId, region, startDate, endDate, jobType, restaurantType], function(err) {
                if (err) {
                    console.error('Errore durante l\'inserimento delle preferenze:', err);
                    return res.status(500).send('Errore del server');
                }
                res.status(200).send('Preferenze salvate con successo');
            });
        }
    });
});

/**
 * @swagger
 * /api/preferences:
 *   get:
 *     summary: Ottieni tutte le preferenze
 *     description: Restituisce l'elenco completo delle preferenze di tutti gli utenti
 *     tags: [Preferenze]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Elenco di preferenze
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Preference'
 *       401:
 *         description: Utente non autenticato
 *       500:
 *         description: Errore del server
 */
app.get('/api/preferences', requireAuth, (req, res) => {
  const query = `SELECT * FROM preferences`;
  
  db.all(query, [], (err, rows) => {
      if (err) {
          console.error('Errore durante il recupero delle preferenze:', err);
          return res.status(500).json({ error: 'Errore del server' });
      }
      
      res.status(200).json(rows);
  });
});

/**
* @swagger
* /api/preferences/filter:
*   get:
*     summary: Ottieni preferenze filtrate
*     description: Restituisce l'elenco delle preferenze filtrate in base ai parametri specificati
*     tags: [Preferenze]
*     security:
*       - sessionAuth: []
*     parameters:
*       - in: query
*         name: city
*         schema:
*           type: string
*         description: Filtra per città
*     responses:
*       200:
*         description: Elenco di preferenze filtrate
*         content:
*           application/json:
*             schema:
*               type: array
*               items:
*                 $ref: '#/components/schemas/Preference'
*       401:
*         description: Utente non autenticato
*       500:
*         description: Errore del server
*/
app.get('/api/preferences/filter', requireAuth, (req, res) => {
  const city = req.query.city;
  
  // Costruisci la query in base al filtro città
  let query = `
      SELECT p.* 
      FROM preferences p
      JOIN userss u ON p.user_id = u.id
      WHERE u.citta = ?
  `;
  
  db.all(query, [city], (err, rows) => {
      if (err) {
          console.error('Errore durante il recupero delle preferenze filtrate:', err);
          return res.status(500).json({ error: 'Errore del server' });
      }
      
      res.status(200).json(rows);
  });
});

/**
* @swagger
* /ajax:
*   get:
*     summary: Pagina AJAX
*     description: Restituisce la pagina per test AJAX delle preferenze
*     tags: [Pagine]
*     responses:
*       200:
*         description: Pagina AJAX
*         content:
*           text/html:
*             schema:
*               type: string
*/
app.get('/ajax', (req, res) => {
  res.render('ajax', {
      user: req.session.user,
      year: new Date().getFullYear()
  });
});

/**
 * @swagger
 * /profile:
 *   get:
 *     summary: Pagina profilo utente
 *     description: Restituisce la pagina del profilo dell'utente
 *     tags: [Pagine]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Pagina profilo
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *       401:
 *         description: Accesso non autorizzato
 */
app.get('/profile', requireAuth, (req, res) => {
  // Recupera le informazioni dell'utente dal database
  const query = `SELECT * FROM userss WHERE id = ?`;
  db.get(query, [req.session.user.id], (err, user) => {
      if (err) {
          console.error('Errore durante il recupero del profilo:', err);
          return res.status(500).send('Errore del server');
      }
      
      res.render('profile', {
          user: req.session.user,
          userProfile: user,
          year: new Date().getFullYear()
      });
  });
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

server.listen(port, 'localhost', (err) => {
    if (err) {
        console.error('Errore durante l\'avvio del server:', err);
    } else {
        console.log(`Server in esecuzione su http://localhost:${port}`);
        console.log(`Documentazione Swagger disponibile su http://localhost:${port}/api-docs`);
    }
});