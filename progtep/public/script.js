document.getElementById('login-form').addEventListener('submit', function(event) {
    event.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.redirect) {
            window.location.href = data.redirect;
        } else {
            document.getElementById('message').textContent = data.message;
        }
    });
});



document.getElementById('register-form').addEventListener('submit', function(event) {
    event.preventDefault();
    
    const nome = document.getElementById('register-nome').value;
    const email = document.getElementById('register-email').value;
    const citta = document.getElementById('register-citta').value;
    const titolo_studio = document.getElementById('register-titolo').value;
    const password = document.getElementById('register-password').value;

    fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, citta, titolo_studio, password })
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById('message').textContent = data.message;
        if (data.message === 'Registrazione completata') {
            document.getElementById('register-form').reset();
        }
    });
});

// Mostra il modulo di registrazione
document.getElementById('show-register').addEventListener('click', function(event) {
    event.preventDefault();
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('login-title').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
    document.getElementById('register-title').style.display = 'block';
});

document.getElementById('show-login').addEventListener('click', function(event) {
    event.preventDefault();
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('register-title').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('login-title').style.display = 'block';
});

