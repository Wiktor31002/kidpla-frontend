const API_URL = 'https://kidpla-api-backend.onrender.com'; 

let cart = []; 

function checkAuth() {
    const token = localStorage.getItem('kidpla_token');
    const role = localStorage.getItem('kidpla_role');

    if (token) {
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('auth-info').innerText = `Zalogowano jako: ${role.toUpperCase()}`;
        
        if(role === 'wlasciciel' || role === 'admin') {
            document.getElementById('owner-section').classList.remove('hidden');
            document.getElementById('client-section').classList.add('hidden');
            fetchProviderOrders(); 
        } else {
            document.getElementById('owner-section').classList.add('hidden');
            document.getElementById('client-section').classList.remove('hidden');
            fetchServices(''); 
            fetchClientEvents(); // <-- DODAJ TO!
        }
    } else {
        document.getElementById('login-section').classList.remove('hidden');
        document.getElementById('owner-section').classList.add('hidden');
        document.getElementById('client-section').classList.add('hidden');
        document.getElementById('auth-info').innerText = "Nie jesteś zalogowany.";
    }
}

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

document.querySelectorAll('.logout-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        localStorage.removeItem('kidpla_token');
        localStorage.removeItem('kidpla_role');
        cart = []; 
        updateCartUI();
        checkAuth();
    });
});

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

window.addToCart = function(id, name, price) {
    if(cart.find(item => item.id === id)) return alert("Ta usługa jest już w koszyku!");
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

window.checkout = async function() {
    const date = document.getElementById('event-date').value;
    const time = document.getElementById('event-time').value;
    const hasOwnVenue = document.getElementById('event-venue').checked;
    const token = localStorage.getItem('kidpla_token');

    if(!date || !time) return alert("Musisz wybrać datę i godzinę imprezy!");

    const serviceIds = cart.map(item => item.id);
    const payload = { date: date, time: time, has_own_venue: hasOwnVenue, service_ids: serviceIds };

    try {
        const res = await fetch(`${API_URL}/event`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert("🎉 ZAMÓWIENIE PRZYJĘTE! Usługodawcy otrzymali powiadomienia.");
            cart = []; 
            updateCartUI();
        } else {
            const err = await res.json();
            alert("Błąd: " + err.error);
        }
    } catch(e) {
        alert("Błąd połączenia z serwerem.");
    }
}

// --- ZLECENIA WŁAŚCICIELA ---
async function fetchProviderOrders() {
    const token = localStorage.getItem('kidpla_token');
    try {
        const res = await fetch(`${API_URL}/provider/orders`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            const orders = await res.json();
            const list = document.getElementById('provider-orders-list');
            
            if (orders.length === 0) {
                list.innerHTML = '<i>Brak zleceń. Czekaj na klientów!</i>';
                return;
            }
            
            let html = '';
            orders.forEach(o => {
                let statusColor = o.status === 'oczekujace' ? '#ffc107' : (o.status === 'zaakceptowane' ? '#20c997' : '#ff6b6b');
                
                html += `
                <div class="service-card" style="border-left: 5px solid ${statusColor};">
                    <div class="service-info">
                        <h3>Usługa: ${o.service_name}</h3>
                        <p>📅 <b>${o.date}</b> o ⏰ <b>${o.time}</b></p>
                        <p>Status: <b style="color:${statusColor}">${o.status.toUpperCase()}</b></p>
                    </div>
                    ${o.status === 'oczekujace' ? `
                    <div class="btn-group">
                        <button class="btn-green" onclick="updateOrderStatus(${o.item_id}, 'zaakceptowane')">Akceptuj</button>
                        <button class="btn-red" onclick="updateOrderStatus(${o.item_id}, 'odrzucone')">Odrzuć</button>
                    </div>
                    ` : ''}
                </div>
                `;
            });
            list.innerHTML = html;
        }
    } catch(e) {
        document.getElementById('provider-orders-list').innerHTML = "Błąd łączenia z serwerem. Odśwież stronę.";
    }
}

window.updateOrderStatus = async function(itemId, newStatus) {
    const token = localStorage.getItem('kidpla_token');
    const res = await fetch(`${API_URL}/provider/orders/${itemId}`, {
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
    });
    
    if (res.ok) {
        alert(`Zlecenie zostało: ${newStatus}!`);
        fetchProviderOrders(); 
    }
}

// --- PANEL HISTORII KLIENTA ---

async function fetchClientEvents() {
    const token = localStorage.getItem('kidpla_token');
    const res = await fetch(`${API_URL}/client/events`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (res.ok) {
        const events = await res.json();
        const list = document.getElementById('client-events-list');
        
        if (events.length === 0) {
            list.innerHTML = '<i>Nie masz jeszcze żadnych rezerwacji. Zaplanuj coś!</i>';
            return;
        }
        
        let html = '';
        events.forEach(ev => {
            html += `
            <div class="card" style="border: 1px solid #ddd; background: #fff;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h3>Impreza #${ev.event_id} - ${ev.date} o ${ev.time}</h3>
                    <span>${ev.has_own_venue ? '🏠 Miejsce własne' : '🎪 Rezerwacja sali'}</span>
                </div>
                <div style="margin-top:10px;">
                    ${ev.items.map(item => {
                        let statusColor = item.status === 'oczekujace' ? '#ffc107' : (item.status === 'zaakceptowane' ? '#20c997' : '#ff6b6b');
                        return `
                        <div style="display:flex; justify-content:space-between; padding: 5px 0; border-bottom: 1px solid #eee;">
                            <span>${item.service_name}</span>
                            <b style="color:${statusColor}">${item.status.toUpperCase()}</b>
                        </div>
                        `;
                    }).join('')}
                </div>
            </div>
            `;
        });
        list.innerHTML = html;
    }
}

// Start
checkAuth();