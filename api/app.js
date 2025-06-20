// Wrap all logic after DOM loads to ensure elements exist
window.addEventListener('DOMContentLoaded', () => {
  // Environment mapping
  const ENV = {
    dev: 'https://dev-interop.quicksetcloud.com',
    staging: 'https://stg-interop.quicksetcloud.com',
    prod: 'https://interop.quicksetcloud.com'
  };

  // Utility: load/save session data
  const save = (key, value) => sessionStorage.setItem(key, JSON.stringify(value));
  const load = key => {
    const v = sessionStorage.getItem(key);
    return v ? JSON.parse(v) : null;
  };
  const clearSession = () => { sessionStorage.clear(); location.reload(); };

  // Elements
  const envSelect = document.getElementById('envSelect');
  const loginSection = document.getElementById('loginSection');
  const tokenSection = document.getElementById('tokenSection');
  const devicesSection = document.getElementById('devicesSection');
  const modal = document.getElementById('modal');
  const closeModalBtn = document.getElementById('closeModal');

  // Initialize environment
  envSelect.value = load('env') || 'dev';
  save('env', envSelect.value);
  envSelect.addEventListener('change', () => save('env', envSelect.value));

  // Login form
  document.getElementById('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const formValues = Object.fromEntries(new FormData(e.target));
    save('creds', formValues);
    await fetchAccessToken();
  });

  // Fetch Access Token
  async function fetchAccessToken() {
    const base = ENV[load('env')];
    const { tenantId, clientId, secret, userName, password } = load('creds');
    const res = await fetch(`${base}/api/tenants/${tenantId}/users/accounts/accesstoken`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', clientId, secret },
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
  document.getElementById('refreshTokenBtn').addEventListener('click', async () => {
    const base = ENV[load('env')];
    const { tenantId, clientId, secret } = load('creds');
    const refreshToken = load('refresh');
    const res = await fetch(
      `${base}/api/tenants/${tenantId}/users/accounts/refreshtoken`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', clientId, secret },
        body: JSON.stringify({ refreshToken })
      }
    );
    const data = await res.json();
    save('token', data.accessToken);
    save('refresh', data.refreshToken);
    document.getElementById('tokenDisplay').textContent = data.accessToken;
  });

  document.getElementById('clearSessionBtn').addEventListener('click', clearSession);

  // Fetch Devices
  document.getElementById('fetchDevicesBtn').addEventListener('click', async () => {
    const base = ENV[load('env')];
    const { tenantId, ownerId, masterId } = load('creds');
    const token = load('token');
    const url =
      `${base}/api/tenants/${tenantId}/owners/${ownerId}/hosts/${masterId}/devices?includeVersions=true&includeAddresses=true&includeResources=true`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const devices = await res.json();
    renderDeviceCards(devices);
  });

  // Render Device Cards
  function renderDeviceCards(devices) {
    const container = document.getElementById('devicesContainer');
    container.innerHTML = '';
    devices.forEach(dev => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <h3>${dev.brand} - ${dev.model}</h3>
        <p>Type: ${dev.type}</p>
        <p>Status: ${dev.online ? 'Online' : 'Offline'}</p>
        <button class="widgetBtn">Widget</button>
      `;
      card.querySelector('.widgetBtn').addEventListener('click', () => openWidget(dev));
      container.appendChild(card);
    });
  }

  // Modal behaviors
  closeModalBtn.addEventListener('click', () => modal.classList.add('hidden'));
  modal.addEventListener('click', e => {
    if (e.target === modal) modal.classList.add('hidden');
  });

  // Open Widget
  function openWidget(device) {
    const widgetContent = document.getElementById('widgetContent');
    widgetContent.innerHTML = `<h2>Resources for ${device.model}</h2>`;
    device.resources.forEach(res => {
      const div = document.createElement('div');
      div.innerHTML = `<strong>${res.type}</strong>`;
      res.properties?.forEach(prop => {
        const input = document.createElement('input');
        input.value = prop.value;
        if (res.access === 'r') input.disabled = true;
        div.appendChild(input);
      });
      widgetContent.appendChild(div);
    });
    modal.classList.remove('hidden');
  }
});
