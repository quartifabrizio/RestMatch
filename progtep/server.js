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

// Create chat messages table in the database
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

/**
 * @swagger
 * /chat:
 *   get:
 *     summary: Pagina chat
 *     description: Restituisce la pagina della chat
 *     tags: [Pagine]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Pagina della chat
 */
app.get('/chat', requireAuth, (req, res) => {
    // Recupera le chat rooms dell'utente
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
        
        // Recupera gli utenti online per mostrare lo stato
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
 *     summary: Pagina di una specifica chat room
 *     description: Mostra i messaggi di una specifica chat room
 *     tags: [Pagine]
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
 *         description: Pagina della chat room
 *       404:
 *         description: Chat room non trovata
 */
app.get('/chat/:roomId', requireAuth, (req, res) => {
    const roomId = req.params.roomId;
    const userId = req.session.user.id;
    
    // Verifica che l'utente sia un partecipante della room
    const participantQuery = `SELECT * FROM room_participants WHERE room_id = ? AND user_id = ?`;
    db.get(participantQuery, [roomId, userId], (err, participant) => {
        if (err || !participant) {
            return res.status(404).send('Chat room non trovata o accesso non autorizzato');
        }
        
        // Recupera i dettagli della room
        const roomQuery = `SELECT * FROM chat_rooms WHERE id = ?`;
        db.get(roomQuery, [roomId], (err, room) => {
            if (err || !room) {
                return res.status(404).send('Chat room non trovata');
            }
            
            // Recupera i messaggi della room
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
                
                // Marca i messaggi come letti
                db.run(`UPDATE chat_messages SET is_read = 1 WHERE room_id = ? AND recipient_id = ?`, 
                    [roomId, userId], (err) => {
                    if (err) {
                        console.error('Errore durante l\'aggiornamento dello stato dei messaggi:', err);
                    }
                    
                    // Recupera i partecipanti alla room
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
                        
                        // Formatta i messaggi per la visualizzazione
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
 * /api/rooms:
 *   post:
 *     summary: Crea una nuova chat room
 *     description: Crea una nuova chat room con i partecipanti specificati
 *     tags: [Chat]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [private, group]
 *               participants:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       201:
 *         description: Chat room creata con successo
 *       500:
 *         description: Errore del server
 */
app.post('/api/rooms', requireAuth, (req, res) => {
    const { name, type, participants } = req.body;
    const userId = req.session.user.id;
    
    // Inserisci la nuova room
    const insertRoomQuery = `INSERT INTO chat_rooms (name, type) VALUES (?, ?)`;
    db.run(insertRoomQuery, [name, type], function(err) {
        if (err) {
            console.error('Errore durante la creazione della chat room:', err);
            return res.status(500).json({ error: 'Errore del server' });
        }
        
        const roomId = this.lastID;
        
        // Aggiungi il creatore come partecipante
        const insertParticipantQuery = `INSERT INTO room_participants (room_id, user_id) VALUES (?, ?)`;
        db.run(insertParticipantQuery, [roomId, userId], function(err) {
            if (err) {
                console.error('Errore durante l\'aggiunta del partecipante:', err);
                return res.status(500).json({ error: 'Errore del server' });
            }
            
            // Aggiungi altri partecipanti
            if (participants && participants.length > 0) {
                const stmt = db.prepare(insertParticipantQuery);
                participants.forEach(participantId => {
                    if (participantId !== userId) { // Evita duplicati
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
 *     summary: Invia un messaggio
 *     description: Invia un messaggio a una chat room
 *     tags: [Chat]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               roomId:
 *                 type: integer
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Messaggio inviato con successo
 *       500:
 *         description: Errore del server
 */
app.post('/api/messages', requireAuth, (req, res) => {
    const { roomId, message } = req.body;
    const senderId = req.session.user.id;
    
    // Verifica che il mittente sia un partecipante della room
    const participantQuery = `SELECT * FROM room_participants WHERE room_id = ? AND user_id = ?`;
    db.get(participantQuery, [roomId, senderId], (err, participant) => {
        if (err || !participant) {
            return res.status(403).json({ error: 'Non sei un partecipante di questa chat room' });
        }
        
        // Ottieni i destinatari (altri partecipanti della room)
        const recipientsQuery = `SELECT user_id FROM room_participants WHERE room_id = ? AND user_id != ?`;
        db.all(recipientsQuery, [roomId, senderId], (err, recipients) => {
            if (err) {
                console.error('Errore durante il recupero dei destinatari:', err);
                return res.status(500).json({ error: 'Errore del server' });
            }
            
            // Inserisci un messaggio per ogni destinatario
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
            
            // Recupera l'email del mittente per il socket
            db.get(`SELECT email FROM userss WHERE id = ?`, [senderId], (err, user) => {
                if (!err && user) {
                    // Emetti l'evento per il socket
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

      // Check if user is admin by checking email domain
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


/**
 * @swagger
 * /update-profile:
 *   post:
 *     summary: Aggiorna il profilo utente
 *     description: Aggiorna le informazioni del profilo dell'utente
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
 *               email:
 *                 type: string
 *               telefono:
 *                 type: string
 *               data_nascita:
 *                 type: string
 *               citta:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profilo aggiornato con successo
 *       401:
 *         description: Utente non autenticato
 *       500:
 *         description: Errore del server
 */
app.post('/update-profile', requireAuth, (req, res) => {
  const { email, telefono, data_nascita, citta, password } = req.body;
  const userId = req.session.user.id;
  
  // Base query for updating user info without password
  let query = `UPDATE userss SET telefono = ?, data_nascita = ?, citta = ? WHERE id = ?`;
  let params = [telefono, data_nascita, citta, userId];
  
  // If password is provided, update it too
  if (password) {
    query = `UPDATE userss SET telefono = ?, data_nascita = ?, citta = ?, password = ? WHERE id = ?`;
    params = [telefono, data_nascita, citta, password, userId];
  }
  
  db.run(query, params, function(err) {
    if (err) {
      console.error('Errore durante l\'aggiornamento del profilo:', err);
      return res.status(500).json({ error: 'Errore del server' });
    }
    
    // Update session data if needed
    if (req.session.user.email !== email && email) {
      req.session.user.email = email;
    }
    
    res.status(200).json({ success: true, message: 'Profilo aggiornato con successo' });
  });
});

/**
 * @swagger
 * /delete-account:
 *   post:
 *     summary: Elimina account utente
 *     description: Elimina definitivamente l'account dell'utente corrente
 *     tags: [Utenti]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Account eliminato con successo
 *       401:
 *         description: Utente non autenticato
 *       500:
 *         description: Errore del server
 */
app.post('/delete-account', requireAuth, (req, res) => {
  const userId = req.session.user.id;
  
  // Elimina prima le preferenze (foreign key constraint)
  db.run(`DELETE FROM preferences WHERE user_id = ?`, [userId], function(err) {
    if (err) {
      console.error('Errore durante l\'eliminazione delle preferenze:', err);
      return res.status(500).json({ error: 'Errore del server' });
    }
    
    // Poi elimina l'utente
    db.run(`DELETE FROM userss WHERE id = ?`, [userId], function(err) {
      if (err) {
        console.error('Errore durante l\'eliminazione dell\'utente:', err);
        return res.status(500).json({ error: 'Errore del server' });
      }
      
      res.status(200).json({ success: true, message: 'Account eliminato con successo' });
    });
  });
});

/**
 * @swagger
 * /download-user-data:
 *   get:
 *     summary: Scarica i dati dell'utente
 *     description: Restituisce tutti i dati dell'utente in formato JSON
 *     tags: [Utenti]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: File JSON con i dati dell'utente
 *       401:
 *         description: Utente non autenticato
 *       500:
 *         description: Errore del server
 */
app.get('/download-user-data', requireAuth, (req, res) => {
  const userId = req.session.user.id;
  
  // Recupera i dati dell'utente
  db.get(`SELECT id, email, telefono, data_nascita, citta, ruolo FROM userss WHERE id = ?`, [userId], (err, user) => {
    if (err) {
      console.error('Errore durante il recupero dei dati utente:', err);
      return res.status(500).json({ error: 'Errore del server' });
    }
    
    // Recupera le preferenze dell'utente
    db.all(`SELECT * FROM preferences WHERE user_id = ?`, [userId], (err, preferences) => {
      if (err) {
        console.error('Errore durante il recupero delle preferenze:', err);
        return res.status(500).json({ error: 'Errore del server' });
      }
      
      // Crea l'oggetto dati completo
      const userData = {
        user: user,
        preferences: preferences || []
      };
      
      // Imposta gli header per il download
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=user-data.json');
      
      // Invia i dati
      res.send(JSON.stringify(userData, null, 2));
    });
  });
});


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
*     summary: Pagina amministrazione
*     description: Restituisce la pagina di amministrazione del sistema
*     tags: [Pagine]
*     security:
*       - sessionAuth: []
*     responses:
*       200:
*         description: Pagina amministrazione
*         content:
*           text/html:
*             schema:
*               type: string
*       401:
*         description: Accesso non autorizzato
*/
app.get('/admin', requireAdmin, (req, res) => {
  // Recupera tutti gli utenti dal database
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

/**
* @swagger
* /api/users:
*   get:
*     summary: Ottieni tutti gli utenti
*     description: Restituisce l'elenco completo degli utenti (solo per admin)
*     tags: [Utenti]
*     security:
*       - sessionAuth: []
*     responses:
*       200:
*         description: Elenco di utenti
*         content:
*           application/json:
*             schema:
*               type: array
*               items:
*                 $ref: '#/components/schemas/User'
*       401:
*         description: Accesso non autorizzato
*       500:
*         description: Errore del server
*/
app.get('/api/users', requireAdmin, (req, res) => {
  const query = `SELECT * FROM userss`;
  
  db.all(query, [], (err, rows) => {
      if (err) {
          console.error('Errore durante il recupero degli utenti:', err);
          return res.status(500).json({ error: 'Errore del server' });
      }
      
      res.status(200).json(rows);
  });
});

/**
* @swagger
* /api/users/{id}:
*   delete:
*     summary: Elimina un utente
*     description: Elimina un utente dal sistema (solo per admin)
*     tags: [Utenti]
*     security:
*       - sessionAuth: []
*     parameters:
*       - in: path
*         name: id
*         required: true
*         schema:
*           type: integer
*         description: ID dell'utente da eliminare
*     responses:
*       200:
*         description: Utente eliminato con successo
*       401:
*         description: Accesso non autorizzato
*       500:
*         description: Errore del server
*/
app.delete('/api/users/:id', requireAdmin, (req, res) => {
  const userId = req.params.id;
  
  // Prevent deleting admin users
  db.get(`SELECT * FROM userss WHERE id = ?`, [userId], (err, user) => {
      if (err) {
          console.error('Errore durante il recupero dell\'utente:', err);
          return res.status(500).json({ error: 'Errore del server' });
      }
      
      if (user && (user.ruolo === 'admin' || user.email.endsWith('@admin.it'))) {
          return res.status(403).json({ error: 'Non è possibile eliminare un account amministratore' });
      }
      
      // Delete user preferences first
      db.run(`DELETE FROM preferences WHERE user_id = ?`, [userId], function(err) {
          if (err) {
              console.error('Errore durante l\'eliminazione delle preferenze:', err);
              return res.status(500).json({ error: 'Errore del server' });
          }
          
          // Then delete user
          db.run(`DELETE FROM userss WHERE id = ?`, [userId], function(err) {
              if (err) {
                  console.error('Errore durante l\'eliminazione dell\'utente:', err);
                  return res.status(500).json({ error: 'Errore del server' });
              }
              
              res.status(200).json({ success: true, message: 'Utente eliminato con successo' });
          });
      });
  });
});

/**
* @swagger
* /api/users/{id}:
*   put:
*     summary: Aggiorna un utente
*     description: Aggiorna i dati di un utente (solo per admin)
*     tags: [Utenti]
*     security:
*       - sessionAuth: []
*     parameters:
*       - in: path
*         name: id
*         required: true
*         schema:
*           type: integer
*         description: ID dell'utente da aggiornare
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             $ref: '#/components/schemas/User'
*     responses:
*       200:
*         description: Utente aggiornato con successo
*       401:
*         description: Accesso non autorizzato
*       500:
*         description: Errore del server
*/
app.put('/api/users/:id', requireAdmin, (req, res) => {
  const userId = req.params.id;
  const { email, telefono, data_nascita, citta, ruolo, password } = req.body;
  
  // Base query for updating user info without password
  let query = `UPDATE userss SET email = ?, telefono = ?, data_nascita = ?, citta = ?, ruolo = ? WHERE id = ?`;
  let params = [email, telefono, data_nascita, citta, ruolo, userId];
  
  // If password is provided, update it too
  if (password) {
      query = `UPDATE userss SET email = ?, telefono = ?, data_nascita = ?, citta = ?, ruolo = ?, password = ? WHERE id = ?`;
      params = [email, telefono, data_nascita, citta, ruolo, password, userId];
  }
  
  db.run(query, params, function(err) {
      if (err) {
          console.error('Errore durante l\'aggiornamento dell\'utente:', err);
          return res.status(500).json({ error: 'Errore del server' });
      }
      
      res.status(200).json({ success: true, message: 'Utente aggiornato con successo' });
  });
});

/**
* @swagger
* /api/users:
*   post:
*     summary: Crea un nuovo utente
*     description: Crea un nuovo utente nel sistema (solo per admin)
*     tags: [Utenti]
*     security:
*       - sessionAuth: []
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             $ref: '#/components/schemas/RegisterRequest'
*     responses:
*       201:
*         description: Utente creato con successo
*       400:
*         description: Utente già esistente
*       401:
*         description: Accesso non autorizzato
*       500:
*         description: Errore del server
*/
app.post('/api/users', requireAdmin, (req, res) => {
  const { email, telefono, data_nascita, citta, ruolo, password } = req.body;
  
  const query = `INSERT INTO userss (email, telefono, data_nascita, citta, ruolo, password) VALUES (?, ?, ?, ?, ?, ?)`;
  db.run(query, [email, telefono, data_nascita, citta, ruolo, password], function(err) {
      if (err) {
          if (err.code === 'SQLITE_CONSTRAINT') {
              return res.status(400).json({ error: 'Email già registrata' });
          }
          console.error('Errore durante la creazione dell\'utente:', err);
          return res.status(500).json({ error: 'Errore del server' });
      }
      
      res.status(201).json({ success: true, message: 'Utente creato con successo', id: this.lastID });
  });
});

// Global counter for online users
let onlineUsers = 0;

// WebSocket events
io.on('connection', (socket) => {
  console.log('Un utente si è connesso');
  onlineUsers++;
  io.emit('update online users', onlineUsers);
  
  // Autenticazione del socket
  socket.on('authenticate', (userData) => {
      if (userData && userData.userId) {
          socket.userId = userData.userId;
          socket.join(`user_${userData.userId}`);
          console.log(`Utente ${userData.userId} autenticato`);
          
          // Unisciti alle room dell'utente
          const roomsQuery = `
              SELECT room_id FROM room_participants WHERE user_id = ?
          `;
          db.all(roomsQuery, [userData.userId], (err, rooms) => {
              if (!err && rooms) {
                  rooms.forEach(room => {
                      socket.join(`room_${room.room_id}`);
                      console.log(`Utente ${userData.userId} si è unito alla room ${room.room_id}`);
                  });
              }
          });
          
          // Notifica online status
          io.emit('user status', { userId: userData.userId, status: 'online' });
      }
  });
  
  // Gestione messaggi
  socket.on('chat message', (data) => {
      if (socket.userId && data.roomId) {
          io.to(`room_${data.roomId}`).emit('chat message', {
              ...data,
              timestamp: new Date().toLocaleString()
          });
      }
  });
  
  // Typing indicator
  socket.on('typing', (data) => {
      socket.to(`room_${data.roomId}`).emit('user typing', {
          userId: socket.userId,
          roomId: data.roomId,
          isTyping: data.isTyping
      });
  });
  
  // Join room
  socket.on('join room', (roomId) => {
      if (socket.userId) {
          socket.join(`room_${roomId}`);
          console.log(`Utente ${socket.userId} si è unito alla room ${roomId}`);
      }
  });
  
  // Leave room
  socket.on('leave room', (roomId) => {
      socket.leave(`room_${roomId}`);
      console.log(`Utente ha lasciato la room ${roomId}`);
  });
  
  // Disconnessione
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

server.listen(port, 'localhost', (err) => {
    if (err) {
        console.error('Errore durante l\'avvio del server:', err);
    } else {
        console.log(`Server in esecuzione su http://localhost:${port}`);
        console.log(`Documentazione Swagger disponibile su http://localhost:${port}/api-docs`);
    }
});