
// Mappatura regioni-città per l'Italia
const regionCityMapping = {
  "Abruzzo": [
    "L'Aquila",
    "Pescara",
    "Chieti",
    "Teramo"
  ],
  "Basilicata": [
    "Potenza",
    "Matera"
  ],
  "Calabria": [
    "Reggio Calabria",
    "Catanzaro",
    "Cosenza",
    "Crotone",
    "Vibo Valentia"
  ],
  "Campania": [
    "Napoli",
    "Salerno",
    "Caserta",
    "Avellino",
    "Benevento"
  ],
  "Emilia-Romagna": [
    "Bologna",
    "Modena",
    "Parma",
    "Reggio Emilia",
    "Ravenna",
    "Ferrara",
    "Forlì-Cesena",
    "Rimini",
    "Piacenza"
  ],
  "Friuli-Venezia Giulia": [
    "Trieste",
    "Udine",
    "Pordenone",
    "Gorizia"
  ],
  "Lazio": [
    "Roma",
    "Latina",
    "Frosinone",
    "Viterbo",
    "Rieti"
  ],
  "Liguria": [
    "Genova",
    "La Spezia",
    "Savona",
    "Imperia"
  ],
  "Lombardia": [
    "Milano",
    "Brescia",
    "Bergamo",
    "Monza",
    "Como",
    "Varese",
    "Pavia",
    "Cremona",
    "Mantova",
    "Lecco",
    "Lodi",
    "Sondrio"
  ],
  "Marche": [
    "Ancona",
    "Pesaro e Urbino",
    "Macerata",
    "Ascoli Piceno",
    "Fermo"
  ],
  "Molise": [
    "Campobasso",
    "Isernia"
  ],
  "Piemonte": [
    "Torino",
    "Cuneo",
    "Alessandria",
    "Novara",
    "Asti",
    "Vercelli",
    "Biella",
    "Verbano-Cusio-Ossola"
  ],
  "Puglia": [
    "Bari",
    "Taranto",
    "Lecce",
    "Foggia",
    "Brindisi",
    "Barletta-Andria-Trani"
  ],
  "Sardegna": [
    "Cagliari",
    "Sassari",
    "Nuoro",
    "Oristano",
    "Sud Sardegna"
  ],
  "Sicilia": [
    "Palermo",
    "Catania",
    "Messina",
    "Siracusa",
    "Trapani",
    "Agrigento",
    "Ragusa",
    "Caltanissetta",
    "Enna"
  ],
  "Toscana": [
    "Firenze",
    "Pisa",
    "Livorno",
    "Siena",
    "Lucca",
    "Arezzo",
    "Pistoia",
    "Massa-Carrara",
    "Grosseto",
    "Prato"
  ],
  "Trentino-Alto Adige": [
    "Trento",
    "Bolzano"
  ],
  "Umbria": [
    "Perugia",
    "Terni"
  ],
  "Valle d'Aosta": [
    "Aosta"
  ],
  "Veneto": [
    "Venezia",
    "Verona",
    "Padova",
    "Vicenza",
    "Treviso",
    "Rovigo",
    "Belluno"
  ]
};

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
