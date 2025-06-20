// Environment mapping
const ENV = {
  dev: 'https://dev-interop.quicksetcloud.com',
  staging: 'https://stg-interop.quicksetcloud.com',
  prod: 'https://interop.quicksetcloud.com'
};

// Utility: load/save session data
function save(key, value) { sessionStorage.setItem(key, JSON.stringify(value)); }
function load(key) { const v = sessionStorage.getItem(key); return v ? JSON.parse(v) : null; }
function clearSession() { sessionStorage.clear(); location.reload(); }

// On load: restore or init environment
const envSelect = document.getElementById('envSelect');
envSelect.value = load('env') || 'dev';
save('env', envSelect.value);
envSelect.onchange = () => { save('env', envSelect.value); };

// Sections
const loginSection = document.getElementById('loginSection');
const tokenSection = document.getElementById('tokenSection');
const devicesSection = document.getElementById('devicesSection');

// Login
document.getElementById('loginForm').onsubmit = async e => {
  e.preventDefault();
  const form = Object.fromEntries(new FormData(e.target));
  save('creds', form);
  await fetchAccessToken();
};

// Fetch Access Token
async function fetchAccessToken() {
  const base = ENV[load('env')];
  const { tenantId, clientId, secret, userName, password } = load('creds');
  const res = await fetch(`${base}/api/tenants/${tenantId}/users/accounts/accesstoken`, {
    method: 'POST',
    headers: { 'Content-Type':'application/json', clientId, secret },
    body: JSON.stringify({ userName, password })
  });
  const data = await res.json();
  save('token', data.accessToken);
  save('refresh', data.refreshToken);
  document.getElementById('tokenDisplay').textContent = data.accessToken;
  loginSection.classList.add('hidden');
  tokenSection.classList.remove('hidden');
  devicesSection.classList.remove('hidden');
}

// Refresh Token
document.getElementById('refreshTokenBtn').onclick = async () => {
  const base = ENV[load('env')];
  const { tenantId, clientId, secret } = load('creds');
  const refreshToken = load('refresh');
  const res = await fetch(`${base}/api/tenants/${load('creds').tenantId}/users/accounts/refreshtoken`, {
    method:'POST', headers:{ 'Content-Type':'application/json', clientId, secret },
    body: JSON.stringify({ refreshToken })
  });
  const data = await res.json();
  save('token', data.accessToken);
  save('refresh', data.refreshToken);
  document.getElementById('tokenDisplay').textContent = data.accessToken;
};

document.getElementById('clearSessionBtn').onclick = clearSession;

// Fetch Devices
document.getElementById('fetchDevicesBtn').onclick = async () => {
  const base = ENV[load('env')];
  const { tenantId, ownerId, masterId } = load('creds');
  const token = load('token');
  const url = `${base}/api/tenants/${tenantId}/owners/${ownerId}/hosts/${masterId}/devices?includeVersions=true&includeAddresses=true&includeResources=true`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const devices = await res.json();
  renderDeviceCards(devices);
};

// Render Device Cards
function renderDeviceCards(devices) {
  const container = document.getElementById('devicesContainer');
  container.innerHTML = '';
  devices.forEach(dev => {
    const card = document.createElement('div'); card.className = 'card';
    card.innerHTML = `
      <h3>${dev.brand} - ${dev.model}</h3>
      <p>Type: ${dev.type}</p>
      <p>Status: ${dev.online ? 'Online' : 'Offline'}</p>
      <button class="widgetBtn">Widget</button>
    `;
    card.querySelector('.widgetBtn').onclick = () => openWidget(dev);
    container.appendChild(card);
  });
}

// Modal Widget
const modal = document.getElementById('modal');
const widgetContent = document.getElementById('widgetContent');
document.getElementById('closeModal').onclick = () => modal.classList.add('hidden');

function openWidget(device) {
  widgetContent.innerHTML = `<h2>Resources for ${device.model}</h2>`;
  device.resources.forEach(res => {
    const div = document.createElement('div');
    div.innerHTML = `<strong>${res.type}</strong>`;
    res.properties?.forEach(prop => {
      const input = document.createElement('input');
      input.value = prop.value;
      input.disabled = res.access === 'r';
      div.appendChild(input);
    });
    widgetContent.appendChild(div);
  });
  modal.classList.remove('hidden');
