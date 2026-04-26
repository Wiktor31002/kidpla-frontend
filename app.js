const API_URL = 'https://kidpla-api-backend.onrender.com';
// STAN APLIKACJI (Koszyk)
let cart = []; 

// 1. SPRAWDZANIE ZALOGOWANIA
function checkAuth() {
    const token = localStorage.getItem('kidpla_token');
    const role = localStorage.getItem('kidpla_role');

    if (token) {
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('auth-info').innerText = `Zalogowano jako: ${role.toUpperCase()}`;
        
        if(role === 'wlasciciel' || role === 'admin') {
            document.getElementById('owner-section').classList.remove('hidden');
            document.getElementById('client-section').classList.add('hidden');
        } else {
            document.getElementById('owner-section').classList.add('hidden');
            document.getElementById('client-section').classList.remove('hidden');
            fetchServices(''); // Ładujemy usługi po zalogowaniu klienta
        }
    } else {
        document.getElementById('login-section').classList.remove('hidden');
        document.getElementById('owner-section').classList.add('hidden');
        document.getElementById('client-section').classList.add('hidden');
        document.getElementById('auth-info').innerText = "Nie jesteś zalogowany.";
    }
}

// 2. REJESTRACJA
document.getElementById('btn-register').addEventListener('click', async function() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const role = document.getElementById('login-role').value;

    if(!email || !password) return alert("Podaj email i hasło!");

    const res = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role })
    });
    const data = await res.json();
    alert(data.message || data.error);
});

// 3. LOGOWANIE
document.getElementById('login-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (res.ok) {
        localStorage.setItem('kidpla_token', data.access_token);
        localStorage.setItem('kidpla_role', data.role);
        checkAuth();
    } else {
        alert("Błąd: " + data.error);
    }
});

// 4. WYLOGOWANIE
document.querySelectorAll('.logout-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        localStorage.removeItem('kidpla_token');
        localStorage.removeItem('kidpla_role');
        cart = []; // Czyścimy koszyk przy wylogowaniu!
        updateCartUI();
        checkAuth();
    });
});

// 5. DODAWANIE USŁUGI (Właściciel)
document.getElementById('add-service-form').addEventListener('submit', async function(e) {
    e.preventDefault(); 
    const token = localStorage.getItem('kidpla_token');

    const newService = {
        name: document.getElementById('s-name').value,
        category: document.getElementById('s-category').value,
        price: parseFloat(document.getElementById('s-price').value),
        features: document.getElementById('s-features').value.split(',').map(f => f.trim())
    };

    const res = await fetch(`${API_URL}/service`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newService)
    });

    if (res.ok) {
        alert("Usługa dodana do Kidpli!");
        document.getElementById('add-service-form').reset(); 
    } else {
        const err = await res.json();
        alert("Błąd: " + err.error);
    }
});

// 6. POBIERANIE USŁUG (Klient)
window.fetchServices = async function(category = '') {
    const url = category ? `${API_URL}/?category=${category}` : `${API_URL}/`;
    const res = await fetch(url);
    const services = await res.json();
    
    const list = document.getElementById('services-list');
    list.innerHTML = '';

    services.forEach(s => {
        list.innerHTML += `
            <div class="service-card">
                <div class="service-info">
                    <h3>${s.name} <small>(${s.category})</small></h3>
                    <p>Dodatki: ${s.features.join(', ') || 'Brak'}</p>
                </div>
                <div style="display:flex; align-items:center;">
                    <div class="price-tag">${s.price || 0} zł</div>
                    <button class="btn-blue" style="width:auto;" onclick="addToCart(${s.id}, '${s.name}', ${s.price})">Dodaj</button>
                </div>
            </div>
        `;
    });
}

// 7. SYSTEM KOSZYKA
window.addToCart = function(id, name, price) {
    if(cart.find(item => item.id === id)) {
        return alert("Ta usługa jest już w Twoim koszyku!");
    }
    cart.push({ id, name, price });
    updateCartUI();
}

window.removeFromCart = function(id) {
    cart = cart.filter(item => item.id !== id);
    updateCartUI();
}

function updateCartUI() {
    const container = document.getElementById('cart-items');
    const checkoutBtn = document.getElementById('checkout-btn');
    
    if (cart.length === 0) {
        container.innerHTML = '<i>Koszyk jest pusty. Kliknij usługi obok, aby dodać.</i>';
        checkoutBtn.classList.add('disabled');
        checkoutBtn.disabled = true;
        return;
    }

    let html = '';
    let total = 0;
    cart.forEach(item => {
        html += `<div class="cart-item">
                    <span>${item.name}</span>
                    <div>
                        <b>${item.price} zł</b> 
                        <span class="cart-item-remove" onclick="removeFromCart(${item.id})">✖</span>
                    </div>
                 </div>`;
        total += item.price;
    });
    
    html += `<div class="cart-item" style="border-top: 2px solid #ccc; margin-top:10px; padding-top:10px;">
                <b>SUMA:</b> <b style="color:#20c997; font-size:18px;">${total} zł</b>
             </div>`;

    container.innerHTML = html;
    checkoutBtn.classList.remove('disabled');
    checkoutBtn.disabled = false;
}

// 8. FINALIZACJA IMPREZY (Wysłanie do Pythona)
window.checkout = async function() {
    const date = document.getElementById('event-date').value;
    const time = document.getElementById('event-time').value;
    const hasOwnVenue = document.getElementById('event-venue').checked;
    const token = localStorage.getItem('kidpla_token');

    if(!date || !time) return alert("Musisz wybrać datę i godzinę imprezy!");

    // Wyciągamy same ID usług z koszyka
    const serviceIds = cart.map(item => item.id);

    const payload = {
        date: date,
        time: time,
        has_own_venue: hasOwnVenue,
        service_ids: serviceIds
    };

    try {
        const res = await fetch(`${API_URL}/event`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert("🎉 ZAMÓWIENIE PRZYJĘTE! Usługodawcy otrzymali powiadomienia.");
            cart = []; // Czyścimy koszyk
            updateCartUI();
        } else {
            const err = await res.json();
            alert("Błąd: " + err.error);
        }
    } catch(e) {
        alert("Błąd połączenia z serwerem.");
    }
}

// Start
checkAuth();