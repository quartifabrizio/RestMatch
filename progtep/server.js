require('dotenv').config();
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
              description: 'Regione selezionata'
            },
            city: {
              type: 'string',
              description: 'Città selezionata'
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

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

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

        // Create preferences table with city column
        db.run(
            `CREATE TABLE IF NOT EXISTS preferences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                country TEXT NOT NULL,
                city TEXT NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                job_type TEXT NOT NULL,
                restaurant_type TEXT NOT NULL,
                preference_name TEXT DEFAULT 'Default',
                FOREIGN KEY (user_id) REFERENCES userss(id)
            )`, (err) => {
                if (err) console.error('Errore durante la creazione della tabella preferenze:', err);
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
        
        // Create offers table
        db.run(
            `CREATE TABLE IF NOT EXISTS offerte (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                role TEXT NOT NULL,
                description TEXT NOT NULL,
                city TEXT NOT NULL,
                region TEXT NOT NULL,
                restaurant_type TEXT NOT NULL,
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

// Mappatura delle regioni italiane con le relative città
const regionCityMapping = {
    "Abruzzo": ["L'Aquila", "Pescara", "Chieti", "Teramo"],
    "Basilicata": ["Potenza", "Matera"],
    "Calabria": ["Reggio Calabria", "Catanzaro", "Cosenza", "Crotone", "Vibo Valentia"],
    "Campania": ["Napoli", "Salerno", "Caserta", "Avellino", "Benevento"],
    "Emilia-Romagna": ["Bologna", "Modena", "Parma", "Reggio Emilia", "Ravenna", "Ferrara", "Forlì-Cesena", "Rimini", "Piacenza"],
    "Friuli-Venezia Giulia": ["Trieste", "Udine", "Pordenone", "Gorizia"],
    "Lazio": ["Roma", "Latina", "Frosinone", "Viterbo", "Rieti"],
    "Liguria": ["Genova", "La Spezia", "Savona", "Imperia"],
    "Lombardia": ["Milano", "Brescia", "Bergamo", "Monza", "Como", "Varese", "Pavia", "Cremona", "Mantova", "Lecco", "Lodi", "Sondrio"],
    "Marche": ["Ancona", "Pesaro e Urbino", "Macerata", "Ascoli Piceno", "Fermo"],
    "Molise": ["Campobasso", "Isernia"],
    "Piemonte": ["Torino", "Cuneo", "Alessandria", "Novara", "Asti", "Vercelli", "Biella", "Verbano-Cusio-Ossola"],
    "Puglia": ["Bari", "Taranto", "Lecce", "Foggia", "Brindisi", "Barletta-Andria-Trani"],
    "Sardegna": ["Cagliari", "Sassari", "Nuoro", "Oristano", "Sud Sardegna"],
    "Sicilia": ["Palermo", "Catania", "Messina", "Siracusa", "Trapani", "Agrigento", "Ragusa", "Caltanissetta", "Enna"],
    "Toscana": ["Firenze", "Pisa", "Livorno", "Siena", "Lucca", "Arezzo", "Pistoia", "Massa-Carrara", "Grosseto", "Prato"],
    "Trentino-Alto Adige": ["Trento", "Bolzano"],
    "Umbria": ["Perugia", "Terni"],
    "Valle d'Aosta": ["Aosta"],
    "Veneto": ["Venezia", "Verona", "Padova", "Vicenza", "Treviso", "Rovigo", "Belluno"]
};

// Crea il file di mapping nella cartella public per l'uso client-side
const regionsFilePath = path.join(__dirname, 'public', 'js', 'region-city-mapping.js');
const regionsFileContent = `
// Mappatura regioni-città per l'Italia
const regionCityMapping = ${JSON.stringify(regionCityMapping, null, 2)};

// Funzioni di utility
function getAllRegions() {
    return Object.keys(regionCityMapping);
}

function getCitiesForRegion(region) {
    return regionCityMapping[region] || [];
}

function getRandomRegion() {
    const regions = getAllRegions();
    return regions[Math.floor(Math.random() * regions.length)];
}

function getRandomCityFromRegion(region) {
    const cities = getCitiesForRegion(region);
    return cities[Math.floor(Math.random() * cities.length)];
}
`;

// Assicurati che la directory esista
if (!fs.existsSync(path.join(__dirname, 'public', 'js'))) {
    fs.mkdirSync(path.join(__dirname, 'public', 'js'), { recursive: true });
}

// Scrivi il file
fs.writeFileSync(regionsFilePath, regionsFileContent);
console.log('File di mappatura regioni-città creato con successo');

// Improved function to fetch and store job offers with proper region-city mapping
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
    const restaurantTypes = ['Trattoria', 'Ristorante Cinese', 'Ristorante Italiano', 'Sushi', 'Fast Food', 'Pizzeria'];
    const jobTypes = ['Chef', 'Cameriere', 'Barista', 'Lavapiatti', 'Responsabile Sala', 'Aiuto Cuoco'];
    
    const insertStmt = db.prepare('INSERT INTO offerte (title, role, description, city, region, restaurant_type, job_type, start_date, end_date, salary, imageUrl, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    
    jobsToInsert.forEach((job, index) => {
        // Assign a random restaurant user to each offer
        const randomUserIndex = Math.floor(Math.random() * restaurantUsers.length);
        const restaurantUser = restaurantUsers[randomUserIndex];
        
        // Get a random region and corresponding city
        const regions = Object.keys(regionCityMapping);
        const randomRegion = regions[Math.floor(Math.random() * regions.length)];
        const citiesInRegion = regionCityMapping[randomRegion];
        const randomCity = citiesInRegion[Math.floor(Math.random() * citiesInRegion.length)];
        
        const randomRestaurantType = restaurantTypes[Math.floor(Math.random() * restaurantTypes.length)];
        const randomJobType = jobTypes[Math.floor(Math.random() * jobTypes.length)];
        
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(today.getDate() + Math.floor(Math.random() * 30) + 1);
        
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + Math.floor(Math.random() * 90) + 30);
        
        const formattedStartDate = startDate.toISOString().split('T')[0];
        const formattedEndDate = endDate.toISOString().split('T')[0];
        
        const imageUrl = `/images/restaurant-${(index % 5) + 1}.jpg`;
        
        // Use restaurant name as part of the title
        const title = `${restaurantUser.nome}: ${job.title.substring(0, 30)}`;
        
        insertStmt.run(
            title,
            randomJobType,
            job.description.substring(0, 200),
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

// Add an endpoint to allow restaurateurs to create job offers
app.post('/create-offer', requireAuth, (req, res) => {
    // Check if user is a restaurant
    if (req.session.user.ruolo !== 'ristoratore') {
        return res.status(403).send('Solo i ristoratori possono creare offerte di lavoro');
    }
    
    const { title, role, description, city, region, restaurant_type, job_type, start_date, end_date, salary } = req.body;
    
    // Basic validation
    if (!title || !role || !description || !city || !region || !restaurant_type || !job_type || !start_date || !end_date) {
        return res.status(400).send('Tutti i campi sono obbligatori');
    }
    
    // Validate that city belongs to the selected region
    const citiesInRegion = regionCityMapping[region] || [];
    if (!citiesInRegion.includes(city)) {
        return res.status(400).send('La città selezionata non appartiene alla regione selezionata');
    }
    
    // Generate random image for the job posting
    const imageUrl = `/images/restaurant-${Math.floor(Math.random() * 5) + 1}.jpg`;
    
    // Insert the job offer into the database
    const query = `
        INSERT INTO offerte 
        (title, role, description, city, region, restaurant_type, job_type, start_date, end_date, salary, imageUrl, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.run(query, [
        title, role, description, city, region, restaurant_type, job_type, start_date, end_date, 
        salary || `${1200 + Math.floor(Math.random() * 1800)}€/mese`, imageUrl, req.session.user.id
    ], function(err) {
        if (err) {
            console.error('Errore durante la creazione dell\'offerta:', err);
            return res.status(500).send('Errore del server');
        }
        
        res.status(200).json({ success: true, message: 'Offerta creata con successo', id: this.lastID });
    });
});

// Add this endpoint to handle contacting the restaurant owner
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

// Modify the save-preferences route to include city
app.post('/save-preferences', requireAuth, (req, res) => {
    const { region, city, startDate, endDate, jobType, restaurantType, preferenceName } = req.body;
    
    // Basic validation
    if (!region || !city || !startDate || !endDate || !jobType || !restaurantType) {
        return res.status(400).json({ success: false, message: 'Tutti i campi sono obbligatori' });
    }
    
    // Validate that city belongs to the selected region
    const citiesInRegion = regionCityMapping[region] || [];
    if (!citiesInRegion.includes(city)) {
        return res.status(400).json({ success: false, message: 'La città selezionata non appartiene alla regione selezionata' });
    }
    
    // Check if preference with this name already exists for this user
    const checkExistingPreference = `
        SELECT id FROM preferences 
        WHERE user_id = ? AND preference_name = ?
    `;
    
    db.get(checkExistingPreference, [req.session.user.id, preferenceName || 'Default'], (err, existing) => {
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
            params = [region, city, startDate, endDate, jobType, restaurantType, existing.id];
        } else {
            // Insert new preference
            query = `
                INSERT INTO preferences 
                (user_id, country, city, start_date, end_date, job_type, restaurant_type, preference_name)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
            params = [req.session.user.id, region, city, startDate, endDate, jobType, restaurantType, preferenceName || 'Default'];
        }
        
        db.run(query, params, function(err) {
            if (err) {
                console.error('Errore durante il salvataggio delle preferenze:', err);
                return res.status(500).json({ success: false, message: 'Errore del server' });
            }
            
            // Fetch filtered job offers based on the saved preferences
            const getFilteredOffers = `
                SELECT o.*, u.email as restaurant_name
                FROM offerte o
                LEFT JOIN userss u ON o.user_id = u.id
                WHERE o.region = ? 
                    AND o.city = ? 
                    AND o.job_type = ?
                    AND o.restaurant_type = ?
                    AND o.start_date >= ?
                    AND o.end_date <= ?
                ORDER BY o.created_at DESC
            `;
            
            db.all(getFilteredOffers, [region, city, jobType, restaurantType, startDate, endDate], (err, offers) => {
                if (err) {
                    console.error('Errore durante il recupero delle offerte filtrate:', err);
                    return res.status(500).json({ success: false, message: 'Errore del server' });
                }
                
                return res.status(200).json({ 
                    success: true, 
                    message: 'Preferenze salvate con successo', 
                    offers: offers 
                });
            });
        });
    });
});

app.get('/api/get-filtered-offers/:preferenceId', requireAuth, (req, res) => {
    const preferenceId = req.params.preferenceId;
    
    // First, get the preference details
    const getPreference = `SELECT * FROM preferences WHERE id = ? AND user_id = ?`;
    
    db.get(getPreference, [preferenceId, req.session.user.id], (err, preference) => {
        if (err) {
            console.error('Errore durante il recupero della preferenza:', err);
            return res.status(500).json({ success: false, message: 'Errore del server' });
        }
        
        if (!preference) {
            return res.status(404).json({ success: false, message: 'Preferenza non trovata' });
        }
        
        // Get filtered offers
        const getFilteredOffers = `
            SELECT o.*, u.email as restaurant_name
            FROM offerte o
            LEFT JOIN userss u ON o.user_id = u.id
            WHERE o.region = ? 
                AND o.city = ? 
                AND o.job_type = ?
                AND o.restaurant_type = ?
                AND o.start_date >= ?
                AND o.end_date <= ?
            ORDER BY o.created_at DESC
        `;
        
        db.all(getFilteredOffers, [
            preference.country, 
            preference.city, 
            preference.job_type, 
            preference.restaurant_type, 
            preference.start_date, 
            preference.end_date
        ], (err, offers) => {
            if (err) {
                console.error('Errore durante il recupero delle offerte filtrate:', err);
                return res.status(500).json({ success: false, message: 'Errore del server' });
            }
            
            return res.status(200).json({ 
                success: true, 
                offers: offers,
                preference: preference
            });
        });
    });
});

// API to get all regions
app.get('/api/regions', (req, res) => {
    res.json(Object.keys(regionCityMapping));
});

// API to get cities for a region
app.get('/api/cities/:region', (req, res) => {
    const region = req.params.region;
    res.json(regionCityMapping[region] || []);
});

// Update the dashboard route to include job offers based on preferences
app.get('/dashboard', requireAuth, (req, res) => {
    // First, fetch all user preferences
    const getUserPreferences = `SELECT * FROM preferences WHERE user_id = ?`;
    
    // Then fetch all job offers initially (without filtering)
    const getAllOffers = `
        SELECT o.*, u.email as restaurant_name
        FROM offerte o
        LEFT JOIN userss u ON o.user_id = u.id
        ORDER BY o.created_at DESC
        LIMIT 50
    `;
    
    db.all(getUserPreferences, [req.session.user.id], (err, preferences) => {
        if (err) {
            console.error('Errore durante il recupero delle preferenze:', err);
            return res.status(500).send('Errore del server');
        }
        
        // Get all offers by default when first loading the dashboard
        db.all(getAllOffers, [], (err, jobs) => {
            if (err) {
                console.error('Errore durante il recupero delle offerte:', err);
                return res.status(500).send('Errore del server');
            }
            
            res.render('dashboard', {
                user: req.session.user,
                preferences: preferences.length > 0 ? preferences[0] : {},
                allPreferences: preferences,
                jobs: jobs,
                regions: Object.keys(regionCityMapping),
                helpers: {
                    equals: function(a, b) { return a === b; }
                }
            });
        });
    });
});

// Routes for chat
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

// API routes for chat
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

// Basic routes
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

app.get('/', (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    res.render('index', {
        year: new Date().getFullYear()
    });
});

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
    onlineUsers++;
    io.emit('update online users', onlineUsers);
    
    socket.on('authenticate', (userData) => {
        if (userData && userData.userId) {
            socket.userId = userData.userId;
            socket.join(`user_${userData.userId}`);
            console.log(`Utente ${userData.userId} autenticato`);
            
            const roomsQuery = `SELECT room_id FROM room_participants WHERE user_id = ?`;
            db.all(roomsQuery, [userData.userId], (err, rooms) => {
                if (!err && rooms) {
                    rooms.forEach(room => {
                        socket.join(`room_${room.room_id}`);
                        console.log(`Utente ${userData.userId} si è unito alla room ${room.room_id}`);
                    });
                }
            });
            
            io.emit('user status', { userId: userData.userId, status: 'online' });
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
    
    socket.on('disconnect', () => {
        onlineUsers = Math.max(0, onlineUsers - 1);
        io.emit('update online users', onlineUsers);
        
        if (socket.userId) {
            io.emit('user status', { userId: socket.userId, status: 'offline' });
            console.log(`Utente ${socket.userId} si è disconnesso`);
        } else {
            console.log('Un utente si è disconnesso');
        }
    });
});

// Global counter for online users
let onlineUsers = 0;

server.listen(port, 'localhost', (err) => {
    if (err) {
        console.error('Errore durante l\'avvio del server:', err);
    } else {
        console.log(`Server in esecuzione su http://localhost:${port}`);
        console.log(`Documentazione Swagger disponibile su http://localhost:${port}/api-docs`);
    }
});