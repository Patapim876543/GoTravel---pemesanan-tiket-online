const http = require('node:http');

const url = 'http://localhost:3000/tickets?transport_type=kereta&origin=Malang&destination=Surabaya&date=2026-06-10';

http.get(url, (res) => {
  console.log('Status code:', res.statusCode);
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('HTML Length:', data.length);
    console.log('Sample content includes "Memuat daftar tiket":', data.includes('Memuat daftar tiket'));
  });
}).on('error', (err) => {
  console.error('Error fetching page:', err.message);
});
