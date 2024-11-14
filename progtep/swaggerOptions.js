// swaggerOptions.js
const swaggerJsDoc = require('swagger-jsdoc');

const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'API di Registrazione e Login',
            version: '1.0.0',
            description: 'API per la gestione della registrazione e del login degli utenti',
            contact: {
                name: 'Nome dello sviluppatore',
                url: 'http://tuosito.com',
                email: 'tuoemail@esempio.com'
            }
        },
        servers: [
            {
                url: 'http://37.27.91.38:3000',
                description: 'Server di sviluppo'
            }
        ]
    },
    apis: ['./server.js'] // Percorso del file server.js per le annotazioni
};

module.exports = swaggerJsDoc(swaggerOptions);
