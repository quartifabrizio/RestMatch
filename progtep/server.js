require('dotenv').config();
const fetch = require('node-fetch');
const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const serveStatic = require('serve-static');
const http = require('http');
const { Server } = require('socket.io');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const hbs = require('hbs');
const fs = require('fs');

const connectedUsers = new Set();

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
      if (a === b) {
          return options.fn ? options.fn(this) : '';
      } else {
          return options.inverse ? options.inverse(this) : '';
      }
  } else {
      return a === b;
  }
});

// Nuovo helper per verificare se un tipo di lavoro è presente nell'array dei tipi di lavoro selezionati
hbs.registerHelper('isJobTypeSelected', function(preferenceJobTypes, currentJobType) {
    if (!preferenceJobTypes) return false;
    
    if (Array.isArray(preferenceJobTypes)) {
        return preferenceJobTypes.includes(currentJobType);
    }
    
    // Se è una stringa (vecchio formato), lo convertiamo in array
    if (typeof preferenceJobTypes === 'string') {
        const jobArray = preferenceJobTypes.split(',').map(job => job.trim());
        return jobArray.includes(currentJobType);
    }
    
    return false;
});

// Nuovo helper per convertire JSON in stringa
hbs.registerHelper('json', function(context) {
    return JSON.stringify(context);
});

// Swagger definition
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'RestMatch API Documentazione',
      version: '1.0.0',
      description: 'API per la piattaforma RestMatch - Matching tra ristoratori e lavoratori',
      contact: {
        name: 'RestMatch Support',
        url: 'https://restmatch.example.com',
        email: 'support@restmatch.example.com'
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
              description: 'Ruolo dell\'utente',
              enum: ['ristoratore', 'lavoratore', 'admin', 'google']
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
              description: 'Regione selezionata'
            },
            city: {
              type: 'string',
              description: 'Città selezionate (separate da virgole)'
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
              oneOf: [
                { type: 'string', description: 'Tipi di lavoro (separati da virgole)' },
                { 
                  type: 'array', 
                  description: 'Tipi di lavoro come array',
                  items: { type: 'string' }
                }
              ]
            },
            restaurant_type: {
              type: 'string',
              description: 'Tipo di ristorante (opzionale)'
            },
            preference_name: {
              type: 'string',
              description: 'Nome della preferenza'
            }
          }
        },
        JobOffer: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'ID offerta generato automaticamente'
            },
            title: {
              type: 'string',
              description: 'Titolo dell\'offerta'
            },
            role: {
              oneOf: [
                { type: 'string', description: 'Ruoli richiesti (separati da virgole)' },
                { 
                  type: 'array', 
                  description: 'Ruoli richiesti come array',
                  items: { type: 'string' }
                }
              ]
            },
            description: {
              type: 'string',
              description: 'Descrizione dell\'offerta'
            },
            city: {
              type: 'string',
              description: 'Città dell\'offerta'
            },
            region: {
              type: 'string',
              description: 'Regione dell\'offerta'
            },
            restaurant_type: {
              type: 'string',
              description: 'Tipo di ristorante'
            },
            job_type: {
              type: 'string',
              description: 'Tipo di lavoro principale'
            },
            start_date: {
              type: 'string',
              description: 'Data di inizio'
            },
            end_date: {
              type: 'string',
              description: 'Data di fine'
            },
            salary: {
              type: 'string',
              description: 'Stipendio offerto'
            },
            imageUrl: {
              type: 'string',
              description: 'URL dell\'immagine'
            },
            user_id: {
              type: 'integer',
              description: 'ID dell\'utente ristoratore'
            }
          }
        },
        ChatRoom: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'ID chat room generato automaticamente'
            },
            name: {
              type: 'string',
              description: 'Nome della chat room'
            },
            type: {
              type: 'string',
              enum: ['private', 'group'],
              description: 'Tipo di chat room'
            }
          }
        },
        Message: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'ID messaggio generato automaticamente'
            },
            sender_id: {
              type: 'integer',
              description: 'ID mittente'
            },
            recipient_id: {
              type: 'integer',
              description: 'ID destinatario'
            },
            room_id: {
              type: 'integer',
              description: 'ID chat room'
            },
            message: {
              type: 'string',
              description: 'Contenuto del messaggio'
            },
            is_read: {
              type: 'integer',
              description: 'Flag per indicare se il messaggio è stato letto'
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
    },
    tags: [
      {
        name: 'Authentication',
        description: 'Operazioni di autenticazione'
      },
      {
        name: 'Users',
        description: 'Gestione degli utenti'
      },
      {
        name: 'Preferences',
        description: 'Gestione delle preferenze di ricerca'
      },
      {
        name: 'Offers',
        description: 'Gestione delle offerte di lavoro'
      },
      {
        name: 'Chat',
        description: 'Sistema di messaggistica'
      },
      {
        name: 'Utility',
        description: 'Funzioni di utilità'
      }
    ]
  },
  apis: ['./server.js'],
};

// Create HTTP server
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(serveStatic(path.join(__dirname, 'public')));

// Configure sessions
app.use(
  session({
      secret: 'ilTuoSegretoSuperSegreto123',
      resave: false,
      saveUninitialized: false,
      cookie: {
          secure: false,
          maxAge: 7 * 24 * 60 * 60 * 1000
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

// Connect to the main database
const db = new sqlite3.Database('database.db', (err) => {
    if (err) {
        console.error('Errore durante la connessione al database principale:', err);
    } else {
        console.log('Connesso al database SQLite principale.');

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
              
              // Insert admin user if not exists
              const checkAdminQuery = `SELECT * FROM userss WHERE email = 'admin@admin.it'`;
              db.get(checkAdminQuery, [], (err, row) => {
                  if (err) {
                      console.error('Errore durante il controllo dell\'admin:', err);
                  } else if (!row) {
                      // Insert admin user
                      const insertAdminQuery = `INSERT INTO userss (email, telefono, data_nascita, citta, ruolo, password) 
                                              VALUES ('admin@admin.it', '123456789', '1990-01-01', 'Admin City', 'admin', 'admin123')`;
                      db.run(insertAdminQuery, [], (err) => {
                          if (err) {
                              console.error('Errore durante l\'inserimento dell\'admin:', err);
                          } else {
                              console.log('Utente admin creato con successo');
                          }
                      });
                  }
              });
          }
      );
        
        // Create chat messages table
        db.run(
          `CREATE TABLE IF NOT EXISTS chat_messages (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              sender_id INTEGER NOT NULL,
              recipient_id INTEGER,
              room_id TEXT,
              message TEXT NOT NULL,
              timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
              is_read INTEGER DEFAULT 0,
              FOREIGN KEY (sender_id) REFERENCES userss(id)
          )`, (err) => {
              if (err) console.error('Errore durante la creazione della tabella chat_messages:', err);
          }
        );
        
        // Create chat rooms table
        db.run(
          `CREATE TABLE IF NOT EXISTS chat_rooms (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              type TEXT NOT NULL,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )`, (err) => {
              if (err) console.error('Errore durante la creazione della tabella chat_rooms:', err);
          }
        );
        
        // Create room participants table
        db.run(
          `CREATE TABLE IF NOT EXISTS room_participants (
              room_id INTEGER NOT NULL,
              user_id INTEGER NOT NULL,
              joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (room_id, user_id),
              FOREIGN KEY (room_id) REFERENCES chat_rooms(id),
              FOREIGN KEY (user_id) REFERENCES userss(id)
          )`, (err) => {
              if (err) console.error('Errore durante la creazione della tabella room_participants:', err);
          }
        );
        
        // Create offers table - MODIFICATA per supportare array di ruoli
        db.run(
            `CREATE TABLE IF NOT EXISTS offerte (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                role TEXT NOT NULL,
                description TEXT NOT NULL,
                city TEXT NOT NULL,
                region TEXT NOT NULL,
                restaurant_type TEXT,
                job_type TEXT NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                salary TEXT,
                imageUrl TEXT,
                user_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES userss(id)
            )`, (err) => {
                if (err) console.error('Errore durante la creazione della tabella offerte:', err);
                else {
                    console.log('Tabella offerte creata con successo');
                    // Fetch initial job offers from external API and populate database
                    fetchAndStoreJobOffers();
                }
            }
        );
    }
});

// Connect to the session database for preferences
const sessionDb = new sqlite3.Database('session.db', (err) => {
    if (err) {
        console.error('Errore durante la connessione al database delle sessioni:', err);
    } else {
        console.log('Connesso al database SQLite delle sessioni.');
        
        // Create preferences table in session.db
        sessionDb.run(
            `CREATE TABLE IF NOT EXISTS preferences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                country TEXT NOT NULL,
                city TEXT NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                job_type TEXT NOT NULL,
                restaurant_type TEXT,
                preference_name TEXT DEFAULT 'Default'
            )`, (err) => {
                if (err) {
                    console.error('Errore durante la creazione della tabella preferenze:', err);
                } else {
                    console.log('Tabella preferenze creata con successo nel database delle sessioni');
                }
            }
        );
    }
});

// Configurazione per il login tramite Google
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_SECRET,
    callbackURL: 'https://super-duper-capybara-9px67vxggjj2x96g-3000.app.github.dev/auth/google/callback'
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
 *     summary: Inizia autenticazione con Google
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Redirect a Google per autenticazione
 */
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

/**
 * @swagger
 * /auth/google/callback:
 *   get:
 *     summary: Callback dopo autenticazione Google
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Codice di autenticazione Google
 *     responses:
 *       302:
 *         description: Redirect a dashboard
 *       401:
 *         description: Autenticazione fallita
 */
app.get('/auth/google/callback', passport.authenticate('google', {
    failureRedirect: '/login'
}), (req, res) => {
    req.session.user = {
        id: req.user.id,
        email: req.user.email,
        ruolo: req.user.ruolo || 'google',
    };
    res.redirect('/dashboard');
});

/**
 * @swagger
 * /ajax:
 *   get:
 *     summary: Pagina di esplorazione utenti
 *     tags: [Users]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Pagina HTML
 *       302:
 *         description: Redirect alla pagina di login se non autenticato
 */
app.get('/ajax', requireAuth, (req, res) => {
    res.render('ajax', {
        user: req.session.user,
        year: new Date().getFullYear()
    });
});

/**
 * @swagger
 * /api/preferences:
 *   get:
 *     summary: Ottiene le preferenze dell'utente
 *     tags: [Preferences]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Lista delle preferenze
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Preference'
 *       500:
 *         description: Errore del server
 */
app.get('/api/preferences', requireAuth, (req, res) => {
    const query = `
        SELECT 
            id, 
            user_id, 
            country, 
            city, 
            start_date, 
            end_date, 
            job_type, 
            restaurant_type, 
            preference_name
        FROM preferences 
        WHERE user_id = ?
    `;
    sessionDb.all(query, [req.session.user.id], (err, rows) => {
        if (err) {
            console.error('Errore nel recupero delle preferenze:', err);
            return res.status(500).json({ error: 'Errore del server' });
        }
        
        // Converti job_type da string a array per ogni preferenza
        const preferences = rows.map(pref => {
            return {
                ...pref,
                job_type: pref.job_type ? pref.job_type.split(',').map(job => job.trim()) : []
            };
        });
        
        res.json(preferences);
    });
});

/**
 * @swagger
 * /api/preferences/filter:
 *   get:
 *     summary: Ottiene le preferenze filtrate per città
 *     tags: [Preferences]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: city
 *         required: true
 *         schema:
 *           type: string
 *         description: Città da filtrare
 *     responses:
 *       200:
 *         description: Lista delle preferenze filtrate
 *       400:
 *         description: Parametro city mancante
 *       500:
 *         description: Errore del server
 */
app.get('/api/preferences/filter', requireAuth, (req, res) => {
    const { city } = req.query;
    if (!city) {
        return res.status(400).json({ error: 'Parametro city mancante' });
    }

    const query = `
        SELECT 
            id, 
            user_id, 
            country, 
            city, 
            start_date, 
            end_date, 
            job_type, 
            restaurant_type, 
            preference_name
        FROM preferences 
        WHERE user_id = ?
    `;
    
    sessionDb.all(query, [req.session.user.id], (err, rows) => {
        if (err) {
            console.error('Errore nel recupero delle preferenze filtrate:', err);
            return res.status(500).json({ error: 'Errore del server' });
        }
        
        // Filtra manualmente per supportare il confronto con città multiple
        const filteredPrefs = rows.filter(pref => {
            const prefCities = pref.city.toLowerCase().split(',').map(c => c.trim());
            return prefCities.includes(city.toLowerCase());
        });
        
        // Converti job_type da string a array per ogni preferenza
        const preferences = filteredPrefs.map(pref => {
            return {
                ...pref,
                job_type: pref.job_type ? pref.job_type.split(',').map(job => job.trim()) : []
            };
        });
        
        res.json(preferences);
    });
});

// Sample job types and restaurant types for random generation
const restaurantTypes = ['Trattoria', 'Ristorante Cinese', 'Ristorante Italiano', 'Sushi', 'Fast Food', 'Pizzeria'];
const jobTypes = ['Chef', 'Cameriere', 'Barista', 'Lavapiatti', 'Responsabile Sala', 'Aiuto Cuoco'];

// Sample cities for random generation (no longer tied to specific regions)
const sampleCities = [
    'Roma', 'Milano', 'Napoli', 'Torino', 'Palermo', 'Genova', 'Bologna', 
    'Firenze', 'Bari', 'Catania', 'Venezia', 'Verona', 'Messina', 'Padova', 
    'Trieste', 'Brescia', 'Parma', 'Taranto', 'Prato', 'Modena', 'Reggio Calabria', 
    'Reggio Emilia', 'Perugia', 'Livorno', 'Ravenna', 'Cagliari', 'Foggia'
];

// Sample regions for random generation
const sampleRegions = [
    'Abruzzo', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna', 
    'Friuli-Venezia Giulia', 'Lazio', 'Liguria', 'Lombardia', 'Marche', 
    'Molise', 'Piemonte', 'Puglia', 'Sardegna', 'Sicilia', 'Toscana', 
    'Trentino-Alto Adige', 'Umbria', 'Valle d\'Aosta', 'Veneto'
];

// Mappa città-regione per riferimento
const cityToRegionMap = {
    'Roma': 'Lazio',
    'Milano': 'Lombardia',
    'Napoli': 'Campania',
    'Torino': 'Piemonte',
    'Palermo': 'Sicilia',
    'Genova': 'Liguria',
    'Bologna': 'Emilia-Romagna',
    'Firenze': 'Toscana',
    'Bari': 'Puglia',
    'Catania': 'Sicilia',
    'Venezia': 'Veneto',
    'Verona': 'Veneto',
    'Messina': 'Sicilia',
    'Padova': 'Veneto',
    'Trieste': 'Friuli-Venezia Giulia',
    'Brescia': 'Lombardia',
    'Parma': 'Emilia-Romagna',
    'Taranto': 'Puglia',
    'Prato': 'Toscana',
    'Modena': 'Emilia-Romagna',
    'Reggio Calabria': 'Calabria',
    'Reggio Emilia': 'Emilia-Romagna',
    'Perugia': 'Umbria',
    'Livorno': 'Toscana',
    'Ravenna': 'Emilia-Romagna',
    'Cagliari': 'Sardegna',
    'Foggia': 'Puglia'
};

// Improved function to fetch and store job offers
function fetchAndStoreJobOffers() {
    fetch('https://remotive.com/api/remote-jobs?category=restaurants')
        .then(response => response.json())
        .then(data => {
            if (data && data.jobs && data.jobs.length > 0) {
                const jobsToInsert = data.jobs.slice(0, 40);
                
                // Remove existing offers not created by users
                db.run('DELETE FROM offerte WHERE user_id IS NULL', [], (err) => {
                    if (err) {
                        console.error('Errore durante la pulizia delle offerte esistenti:', err);
                        return;
                    }
                    
                    // Get list of restaurant users to assign to offers
                    db.all('SELECT id, email AS nome FROM userss WHERE ruolo = "ristoratore"', [], (err, restaurantUsers) => {
                        if (err) {
                            console.error('Errore durante il recupero degli utenti ristoratori:', err);
                            return;
                        }
                        
                        if (restaurantUsers.length === 0) {
                            console.error('Nessun ristoratore trovato nel database');
                            // Insert a default restaurateur if none exist
                            db.run(`INSERT INTO userss (email, telefono, data_nascita, citta, ruolo, password) 
                                   VALUES ('ristoratore@example.com', '123456789', '1980-01-01', 'Milano', 'ristoratore', 'password123')`, 
                                   function(err) {
                                if (err) {
                                    console.error('Errore durante la creazione del ristoratore di default:', err);
                                    return;
                                }
                                const restaurantUsers = [{ id: this.lastID, nome: 'ristoratore@example.com' }];
                                insertJobOffers(jobsToInsert, restaurantUsers);
                            });
                        } else {
                            insertJobOffers(jobsToInsert, restaurantUsers);
                        }
                    });
                });
            }
        })
        .catch(error => {
            console.error('Errore durante il recupero delle offerte di lavoro:', error);
        });
}

function insertJobOffers(jobsToInsert, restaurantUsers) {
    const insertStmt = db.prepare('INSERT INTO offerte (title, role, description, city, region, restaurant_type, job_type, start_date, end_date, salary, imageUrl, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    
    jobsToInsert.forEach((job, index) => {
        // Assign a random restaurant user to each offer
        const randomUserIndex = Math.floor(Math.random() * restaurantUsers.length);
        const restaurantUser = restaurantUsers[randomUserIndex];
        
        // Get random city and region (now independent from each other)
        const randomCity = sampleCities[Math.floor(Math.random() * sampleCities.length)];
        
        // Ottieni la regione corrispondente dalla mappa città-regione
        const randomRegion = cityToRegionMap[randomCity] || sampleRegions[Math.floor(Math.random() * sampleRegions.length)];
        
        // Genera da 1 a 3 ruoli casuali
        const numRoles = Math.floor(Math.random() * 2) + 1;  // 1 o 2 ruoli
        const roleIndices = new Set();
        while(roleIndices.size < numRoles) {
            roleIndices.add(Math.floor(Math.random() * jobTypes.length));
        }
        const selectedRoles = Array.from(roleIndices).map(idx => jobTypes[idx]);
        const roleString = selectedRoles.join(',');
        
        // Restaurant type può essere nullo o vuoto in alcuni casi (30% di probabilità)
        const includeRestaurantType = Math.random() > 0.3;
        const randomRestaurantType = includeRestaurantType ? restaurantTypes[Math.floor(Math.random() * restaurantTypes.length)] : '';
        
        // Usa il primo ruolo come job_type principale
        const randomJobType = selectedRoles[0];
        
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(today.getDate() + Math.floor(Math.random() * 30) + 1);
        
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + Math.floor(Math.random() * 90) + 30);
        
        const formattedStartDate = startDate.toISOString().split('T')[0];
        const formattedEndDate = endDate.toISOString().split('T')[0];
        
        // Immagine standard per tutte le offerte
        const imageUrl = "https://via.placeholder.com/400x200?text=Offerta+Lavoro";
        
        // Descrizioni migliorate
        const descriptions = [
            `Cercasi ${roleString} con esperienza per ristorante in zona ${randomCity}. Offriamo ambiente di lavoro dinamico e opportunità di crescita professionale.`,
            `${randomCity}: ${roleString} richiesto/i per ${randomRestaurantType || 'ristorante'}. Requisiti: esperienza pregressa, flessibilità e passione per la ristorazione.`,
            `Opportunità per ${roleString} in ${randomCity}. Disponibilità nei weekend e turni serali. Retribuzione competitiva.`,
            `${randomRestaurantType || 'Ristorante'} in ${randomCity} cerca ${roleString} per completare il proprio staff. Contratto a tempo determinato con possibilità di rinnovo.`,
            `Posizione aperta per ${roleString} a ${randomCity}, ${randomRegion}. Si offre formazione continua e ambiente di lavoro stimolante.`
        ];
        
        const description = descriptions[Math.floor(Math.random() * descriptions.length)];
        
        // Use restaurant name as part of the title
        const titles = [
            `${restaurantUser.nome}: Cercasi ${roleString}`,
            `Posizione aperta: ${roleString} a ${randomCity}`,
            `${randomRestaurantType || 'Ristorante'} assume ${roleString}`,
            `Lavoro nel settore ristorazione: ${roleString}`,
            `Offerta per ${roleString} in ${randomCity}`
        ];
        
        const title = titles[Math.floor(Math.random() * titles.length)];
        
        insertStmt.run(
            title,
            roleString,  // Salviamo i ruoli come stringa separata da virgole
            description,
            randomCity,
            randomRegion,
            randomRestaurantType,
            randomJobType,
            formattedStartDate,
            formattedEndDate,
            `${1200 + Math.floor(Math.random() * 1800)}€/mese`,
            imageUrl,
            restaurantUser.id
        );
    });
    
    insertStmt.finalize();
    console.log('Offerte di lavoro importate con successo');
}

// Schedule a daily update of job offers
setInterval(fetchAndStoreJobOffers, 24 * 60 * 60 * 1000);

/**
 * @swagger
 * /create-offer:
 *   post:
 *     summary: Crea una nuova offerta di lavoro
 *     tags: [Offers]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - role
 *               - description
 *               - city
 *               - region
 *               - start_date
 *               - end_date
 *             properties:
 *               title:
 *                 type: string
 *               role:
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *                     items:
 *                       type: string
 *               description:
 *                 type: string
 *               city:
 *                 type: string
 *               region:
 *                 type: string
 *               restaurant_type:
 *                 type: string
 *               job_type:
 *                 type: string
 *               start_date:
 *                 type: string
 *                 format: date
 *               end_date:
 *                 type: string
 *                 format: date
 *               salary:
 *                 type: string
 *     responses:
 *       200:
 *         description: Offerta creata con successo
 *       400:
 *         description: Dati mancanti o non validi
 *       403:
 *         description: Solo i ristoratori possono creare offerte
 *       500:
 *         description: Errore del server
 */
app.post('/create-offer', requireAuth, (req, res) => {
    // Check if user is a restaurant
    if (req.session.user.ruolo !== 'ristoratore') {
        return res.status(403).json({ success: false, message: 'Solo i ristoratori possono creare offerte di lavoro' });
    }
    
    // Estrai i dati dal form
    const { title, role, description, city, region, restaurant_type, job_type, start_date, end_date, salary } = req.body;
    
    // Gestisci role come array o stringa
    let roleString;
    if (Array.isArray(role)) {
        roleString = role.join(',');
    } else {
        roleString = role;
    }
    
    // Basic validation
    if (!title || !roleString || !description || !city || !region || !start_date || !end_date) {
        return res.status(400).json({ success: false, message: 'Mancano campi obbligatori' });
    }
    
    // Generate immagine standard
    const imageUrl = "https://via.placeholder.com/400x200?text=Offerta+Lavoro";
    
    // Insert the job offer into the database
    const query = `
        INSERT INTO offerte 
        (title, role, description, city, region, restaurant_type, job_type, start_date, end_date, salary, imageUrl, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    // Usa il primo ruolo come job_type principale se è un array
    const primaryJobType = Array.isArray(role) && role.length > 0 ? role[0] : (roleString || '');
    
    db.run(query, [
        title, 
        roleString, 
        description, 
        city, 
        region, 
        restaurant_type || "", // Opzionale 
        primaryJobType,
        start_date, 
        end_date, 
        salary || `${1200 + Math.floor(Math.random() * 1800)}€/mese`, 
        imageUrl, 
        req.session.user.id
    ], function(err) {
        if (err) {
            console.error('Errore durante la creazione dell\'offerta:', err);
            return res.status(500).json({ success: false, message: 'Errore del server' });
        }
        
        res.status(200).json({ success: true, message: 'Offerta creata con successo', id: this.lastID });
    });
});

/**
 * @swagger
 * /api/contact-restaurateur:
 *   post:
 *     summary: Contatta un ristoratore per un'offerta di lavoro
 *     tags: [Chat]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - offerId
 *             properties:
 *               offerId:
 *                 type: integer
 *                 description: ID dell'offerta di lavoro
 *     responses:
 *       200:
 *         description: Chat room creata con successo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 roomId:
 *                   type: integer
 *       400:
 *         description: ID offerta mancante
 *       404:
 *         description: Offerta non trovata
 *       500:
 *         description: Errore del server
 */
app.post('/api/contact-restaurateur', requireAuth, (req, res) => {
    const userId = req.session.user.id;
    const { offerId } = req.body;
    
    if (!offerId) {
        return res.status(400).json({ success: false, error: 'ID offerta mancante' });
    }
    
    // Get the offer details to find the restaurant owner
    db.get('SELECT user_id FROM offerte WHERE id = ?', [offerId], (err, offer) => {
        if (err) {
            console.error('Errore durante il recupero dell\'offerta:', err);
            return res.status(500).json({ success: false, error: 'Errore del server' });
        }
        
        if (!offer) {
            return res.status(404).json({ success: false, error: 'Offerta non trovata' });
        }
        
        const restaurateurId = offer.user_id;
        
        // Check if a chat room already exists between these users
        db.get(
            `SELECT cr.id
            FROM chat_rooms cr
            JOIN room_participants rp1 ON cr.id = rp1.room_id
            JOIN room_participants rp2 ON cr.id = rp2.room_id
            WHERE cr.type = 'private'
            AND rp1.user_id = ?
            AND rp2.user_id = ?`,
            [userId, restaurateurId],
            (err, room) => {
                if (err) {
                    console.error('Errore durante la ricerca della chat room:', err);
                    return res.status(500).json({ success: false, error: 'Errore del server' });
                }
                
                if (room) {
                    // Chat room already exists, redirect to it
                    return res.json({ success: true, roomId: room.id });
                }
                
                // Create a new chat room between the user and restaurateur
                db.run(
                    'INSERT INTO chat_rooms (name, type) VALUES (?, ?)',
                    ['Private Chat', 'private'],
                    function(err) {
                        if (err) {
                            console.error('Errore durante la creazione della chat room:', err);
                            return res.status(500).json({ success: false, error: 'Errore del server' });
                        }
                        
                        const roomId = this.lastID;
                        
                        // Add both users as participants
                        const stmt = db.prepare('INSERT INTO room_participants (room_id, user_id) VALUES (?, ?)');
                        stmt.run(roomId, userId);
                        stmt.run(roomId, restaurateurId);
                        stmt.finalize();
                        
                        // Create initial message about the job offer
                        db.get('SELECT title FROM offerte WHERE id = ?', [offerId], (err, offer) => {
                            if (!err && offer) {
                                db.run(
                                    'INSERT INTO chat_messages (sender_id, room_id, message) VALUES (?, ?, ?)',
                                    [userId, roomId, `Ciao, sono interessato all'offerta di lavoro: "${offer.title}"`]
                                );
                            }
                            
                            res.json({ success: true, roomId: roomId });
                        });
                    }
                );
            }
        );
    });
});

/**
 * @swagger
 * /api/public-profiles:
 *   get:
 *     summary: Ottiene i profili pubblici degli utenti
 *     tags: [Users]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filtra per città
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: Filtra per ruolo
 *     responses:
 *       200:
 *         description: Lista dei profili pubblici
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   email:
 *                     type: string
 *                   citta:
 *                     type: string
 *                   ruolo:
 *                     type: string
 *       500:
 *         description: Errore del server
 */
app.get('/api/public-profiles', requireAuth, (req, res) => {
    const { city, role } = req.query;
    
    // Start building the query with only public information
    let query = `
        SELECT 
            id, 
            email, 
            citta, 
            ruolo
        FROM userss 
        WHERE 1=1
    `;
    
    // Add parameters to the array
    const params = [];
    
    // Add filters if provided
    if (city) {
        query += ` AND citta = ?`;
        params.push(city);
    }
    
    if (role) {
        query += ` AND ruolo = ?`;
        params.push(role);
    }
    
    query += ` ORDER BY id DESC`;
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Errore nel recupero dei profili pubblici:', err);
            return res.status(500).json({ error: 'Errore del server' });
        }
        
        res.json(rows);
    });
});

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Ottiene tutti gli utenti (solo admin)
 *     tags: [Users]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Lista di tutti gli utenti
 *       403:
 *         description: Non autorizzato, richiede privilegi di admin
 *       500:
 *         description: Errore del server
 */
app.get('/api/users', requireAuth, (req, res) => {
    // Only allow admin or self
    if (req.session.user.ruolo !== 'admin' && !req.session.user.email.endsWith('@admin.it')) {
        return res.status(403).json({ error: 'Non hai i permessi per accedere a questa risorsa' });
    }
    
    const query = `
        SELECT 
            id, 
            email, 
            telefono, 
            data_nascita, 
            citta, 
            ruolo
        FROM userss 
        ORDER BY id DESC
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Errore nel recupero degli utenti:', err);
            return res.status(500).json({ error: 'Errore del server' });
        }
        res.json(rows);
    });
});

/**
 * @swagger
 * /api/users/filter:
 *   get:
 *     summary: Ottiene utenti filtrati per città (solo admin)
 *     tags: [Users]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: city
 *         required: true
 *         schema:
 *           type: string
 *         description: Città da filtrare
 *     responses:
 *       200:
 *         description: Lista degli utenti filtrati
 *       400:
 *         description: Parametro city mancante
 *       403:
 *         description: Non autorizzato, richiede privilegi di admin
 *       500:
 *         description: Errore del server
 */
app.get('/api/users/filter', requireAuth, (req, res) => {
    // Only allow admin or self
    if (req.session.user.ruolo !== 'admin' && !req.session.user.email.endsWith('@admin.it')) {
        return res.status(403).json({ error: 'Non hai i permessi per accedere a questa risorsa' });
    }
    
    const { city } = req.query;
    if (!city) {
        return res.status(400).json({ error: 'Parametro city mancante' });
    }

    const query = `
        SELECT 
            id, 
            email, 
            telefono, 
            data_nascita, 
            citta, 
            ruolo
        FROM userss 
        WHERE citta = ?
        ORDER BY id DESC
    `;
    
    db.all(query, [city], (err, rows) => {
        if (err) {
            console.error('Errore nel recupero degli utenti filtrati:', err);
            return res.status(500).json({ error: 'Errore del server' });
        }
        res.json(rows);
    });
});

/**
 * @swagger
 * /save-preferences:
 *   post:
 *     summary: Salva le preferenze dell'utente
 *     tags: [Preferences]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - city
 *               - startDate
 *               - endDate
 *               - jobType
 *             properties:
 *               region:
 *                 type: string
 *               city:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               jobType:
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *                     items:
 *                       type: string
 *               restaurantType:
 *                 type: string
 *               preferenceName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Preferenze salvate con successo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 offers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/JobOffer'
 *       400:
 *         description: Dati mancanti o non validi
 *       500:
 *         description: Errore del server
 */
app.post('/save-preferences', requireAuth, (req, res) => {
    // Estrai i parametri dalla request
    let { region, city, startDate, endDate, jobType, restaurantType, preferenceName } = req.body;
    
    // Converti jobType in stringa separata da virgole se è un array
    if (Array.isArray(jobType)) {
        jobType = jobType.join(',');
    }
    
    // Basic validation
    if (!city || !startDate || !endDate || !jobType) {
        return res.status(400).json({ success: false, message: 'I campi città, data inizio, data fine e tipo lavoro sono obbligatori' });
    }
    
    // Check if preference with this name already exists for this user
    const checkExistingPreference = `
        SELECT id FROM preferences 
        WHERE user_id = ? AND preference_name = ?
    `;
    
    sessionDb.get(checkExistingPreference, [req.session.user.id, preferenceName || 'Default'], (err, existing) => {
        if (err) {
            console.error('Errore durante il controllo delle preferenze esistenti:', err);
            return res.status(500).json({ success: false, message: 'Errore del server' });
        }
        
        let query, params;
        
        if (existing) {
            // Update existing preference
            query = `
                UPDATE preferences 
                SET country = ?, city = ?, start_date = ?, end_date = ?, job_type = ?, restaurant_type = ?
                WHERE id = ?
            `;
            params = [region || '', city, startDate, endDate, jobType, restaurantType || '', existing.id];
        } else {
            // Insert new preference
            query = `
                INSERT INTO preferences 
                (user_id, country, city, start_date, end_date, job_type, restaurant_type, preference_name)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
            params = [req.session.user.id, region || '', city, startDate, endDate, jobType, restaurantType || '', preferenceName || 'Default'];
        }
        
        sessionDb.run(query, params, function(err) {
            if (err) {
                console.error('Errore durante il salvataggio delle preferenze:', err);
                return res.status(500).json({ success: false, message: 'Errore del server durante il salvataggio' });
            }
            
            // Converti jobType da string a array per il filtraggio
            const jobTypeArray = jobType.split(',').map(job => job.trim());
            
            // Converti city da string a array per il filtraggio
            const cityArray = city.split(',').map(c => c.trim());
            
            // Fetch filtered job offers based on the saved preferences
            const getFilteredOffers = `
                SELECT o.*, u.email as restaurant_name
                FROM offerte o
                LEFT JOIN userss u ON o.user_id = u.id
                WHERE o.start_date >= ?
                AND o.end_date <= ?
                ORDER BY o.created_at DESC
            `;
            
            db.all(getFilteredOffers, [startDate, endDate], (err, allOffers) => {
                if (err) {
                    console.error('Errore durante il recupero delle offerte filtrate:', err);
                    return res.status(500).json({ success: false, message: 'Errore del server' });
                }
                
                // Filtra manualmente per supportare array di job types e città
                let filteredOffers = allOffers.filter(offer => {
                    // Verifica se la città dell'offerta è tra quelle preferite
                    const isCityMatch = cityArray.some(c => 
                        offer.city.toLowerCase() === c.toLowerCase()
                    );
                    
                    if (!isCityMatch) return false;
                    
                    // Verifica se almeno uno dei ruoli dell'offerta è tra quelli preferiti
                    const offerRoles = offer.role.split(',').map(r => r.trim());
                    const isRoleMatch = offerRoles.some(r => 
                        jobTypeArray.includes(r)
                    );
                    
                    if (!isRoleMatch) return false;
                    
                    // Se il tipo di ristorante è specificato, filtra anche per quello
                    if (restaurantType && restaurantType !== "") {
                        return offer.restaurant_type === restaurantType;
                    }
                    
                    return true;
                });
                
                // Converti role string in array per ogni offerta trovata
                filteredOffers = filteredOffers.map(offer => {
                    return {
                        ...offer,
                        role: offer.role.split(',').map(r => r.trim())
                    };
                });
                
                return res.status(200).json({ 
                    success: true, 
                    message: 'Preferenze salvate con successo', 
                    offers: filteredOffers 
                });
            });
        });
    });
});

/**
 * @swagger
 * /api/get-filtered-offers/{preferenceId}:
 *   get:
 *     summary: Ottiene le offerte filtrate in base a una preferenza
 *     tags: [Offers]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: preferenceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID della preferenza
 *     responses:
 *       200:
 *         description: Offerte filtrate in base alla preferenza
 *       404:
 *         description: Preferenza non trovata
 *       500:
 *         description: Errore del server
 */
app.get('/api/get-filtered-offers/:preferenceId', requireAuth, (req, res) => {
    const preferenceId = req.params.preferenceId;
    
    // First, get the preference details
    const getPreference = `
        SELECT id, user_id, country, city, start_date, end_date, job_type, restaurant_type, preference_name 
        FROM preferences 
        WHERE id = ? AND user_id = ?`;
    
    sessionDb.get(getPreference, [preferenceId, req.session.user.id], (err, preference) => {
        if (err) {
            console.error('Errore durante il recupero della preferenza:', err);
            return res.status(500).json({ success: false, message: 'Errore del server' });
        }
        
        if (!preference) {
            return res.status(404).json({ success: false, message: 'Preferenza non trovata' });
        }
        
        // Converti job_type da string a array
        const jobTypeArray = preference.job_type ? preference.job_type.split(',').map(job => job.trim()) : [];
        
        // Converti city da string a array
        const cityArray = preference.city ? preference.city.split(',').map(c => c.trim()) : [];
        
        // Get all offers within date range
        const getOffersInDateRange = `
            SELECT o.*, u.email as restaurant_name
            FROM offerte o
            LEFT JOIN userss u ON o.user_id = u.id
            WHERE o.start_date >= ?
            AND o.end_date <= ?
            ORDER BY o.created_at DESC
        `;
        
        db.all(getOffersInDateRange, [
            preference.start_date, 
            preference.end_date
        ], (err, allOffers) => {
            if (err) {
                console.error('Errore durante il recupero delle offerte in range di date:', err);
                return res.status(500).json({ success: false, message: 'Errore del server' });
            }
            
            // Filtra manualmente per supportare array di job types e città
            let filteredOffers = allOffers.filter(offer => {
                // Verifica se la città dell'offerta è tra quelle preferite
                const isCityMatch = cityArray.some(c => 
                    offer.city.toLowerCase() === c.toLowerCase()
                );
                
                if (!isCityMatch) return false;
                
                // Verifica se almeno uno dei ruoli dell'offerta è tra quelli preferiti
                const offerRoles = offer.role.split(',').map(r => r.trim());
                const isRoleMatch = offerRoles.some(r => 
                    jobTypeArray.includes(r)
                );
                
                if (!isRoleMatch) return false;
                
                // Se il tipo di ristorante è specificato, filtra anche per quello
                if (preference.restaurant_type && preference.restaurant_type !== "") {
                    return offer.restaurant_type === preference.restaurant_type;
                }
                
                return true;
            });
            
            // Converti role string in array per ogni offerta trovata
            filteredOffers = filteredOffers.map(offer => {
                return {
                    ...offer,
                    role: offer.role.split(',').map(r => r.trim())
                };
            });
            
            // Aggiorna la preferenza con array di job types 
            preference.job_type = jobTypeArray;
            
            return res.status(200).json({ 
                success: true, 
                offers: filteredOffers,
                preference: preference
            });
        });
    });
});

/**
 * @swagger
 * /api/cities:
 *   get:
 *     summary: Ottiene tutte le città disponibili
 *     tags: [Utility]
 *     responses:
 *       200:
 *         description: Lista delle città
 *       500:
 *         description: Errore del server
 */
app.get('/api/cities', (req, res) => {
    db.all('SELECT DISTINCT city FROM offerte ORDER BY city', [], (err, rows) => {
        if (err) {
            console.error('Errore durante il recupero delle città:', err);
            return res.status(500).json({ error: 'Errore del server' });
        }
        const cities = rows.map(row => row.city);
        res.json(cities);
    });
});

/**
 * @swagger
 * /api/regions:
 *   get:
 *     summary: Ottiene tutte le regioni disponibili
 *     tags: [Utility]
 *     responses:
 *       200:
 *         description: Lista delle regioni
 *       500:
 *         description: Errore del server
 */
app.get('/api/regions', (req, res) => {
    db.all('SELECT DISTINCT region FROM offerte ORDER BY region', [], (err, rows) => {
        if (err) {
            console.error('Errore durante il recupero delle regioni:', err);
            return res.status(500).json({ error: 'Errore del server' });
        }
        const regions = rows.map(row => row.region);
        res.json(regions);
    });
});

/**
 * @swagger
 * /dashboard:
 *   get:
 *     summary: Pagina dashboard con offerte di lavoro
 *     tags: [Utility]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Pagina HTML della dashboard
 *       302:
 *         description: Redirect alla pagina di login se non autenticato
 */
app.get('/dashboard', requireAuth, (req, res) => {
    // First, fetch all user preferences from session.db
    const getUserPreferences = `SELECT * FROM preferences WHERE user_id = ?`;
    
    // Then fetch all job offers initially (without filtering)
    const getAllOffers = `
        SELECT o.*, u.email as restaurant_name
        FROM offerte o
        LEFT JOIN userss u ON o.user_id = u.id
        ORDER BY o.created_at DESC
        LIMIT 50
    `;
    
    sessionDb.all(getUserPreferences, [req.session.user.id], (err, preferences) => {
        if (err) {
            console.error('Errore durante il recupero delle preferenze:', err);
            return res.status(500).send('Errore del server');
        }
        
        // Converti job_type da string a array per ogni preferenza
        const preferencesWithArrays = preferences.map(pref => {
            return {
                ...pref,
                job_type: pref.job_type ? pref.job_type.split(',').map(job => job.trim()) : []
            };
        });
        
        // Get all offers by default when first loading the dashboard
        db.all(getAllOffers, [], (err, allJobs) => {
            if (err) {
                console.error('Errore durante il recupero delle offerte:', err);
                return res.status(500).send('Errore del server');
            }
            
            // Converti role string in array per ogni offerta
            const jobs = allJobs.map(job => {
                return {
                    ...job,
                    role: job.role.split(',').map(r => r.trim())
                };
            });
            
            // Get distinct job types for filters
            db.all('SELECT DISTINCT job_type FROM offerte ORDER BY job_type', [], (err, jobTypeRows) => {
                if (err) {
                    console.error('Errore durante il recupero dei tipi di lavoro:', err);
                    return res.status(500).send('Errore del server');
                }
                
                // Get distinct restaurant types for filters
                db.all('SELECT DISTINCT restaurant_type FROM offerte WHERE restaurant_type != "" ORDER BY restaurant_type', [], (err, restaurantTypeRows) => {
                    if (err) {
                        console.error('Errore durante il recupero dei tipi di ristorante:', err);
                        return res.status(500).send('Errore del server');
                    }
                    
                    const jobTypes = jobTypeRows.map(row => row.job_type);
                    const restaurantTypes = restaurantTypeRows.map(row => row.restaurant_type);
                    
                    res.render('dashboard', {
                        user: req.session.user,
                        preferences: preferencesWithArrays.length > 0 ? preferencesWithArrays[0] : {},
                        allPreferences: preferencesWithArrays,
                        jobs: jobs,
                        jobTypes: jobTypes,
                        restaurantTypes: restaurantTypes
                    });
                });
            });
        });
    });
});

/**
 * @swagger
 * /images/{filename}:
 *   get:
 *     summary: Serve static image files
 *     tags: [Utility]
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: Nome del file immagine
 *     responses:
 *       200:
 *         description: File immagine
 *         content:
 *           image/*:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: File non trovato
 */
app.use('/images', express.static(path.join(__dirname, 'public/images')));

/**
 * @swagger
 * /profile:
 *   get:
 *     summary: Pagina profilo utente
 *     tags: [Users]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Pagina HTML del profilo
 *       302:
 *         description: Redirect alla pagina di login se non autenticato
 *       500:
 *         description: Errore del server
 */
app.get('/profile', requireAuth, (req, res) => {
    const query = `SELECT * FROM userss WHERE id = ?`;
    db.get(query, [req.session.user.id], (err, user) => {
        if (err) {
            console.error('Errore durante il recupero del profilo:', err);
            return res.status(500).send('Errore del server');
        }
        
        if (!user) {
            return res.redirect('/logout');
        }
        
        res.render('profile', {
            user: user,
            year: new Date().getFullYear()
        });
    });
});

/**
 * @swagger
 * /chat:
 *   get:
 *     summary: Pagina principale chat
 *     tags: [Chat]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Pagina HTML della chat
 *       302:
 *         description: Redirect alla pagina di login se non autenticato
 *       500:
 *         description: Errore del server
 */
app.get('/chat', requireAuth, (req, res) => {
    const query = `
        SELECT r.id, r.name, r.type, 
            (SELECT COUNT(*) FROM room_participants WHERE room_id = r.id) as participant_count,
            (SELECT COUNT(*) FROM chat_messages WHERE room_id = r.id AND recipient_id = ? AND is_read = 0) as unread_count
        FROM chat_rooms r
        JOIN room_participants p ON r.id = p.room_id
        WHERE p.user_id = ?
        ORDER BY r.created_at DESC
    `;
    
    db.all(query, [req.session.user.id, req.session.user.id], (err, rooms) => {
        if (err) {
            console.error('Errore durante il recupero delle chat rooms:', err);
            return res.status(500).send('Errore del server');
        }
        
        const userQuery = `SELECT id, email, ruolo FROM userss WHERE id != ?`;
        db.all(userQuery, [req.session.user.id], (err, users) => {
            if (err) {
                console.error('Errore durante il recupero degli utenti:', err);
                return res.status(500).send('Errore del server');
            }
            
            res.render('chat', {
                user: req.session.user,
                rooms: rooms,
                users: users,
                year: new Date().getFullYear()
            });
        });
    });
});

/**
 * @swagger
 * /chat/{roomId}:
 *   get:
 *     summary: Pagina chat specifica
 *     tags: [Chat]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID della chat room
 *     responses:
 *       200:
 *         description: Pagina HTML della chat room
 *       302:
 *         description: Redirect alla pagina di login se non autenticato
 *       404:
 *         description: Chat room non trovata
 *       500:
 *         description: Errore del server
 */
app.get('/chat/:roomId', requireAuth, (req, res) => {
    const roomId = req.params.roomId;
    const userId = req.session.user.id;
    
    const participantQuery = `SELECT * FROM room_participants WHERE room_id = ? AND user_id = ?`;
    db.get(participantQuery, [roomId, userId], (err, participant) => {
        if (err || !participant) {
            return res.status(404).send('Chat room non trovata o accesso non autorizzato');
        }
        
        const roomQuery = `SELECT * FROM chat_rooms WHERE id = ?`;
        db.get(roomQuery, [roomId], (err, room) => {
            if (err || !room) {
                return res.status(404).send('Chat room non trovata');
            }
            
            const messagesQuery = `
                SELECT m.*, u.email as sender_email
                FROM chat_messages m
                JOIN userss u ON m.sender_id = u.id
                WHERE m.room_id = ?
                ORDER BY m.timestamp ASC
            `;
            
            db.all(messagesQuery, [roomId], (err, messages) => {
                if (err) {
                    console.error('Errore durante il recupero dei messaggi:', err);
                    return res.status(500).send('Errore del server');
                }
                
                db.run(`UPDATE chat_messages SET is_read = 1 WHERE room_id = ? AND recipient_id = ?`, 
                    [roomId, userId], (err) => {
                    if (err) {
                        console.error('Errore durante l\'aggiornamento dello stato dei messaggi:', err);
                    }
                    
                    const participantsQuery = `
                        SELECT u.id, u.email
                        FROM room_participants rp
                        JOIN userss u ON rp.user_id = u.id
                        WHERE rp.room_id = ?
                    `;
                    
                    db.all(participantsQuery, [roomId], (err, participants) => {
                        if (err) {
                            console.error('Errore durante il recupero dei partecipanti:', err);
                            return res.status(500).send('Errore del server');
                        }
                        
                        const formattedMessages = messages.map(msg => {
                            return {
                                content: msg.message,
                                sender: msg.sender_email,
                                timestamp: new Date(msg.timestamp).toLocaleString(),
                                isSelf: msg.sender_id === userId
                            };
                        });
                        
                        res.render('chat_room', {
                            user: req.session.user,
                            room: room,
                            messages: formattedMessages,
                            participants: participants,
                            roomId: roomId,
                            year: new Date().getFullYear()
                        });
                    });
                });
            });
        });
    });
});

/**
 * @swagger
 * /update-profile:
 *   post:
 *     summary: Aggiorna il profilo utente
 *     tags: [Users]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               telefono:
 *                 type: string
 *               data_nascita:
 *                 type: string
 *                 format: date
 *               citta:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profilo aggiornato con successo
 *       500:
 *         description: Errore del server
 */
app.post('/update-profile', requireAuth, (req, res) => {
    const { telefono, data_nascita, citta, password } = req.body;
    const userId = req.session.user.id;
    
    // If password is provided, update it too, otherwise just update other fields
    let query, params;
    if (password && password.trim() !== '') {
        query = `UPDATE userss SET telefono = ?, data_nascita = ?, citta = ?, password = ? WHERE id = ?`;
        params = [telefono, data_nascita, citta, password, userId];
    } else {
        query = `UPDATE userss SET telefono = ?, data_nascita = ?, citta = ? WHERE id = ?`;
        params = [telefono, data_nascita, citta, userId];
    }
    
    db.run(query, params, function(err) {
        if (err) {
            console.error('Errore durante l\'aggiornamento del profilo:', err);
            return res.status(500).json({ success: false, message: 'Errore durante l\'aggiornamento del profilo' });
        }
        
        // Get updated user data
        db.get(`SELECT * FROM userss WHERE id = ?`, [userId], (err, user) => {
            if (err) {
                return res.status(200).json({ success: true, message: 'Profilo aggiornato con successo' });
            }
            
            return res.status(200).json({ success: true, message: 'Profilo aggiornato con successo', user: user });
        });
    });
});

/**
 * @swagger
 * /api/rooms:
 *   post:
 *     summary: Crea una nuova chat room
 *     tags: [Chat]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nome della chat room
 *               type:
 *                 type: string
 *                 enum: [private, group]
 *                 description: Tipo di chat room
 *               participants:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Lista di ID utenti partecipanti
 *     responses:
 *       201:
 *         description: Chat room creata con successo
 *       500:
 *         description: Errore del server
 */
app.post('/api/rooms', requireAuth, (req, res) => {
    const { name, type, participants } = req.body;
    const userId = req.session.user.id;
    
    const insertRoomQuery = `INSERT INTO chat_rooms (name, type) VALUES (?, ?)`;
    db.run(insertRoomQuery, [name, type], function(err) {
        if (err) {
            console.error('Errore durante la creazione della chat room:', err);
            return res.status(500).json({ error: 'Errore del server' });
        }
        
        const roomId = this.lastID;
        
        const insertParticipantQuery = `INSERT INTO room_participants (room_id, user_id) VALUES (?, ?)`;
        db.run(insertParticipantQuery, [roomId, userId], function(err) {
            if (err) {
                console.error('Errore durante l\'aggiunta del partecipante:', err);
                return res.status(500).json({ error: 'Errore del server' });
            }
            
            if (participants && participants.length > 0) {
                const stmt = db.prepare(insertParticipantQuery);
                participants.forEach(participantId => {
                    if (participantId !== userId) {
                        stmt.run(roomId, participantId);
                    }
                });
                stmt.finalize();
            }
            
            res.status(201).json({ 
                success: true, 
                roomId: roomId, 
                message: 'Chat room creata con successo' 
            });
        });
    });
});

/**
 * @swagger
 * /api/messages:
 *   post:
 *     summary: Invia un messaggio in una chat room
 *     tags: [Chat]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roomId
 *               - message
 *             properties:
 *               roomId:
 *                 type: integer
 *                 description: ID della chat room
 *               message:
 *                 type: string
 *                 description: Testo del messaggio
 *     responses:
 *       201:
 *         description: Messaggio inviato con successo
 *       403:
 *         description: Accesso non autorizzato alla chat room
 *       500:
 *         description: Errore del server
 */
app.post('/api/messages', requireAuth, (req, res) => {
    const { roomId, message } = req.body;
    const senderId = req.session.user.id;
    
    const participantQuery = `SELECT * FROM room_participants WHERE room_id = ? AND user_id = ?`;
    db.get(participantQuery, [roomId, senderId], (err, participant) => {
        if (err || !participant) {
            return res.status(403).json({ error: 'Non sei un partecipante di questa chat room' });
        }
        
        const recipientsQuery = `SELECT user_id FROM room_participants WHERE room_id = ? AND user_id != ?`;
        db.all(recipientsQuery, [roomId, senderId], (err, recipients) => {
            if (err) {
                console.error('Errore durante il recupero dei destinatari:', err);
                return res.status(500).json({ error: 'Errore del server' });
            }
            
            recipients.forEach(recipient => {
                const insertMsgQuery = `
                    INSERT INTO chat_messages (sender_id, recipient_id, room_id, message)
                    VALUES (?, ?, ?, ?)
                `;
                db.run(insertMsgQuery, [senderId, recipient.user_id, roomId, message], function(err) {
                    if (err) {
                        console.error('Errore durante l\'invio del messaggio:', err);
                    }
                });
            });
            
            db.get(`SELECT email FROM userss WHERE id = ?`, [senderId], (err, user) => {
                if (!err && user) {
                    io.to(`room_${roomId}`).emit('chat message', {
                        content: message,
                        sender: user.email,
                        senderId: senderId,
                        roomId: roomId,
                        timestamp: new Date().toLocaleString()
                    });
                }
                
                res.status(201).json({ success: true, message: 'Messaggio inviato' });
            });
        });
    });
});

/**
 * @swagger
 * /registra:
 *   post:
 *     summary: Registra un nuovo utente
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
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
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login effettuato con successo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 redirect:
 *                   type: string
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

        if (row.ruolo === 'admin' || email.endsWith('@admin.it')) {
            return res.json({ redirect: '/admin' });
        }

        res.json({ redirect: '/dashboard' });
    });
});

/**
 * @swagger
 * /logout:
 *   get:
 *     summary: Effettua il logout
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Reindirizzamento alla home page
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
 * /:
 *   get:
 *     summary: Home page
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Pagina HTML di login/home
 *       302:
 *         description: Reindirizzamento alla dashboard se già autenticato
 */
app.get('/', (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    res.render('index', {
        year: new Date().getFullYear()
    });
});

/**
 * @swagger
 * /registra:
 *   get:
 *     summary: Pagina di registrazione
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Pagina HTML di registrazione
 */
app.get('/registra', (req, res) => {
    res.render('registra', {
        year: new Date().getFullYear()
    });
});

// Admin functions
function requireAdmin(req, res, next) {
    if (!req.session.user || (req.session.user.ruolo !== 'admin' && !req.session.user.email.endsWith('@admin.it'))) {
        return res.redirect('/');
    }
    next();
}

/**
 * @swagger
 * /admin:
 *   get:
 *     summary: Pannello di amministrazione
 *     tags: [Users]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Pagina HTML di amministrazione
 *       302:
 *         description: Reindirizzamento alla home page se non admin
 */
app.get('/admin', requireAdmin, (req, res) => {
    const query = `SELECT * FROM userss`;
    db.all(query, [], (err, users) => {
        if (err) {
            console.error('Errore durante il recupero degli utenti:', err);
            return res.status(500).send('Errore del server');
        }
        
        res.render('admin', {
            user: req.session.user,
            users: users,
            year: new Date().getFullYear()
        });
    });
});

// WebSocket events
io.on('connection', (socket) => {
    console.log('Un utente si è connesso');
    
    // Aggiorniamo il contatore in modo più affidabile
    updateOnlineUsers();
    
    socket.on('authenticate', (data) => {
        if (data && data.userId) {
            // Store the user ID in the socket object
            socket.userId = data.userId;
            connectedUsers.add(data.userId);
            updateOnlineUsers();
        }
    });

     // When user disconnects, remove them from the set
     socket.on('disconnect', () => {
        console.log('Un utente si è disconnesso');
        if (socket.userId) {
            connectedUsers.delete(socket.userId);
            updateOnlineUsers();
        }
    });
    
    socket.on('chat message', (data) => {
        if (socket.userId && data.roomId) {
            io.to(`room_${data.roomId}`).emit('chat message', {
                ...data,
                timestamp: new Date().toLocaleString()
            });
        }
    });
    
    socket.on('typing', (data) => {
        socket.to(`room_${data.roomId}`).emit('user typing', {
            userId: socket.userId,
            roomId: data.roomId,
            isTyping: data.isTyping
        });
    });
    
    socket.on('join room', (roomId) => {
        if (socket.userId) {
            socket.join(`room_${roomId}`);
            console.log(`Utente ${socket.userId} si è unito alla room ${roomId}`);
        }
    });
    
    socket.on('leave room', (roomId) => {
        socket.leave(`room_${roomId}`);
        console.log(`Utente ha lasciato la room ${roomId}`);
    });
    
    
    // Invia l'orario server al client per sincronizzazione
    socket.emit('server time', {
        timestamp: new Date().toISOString(),
        formattedDate: '2025-05-08 10:09:21' // Data aggiornata come richiesto dal client
    });
});


// Funzione per aggiornare il contatore di utenti online
function updateOnlineUsers() {
    const onlineCount = connectedUsers.size || 0;
    io.emit('update online users', onlineCount);
}

// Global counter for online users
let onlineUsers = 0;

// Close database connections on process exit
process.on('SIGINT', () => {
    db.close();
    sessionDb.close();
    process.exit(0);
});

server.listen(port, '0.0.0.0', (err) => {
    if (err) {
        console.error('Errore durante l\'avvio del server:', err);
    } else {
        console.log(`Server in esecuzione su http://localhost:${port}`);
        console.log(`Documentazione Swagger disponibile su http://localhost:${port}/api-docs`);
    }
});