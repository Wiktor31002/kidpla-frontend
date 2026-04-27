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
                    <div style="margin-top: 8px;">
                        ${renderBalloons(s.rating)} <small style="color: #888;">(${s.reviews_count} opinii)</small>
                    </div>
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
    const list = document.getElementById('provider-orders-list');
    list.innerHTML = '<i>Sprawdzam zlecenia...</i>'; // Komunikat tymczasowy
    
    try {
        const res = await fetch(`${API_URL}/provider/orders`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            const orders = await res.json();
            
            if (orders.length === 0) {
                list.innerHTML = '<b>Brak zleceń. Czekaj na klientów!</b>'; // <--- TUTAJ JEST TWÓJ NAPIS "BRAK"
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
    const list = document.getElementById('client-events-list');
    list.innerHTML = '<i>Pobieram historię...</i>'; // Komunikat tymczasowy
    
    try {
        const res = await fetch(`${API_URL}/client/events`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            const events = await res.json();
            
            if (events.length === 0) {
                list.innerHTML = '<b>Nie masz jeszcze żadnych rezerwacji. Zaplanuj coś!</b>'; // <--- TUTAJ JEST "BRAK" DLA RODZICA
                return;
            }
            
            let html = '';
            events.forEach(ev => {
                html += `
            <div class="card" style="border: 1px solid #ddd; background: #fff; margin-bottom: 15px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h3>Impreza #${ev.event_id} - ${ev.date} o ${ev.time}</h3>
                    <span>${ev.has_own_venue ? '🏠 Miejsce własne' : '🎪 Rezerwacja sali'}</span>
                </div>
                <div style="margin-top:10px;">
                    ${ev.items.map(item => {
                        let statusColor = item.status === 'oczekujace' ? '#ffc107' : (item.status === 'zaakceptowane' ? '#20c997' : '#ff6b6b');
                        let rateBtn = item.status === 'zaakceptowane' 
                            ? `<button class="btn-blue" style="padding: 2px 8px; font-size: 0.8em; margin-left: 10px;" onclick="openReviewModal(${item.service_id}, '${item.service_name}')">🎈 Oceń</button>` 
                            : '';
                        return `
                        <div style="display:flex; justify-content:space-between; align-items: center; padding: 5px 0; border-bottom: 1px solid #eee;">
                            <span>${item.service_name}</span>
                            <div>
                                <b style="color:${statusColor}">${item.status.toUpperCase()}</b>
                                ${rateBtn}
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
            </div>
            `;
            });
            list.innerHTML = html;
        } else {
            list.innerHTML = '<b>Błąd ładowania historii. Spróbuj ponownie.</b>';
        }
    } catch (e) {
        list.innerHTML = '<b>Błąd łączenia z serwerem. Spróbuj odświeżyć.</b>';
    }
}

// --- SYSTEM BALONIKÓW KIDPLI ---

function renderBalloons(rating) {
    if (rating === 0) return '<span style="color:#aaa; font-size: 0.9em;">Brak baloników 🎈</span>';
    
    let html = '';
    let roundedRating = Math.round(rating);
    
    for(let i = 1; i <= 5; i++) {
        if(i <= roundedRating) {
            html += '<span style="opacity: 1; font-size: 1.3em;">🎈</span>';
        } else {
            html += '<span style="opacity: 0.2; filter: grayscale(100%); font-size: 1.3em;">🎈</span>';
        }
    }
    return `${html} <b style="margin-left: 5px;">${rating.toFixed(1)}</b>`;
}

window.openReviewModal = function(serviceId, serviceName) {
    document.getElementById('review-service-id').value = serviceId;
    document.getElementById('review-service-name').innerText = serviceName;
    document.getElementById('review-modal').style.display = 'flex';
}

window.closeReviewModal = function() {
    document.getElementById('review-modal').style.display = 'none';
    document.getElementById('review-form').reset();
}

document.getElementById('review-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const token = localStorage.getItem('kidpla_token');
    
    const payload = {
        service_id: document.getElementById('review-service-id').value,
        rating: document.getElementById('review-rating').value,
        comment: document.getElementById('review-comment').value
    };

    const res = await fetch(`${API_URL}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
    });

    if(res.ok) {
        alert("🎈 Dziękujemy za opinię! Baloniki zostały dodane.");
        closeReviewModal();
        fetchServices('');
    } else {
        const err = await res.json();
        alert("Błąd: " + err.error);
    }
});

// Start
checkAuth();