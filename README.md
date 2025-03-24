# RestMatch
# Guida all'Installazione di RestMatch con Docker

Questa guida ti aiuterà a configurare e avviare RestMatch utilizzando Docker su Windows, macOS o Linux. Segui attentamente i passaggi per installare i software necessari e avviare l'applicazione.

---

## Requisiti Preliminari

Prima di iniziare, assicurati di avere:

- Un computer con Windows, macOS o Linux.
- **Git**, necessario per clonare la repository del progetto.
- **Docker e Docker Compose**, per eseguire i container.
- Un file **.env** con le credenziali API richieste (Google OAuth).

---

## Installazione di Git

Git è un sistema di controllo versione essenziale per scaricare il codice del progetto.

### Windows

1. Scarica l'installer da [git-scm.com](https://git-scm.com/download/win).
2. Esegui l'installazione lasciando le opzioni predefinite.

### Linux (Ubuntu)

Esegui il seguente comando nel terminale:

```bash
sudo apt update && sudo apt install git
```

### macOS

Metodo consigliato: Installa tramite Homebrew:

```bash
brew install git
```

Alternativa: Scarica l'installer da [git-scm.com](https://git-scm.com/download/mac).

Se hai Xcode, puoi installarlo con:

```bash
xcode-select --install
```

### Verifica dell'installazione

Apri un terminale e digita:

```bash
git --version
```

Dovresti vedere il numero di versione installato.

### Clonazione della repository

Scarica il codice sorgente di RestMatch con i seguenti comandi:

```bash
git clone https://github.com/quartifabrizio/RestMatch.git
cd RestMatch
cd progtep
```

---

## Configurazione del file .env

Il file **.env** è essenziale per configurare l'applicazione. Assicurati di crearlo nella cartella del progetto e di sostituire i segnaposto con le tue credenziali.

```ini
GOOGLE_CLIENT_ID=....
GOOGLE_SECRET=.....
```

---

## Installazione di Docker

Docker permette di eseguire l'applicazione in container isolati. Segui le istruzioni per il tuo sistema operativo.

### Windows

1. Scarica Docker Desktop da [docker.com](https://www.docker.com/products/docker-desktop/).
2. Installa e avvia Docker.
3. Verifica l'installazione con:

   ```bash
   docker --version
   ```

### macOS

1. Scarica Docker Desktop da [docker.com](https://www.docker.com/products/docker-desktop/).
2. Installa e avvia Docker.
3. Controlla la versione con:

   ```bash
   docker --version
   ```

### Linux (Ubuntu)

1. Aggiorna il database dei pacchetti:
   ```bash
   sudo apt update
   ```
2. Installa Docker:
   ```bash
   sudo apt install docker.io
   ```
3. Abilita e avvia il servizio:
   ```bash
   sudo systemctl enable --now docker
   ```
4. Verifica l'installazione:
   ```bash
   docker --version
   ```

---

## Installazione di Docker Compose

### Windows e macOS

Docker Compose è incluso in Docker Desktop, quindi non serve installarlo separatamente.

### Linux (Ubuntu)

1. Scarica Docker Compose:
   ```bash
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   ```
2. Rendi eseguibile il file scaricato:
   ```bash
   sudo chmod +x /usr/local/bin/docker-compose
   ```
3. Controlla la versione installata:
   ```bash
   docker-compose --version
   ```

---

## Avvio di RestMatch con Docker

Puoi avviare RestMatch manualmente.

### Avvio manuale

Se preferisci avviare manualmente RestMatch, segui questi passaggi:

1. Apri un terminale e spostati nella cartella del progetto.
2. Esegui il comando:

   ```bash
   docker-compose up --build -d
   ```

---

### Accesso ai Servizi

Dopo l'avvio, puoi accedere ai vari servizi:

- **Backend Node.js**: [http://localhost:3000](http://localhost:3000)
- **Documentazione API**: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
---


# Introduzione
**RestMatch** è una piattaforma che connette ristoratori e personale specializzato nel settore della ristorazione, offrendo ai lavoratori la possibilità di cercare opportunità di lavoro in base alle proprie disponibilità e ai ristoratori l’accesso ai profili di candidati qualificati. Basta inserire i propri dati e preferenze per scoprire, con un semplice click, le opzioni che meglio rispondono alle proprie esigenze. La piattaforma consente inoltre di contattare direttamente i ristoratori e monitorare lo stato della propria candidatura, tutto in un unico spazio.


## Tagline
> La tua piattaforma di job matching per la ristorazione: trova e contatta il personale o il ristoratore perfetto, quando serve e dove serve, tutto in un’unica piattaforma.


## Target
- **Personale con esperienza** alla ricerca di opportunità nella ristorazione.
- **Attività ristorative** che necessitano di personale qualificato.


## Problema
Difficoltà per i lavoratori nel trovare opportunità di lavoro nella ristorazione in linea con le proprie disponibilità e preferenze, e per i ristoratori nel reperire personale qualificato che risponda ai requisiti richiesti.


## Tecnologie
- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express.js
- **API**: RESTful API 
- **Database**: SQLite


## Competitor
- jojolly
- rysto
- restworld
- camerieri.it
- indeed
- hosco
- adecco
- facebook marketplace
- gi group
- randstad


## Requisiti


### Requisiti Funzionali
1. **Database Utenti**: Creazione e gestione di un database per memorizzare i dati degli utenti (ristoratori e lavoratori).
2. **Database Offerte**: Creazione e gestione di un database per le offerte di lavoro, incluse le valutazioni degli utenti.
3. **Ricerca Filtrata dei Ristoratori**: Sistema di ricerca avanzato che consente agli utenti di filtrare i ristoratori in base a criteri come tipo di cucina, valutazioni e disponibilità.
4. **Sistema di Recensioni**: Implementazione di un sistema trasparente e affidabile per le recensioni sui ristoratori da parte degli utenti.
5. **Accesso e Registrazione con Tipi di Account**: Possibilità per l'utente di scegliere tra un account lavoratore o ristoratore durante la registrazione.
6. **Sezione FAQ e Risorse**: Creazione di una sezione con domande frequenti e risorse per aiutare gli utenti a navigare nella piattaforma.
7. **Feedback per i Ristoratori**: Permettere ai ristoratori di rispondere alle recensioni e interagire con i clienti per migliorare la reputazione.
8. **Strumenti di Analisi per i Ristoratori**: Fornire strumenti di analisi per monitorare recensioni, valutazioni medie e tendenze.


### Requisiti Non Funzionali
1. **Sicurezza dei Dati**: Il processo di accesso e registrazione deve essere completamente criptato per proteggere i dati personali.
2. **Prestazioni Elevate**: Il sistema deve essere in grado di restituire i risultati di ricerca in meno di due secondi.
3. **Interfaccia Utente Intuitiva**: L'interfaccia deve essere semplice, intuitiva e facile da usare per migliorare l’esperienza dell’utente.


### Requisiti di Dominio
1. **Gestione degli Utenti**: La piattaforma deve gestire due tipi di utenti, "lavoratori" e "ristoratori", ciascuno con permessi e funzionalità specifiche.
2. **Gestione delle Offerte di Lavoro**: Possibilità per i ristoratori di pubblicare offerte e per i lavoratori di candidarsi.
3. **Valutazioni e Recensioni**: Gli utenti devono poter lasciare valutazioni e recensioni sui ristoratori per favorire la trasparenza e la qualità del servizio.
4. **Autenticità delle Recensioni**: Il sistema di recensioni deve essere affidabile e garantire che le recensioni siano autentiche.
5. **Comunicazione Diretta**: Una chat facile e intuitiva per migliorare la comunicazione tra ristoratori e lavoratori.
6. **Analisi delle Performance dei Ristoratori**: I ristoratori devono poter visualizzare l’andamento delle proprie performance e tendenze per prendere decisioni strategiche.


## Diagramma UML
- Visualizza il diagramma dei casi d'uso: ![Casi d'Uso RestMatch](https://yuml.me/47f2c177.svg)
