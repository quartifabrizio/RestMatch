// Mock data for database.db
const mainDb = {
  userss: [
    {
      id: 1,
      email: 'admin@admin.it',
      telefono: '123456789',
      data_nascita: '1990-01-01',
      citta: 'Admin City',
      ruolo: 'admin',
      password: 'admin123' // In a real scenario, this would be hashed
    },
    {
      id: 2,
      email: 'ristoratore1@example.com',
      telefono: '0987654321',
      data_nascita: '1985-05-15',
      citta: 'Roma',
      ruolo: 'ristoratore',
      password: 'password123'
    },
    {
      id: 3,
      email: 'lavoratore1@example.com',
      telefono: '1122334455',
      data_nascita: '1995-08-20',
      citta: 'Milano',
      ruolo: 'lavoratore',
      password: 'password456'
    },
    {
      id: 4,
      email: 'googleuser@gmail.com',
      telefono: '',
      data_nascita: '',
      citta: '',
      ruolo: 'google',
      password: ''
    }
  ],
  chat_rooms: [
    {
      id: 1,
      name: 'Chat Ristoratore1-Lavoratore1',
      type: 'private', // Assuming 'private' or 'group'
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      name: 'Staff Meeting Room',
      type: 'group',
      created_at: new Date().toISOString()
    }
  ],
  room_participants: [
    { room_id: 1, user_id: 2, joined_at: new Date().toISOString() }, // Ristoratore1 in Chat 1
    { room_id: 1, user_id: 3, joined_at: new Date().toISOString() }, // Lavoratore1 in Chat 1
    { room_id: 2, user_id: 1, joined_at: new Date().toISOString() }, // Admin in Chat 2
    { room_id: 2, user_id: 2, joined_at: new Date().toISOString() }  // Ristoratore1 in Chat 2
  ],
  chat_messages: [
    {
      id: 1,
      sender_id: 2, // Ristoratore1
      recipient_id: 3, // Lavoratore1 (for private chat, or null if room_id is for group)
      room_id: '1', // Assuming room_id is a string as per schema, or could be integer
      message: 'Ciao, sei disponibile per un colloquio?',
      timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
      is_read: 0
    },
    {
      id: 2,
      sender_id: 3, // Lavoratore1
      recipient_id: 2, // Ristoratore1
      room_id: '1',
      message: 'Buongiorno, certo! Quando?',
      timestamp: new Date(Date.now() - 1000 * 60 * 3).toISOString(), // 3 minutes ago
      is_read: 0
    },
    {
      id: 3,
      sender_id: 1, // Admin
      recipient_id: null,
      room_id: '2', // Group chat
      message: 'Team, meeting alle 15:00.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
      is_read: 0
    }
  ],
  offerte: [
    {
      id: 1,
      title: 'Cameriere Esperto Cercasi',
      role: JSON.stringify(['Cameriere']), // Storing as JSON string for array
      description: 'Ristorante stellato cerca cameriere con almeno 3 anni di esperienza.',
      city: 'Milano',
      region: 'Lombardia',
      restaurant_type: 'Fine Dining',
      job_type: 'Tempo Pieno',
      start_date: '2025-06-01',
      end_date: '2025-12-31',
      salary: '1800 EUR/mese',
      imageUrl: 'http://example.com/image1.jpg',
      user_id: 2, // Ristoratore1
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      title: 'Aiuto Cuoco Stagionale',
      role: JSON.stringify(['Aiuto Cuoco', 'Lavapiatti']), // Storing as JSON string for array
      description: 'Pizzeria cerca aiuto cuoco per la stagione estiva. Anche prima esperienza.',
      city: 'Napoli',
      region: 'Campania',
      restaurant_type: 'Pizzeria',
      job_type: 'Stagionale',
      start_date: '2025-07-01',
      end_date: '2025-09-30',
      salary: '1200 EUR/mese',
      imageUrl: 'http://example.com/image2.jpg',
      user_id: 2, // Ristoratore1
      created_at: new Date().toISOString()
    }
  ]
};

// Mock data for session.db
const sessionDb = {
  preferences: [
    {
      id: 1,
      user_id: 3, // Lavoratore1
      country: 'Italia',
      city: 'Milano,Roma', // Comma-separated string
      start_date: '2025-06-01',
      end_date: '2026-01-01',
      job_type: JSON.stringify(['Cameriere', 'Barista']), // Storing as JSON string for array
      restaurant_type: 'Tutti',
      preference_name: 'Lavoro Nord Italia'
    },
    {
      id: 2,
      user_id: 3, // Lavoratore1
      country: 'Italia',
      city: 'Napoli',
      start_date: '2025-07-01',
      end_date: '2025-09-30',
      job_type: JSON.stringify(['Aiuto Cuoco']), // Storing as JSON string for array
      restaurant_type: 'Pizzeria',
      preference_name: 'Stagione Sud'
    }
  ]
};

// Simulate the database connections and provide methods to access data (very simplified)
// In a real test setup, you might use a library like 'sqlite3' in-memory or a more sophisticated mock.
const mockDatabases = {
  mainDB: {
    get: (query, params, callback) => {
      // Simplified: Implement basic GET logic based on query type if needed for testing
      if (query.includes('SELECT * FROM userss WHERE email = ?') && params.length === 1) {
        const user = mainDb.userss.find(u => u.email === params[0]);
        callback(null, user);
      } else if (query.includes('SELECT * FROM userss WHERE id = ?') && params.length === 1) {
        const user = mainDb.userss.find(u => u.id === params[0]);
        callback(null, user);
      }
      // Add more specific handlers as needed by your tests
      else {
        console.warn(`mockDatabases.mainDB.get unhandled query: ${query}`);
        callback(null, undefined); // Or an error
      }
    },
    run: (query, params, callback) => {
      // Simplified: Log the query, or implement basic INSERT/UPDATE logic for testing
      console.log(`mockDatabases.mainDB.run: ${query}`, params);
      if (query.startsWith('INSERT INTO userss')) {
        const newUser = {
          id: mainDb.userss.length + 100, // ensure unique ID for mock
          email: params[0],
          telefono: params[1] || '',
          data_nascita: params[2] || '',
          citta: params[3] || '',
          ruolo: params[4] || 'lavoratore',
          password: params[5] || ''
        };
        mainDb.userss.push(newUser);
        if (callback) callback.call({ lastID: newUser.id }, null); // Simulate lastID
      } else if (callback) {
        callback(null);
      }
    },
    all: (query, params, callback) => {
        // Simplified: Implement basic ALL logic
        if (query.includes('SELECT * FROM offerte')) {
            // Basic filter simulation (extend as needed)
            let results = [...mainDb.offerte];
            // Example: if query had "WHERE city = ?"
            // const cityParamIndex = query.toLowerCase().indexOf("city = ?");
            // if (cityParamIndex > -1 && params.length > 0) {
            //   results = results.filter(offer => offer.city.toLowerCase() === params[PARAM_INDEX_FOR_CITY].toLowerCase());
            // }
            callback(null, results);
        } else if (query.includes('SELECT * FROM userss')) {
            callback(null, [...mainDb.userss]);
        }
        // Add more specific handlers
        else {
            console.warn(`mockDatabases.mainDB.all unhandled query: ${query}`);
            callback(null, []);
        }
    },
    // Raw data for direct access if needed for setup or more complex mocks
    _rawData: mainDb
  },
  sessionDB: {
    get: (query, params, callback) => {
      if (query.includes('SELECT * FROM preferences WHERE user_id = ? AND id = ?')) {
        const pref = sessionDb.preferences.find(p => p.user_id === params[0] && p.id === params[1]);
        callback(null, pref);
      } else {
        console.warn(`mockDatabases.sessionDB.get unhandled query: ${query}`);
        callback(null, undefined);
      }
    },
    all: (query, params, callback) => {
        if (query.includes('SELECT * FROM preferences WHERE user_id = ?')) {
            const prefs = sessionDb.preferences.filter(p => p.user_id === params[0]);
            callback(null, prefs);
        } else {
            console.warn(`mockDatabases.sessionDB.all unhandled query: ${query}`);
            callback(null, []);
        }
    },
    run: (query, params, callback) => {
      console.log(`mockDatabases.sessionDB.run: ${query}`, params);
      if (query.startsWith('INSERT INTO preferences')) {
        const newPref = {
            id: sessionDb.preferences.length + 100,
            user_id: params[0],
            country: params[1],
            city: params[2],
            start_date: params[3],
            end_date: params[4],
            job_type: params[5],
            restaurant_type: params[6],
            preference_name: params[7] || 'Default'
        };
        sessionDb.preferences.push(newPref);
        if (callback) callback.call({ lastID: newPref.id }, null);
      } else if (callback) {
        callback(null);
      }
    },
    _rawData: sessionDb
  }
};

module.exports = mockDatabases;

/*

Example (conceptual, using Jest):
jest.mock('sqlite3', () => {
  const mockDb = require('./path/to/dbMock'); // Adjust path
  const verbose = jest.fn().mockReturnThis();
  const Database = jest.fn((dbName, callback) => {
    if (dbName === 'database.db') {
      if (callback) callback(null);
      return mockDb.mainDB;
    }
    if (dbName === 'session.db') {
      if (callback) callback(null);
      return mockDb.sessionDB;
    }
    if (callback) callback(new Error('Unknown DB'));
    return {};
  });
  return { Database, verbose, OPEN_READWRITE: jest.fn(), OPEN_CREATE: jest.fn() };
});
*/