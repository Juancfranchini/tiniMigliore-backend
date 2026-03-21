const http = require('http');

const data = JSON.stringify({
  branding: {
    businessName: "Tini Migliore Testing Update",
  },
  contact: {
    instagramUrl: "https://instagram.com/tinimigliore_test",
    whatsappUrl: "54911223344"
  },
  checkout: {
    defaultShippingFee: 1500,
    pickupEnabled: false
  }
});

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/settings',
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log(`STATUS: ${res.statusCode}\nBODY: ${body}`));
});

req.write(data);
req.end();
