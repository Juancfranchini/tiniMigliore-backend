const http = require('http');

const data1 = JSON.stringify({
  name: "Duplicate Section",
  slug: "test-section", // Already exists
  order: 6,
  isActive: true
});

const data2 = JSON.stringify({
  name: "Invalid Slug",
  slug: "Invalid Slug!", // Invalid characters
  order: 7,
  isActive: true
});

const sendRequest = (data, cb) => {
  const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/sections',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => cb(res.statusCode, body));
  });
  req.write(data);
  req.end();
};

sendRequest(data1, (status, body) => {
  console.log(`Req 1: ${status} - ${body}`);
  sendRequest(data2, (status2, body2) => {
    console.log(`Req 2: ${status2} - ${body2}`);
  });
});
