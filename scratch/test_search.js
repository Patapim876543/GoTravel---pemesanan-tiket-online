const fetch = require('node:http');

// Helper to make a simple GET request
function get(url, token) {
  return new Promise((resolve, reject) => {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const client = url.startsWith('https') ? require('node:https') : require('node:http');
    const req = client.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
  });
}

async function main() {
  const baseUrl = 'http://localhost:3001/api';
  
  // Try logging in to get token
  const payload = JSON.stringify({
    username: 'admin',
    password: 'password123',
    role: 'admin'
  });
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };
  
  let token = '';
  try {
    const loginRes = await new Promise((resolve, reject) => {
      const req = fetch.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      });
      req.on('error', reject);
      req.write(payload);
      req.end();
    });
    token = loginRes.token || loginRes.data?.token;
    console.log('Login token successfully fetched:', token ? 'YES' : 'NO');
  } catch (e) {
    console.log('Failed to login to local dev server (is it running?):', e.message);
  }

  // If local dev is not running, let's use the production backend URL
  const targetBaseUrl = token ? 'http://localhost:3001/api' : 'https://web-production-17b65.up.railway.app/api';
  
  console.log('Testing search endpoint on:', targetBaseUrl);
  
  // If token is missing, try to login on production
  if (!token) {
    const prodOptions = new URL('https://web-production-17b65.up.railway.app/api/auth/login');
    const https = require('node:https');
    
    try {
      const prodLoginRes = await new Promise((resolve, reject) => {
        const req = https.request(prodOptions, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }, (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => resolve(JSON.parse(data)));
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
      });
      token = prodLoginRes.token || prodLoginRes.data?.token || prodLoginRes.data;
      console.log('Production login token:', token ? 'YES' : 'NO');
    } catch (e) {
      console.log('Failed to login to production backend:', e.message);
    }
  }

  const searchUrl = `${targetBaseUrl}/users/search-tickets?transport_type=kereta&origin=Malang&destination=Surabaya&date=2026-06-10`;
  const res = await get(searchUrl, token);
  console.log('Search response status:', res.status);
  console.log('Search response body:', JSON.stringify(res.body, null, 2));
}

main().catch(console.error);
