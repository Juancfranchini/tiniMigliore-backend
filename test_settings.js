require('dotenv').config({ path: 'c:/Users/Juan Cruz IT Oeste/OneDrive/Desktop/jc/react/tiniMigliore-backend/.env' });
const express = require('express');
const app = express();
app.use(express.json());

const settingsRouter = require('c:/Users/Juan Cruz IT Oeste/OneDrive/Desktop/jc/react/tiniMigliore-backend/routes/settings');
app.use('/api/settings', settingsRouter);

const server = app.listen(3456, async () => {
  console.log('Test server running on port 3456');
  
  // Wait a bit for initialization
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  try {
    // 1. Test GET /api/settings
    console.log('\n--- GET /api/settings ---');
    let res = await fetch('http://localhost:3456/api/settings');
    let data = await res.json();
    console.log(JSON.stringify(data, null, 2));

    // 2. Test PUT /api/settings/branding.businessName
    console.log('\n--- PUT /api/settings/branding.businessName ---');
    res = await fetch('http://localhost:3456/api/settings/branding.businessName', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 'Tini Migliore Updated' })
    });
    data = await res.json();
    console.log(data);

    // 3. Test GET /api/settings/branding.businessName
    console.log('\n--- GET /api/settings/branding.businessName ---');
    res = await fetch('http://localhost:3456/api/settings/branding.businessName');
    data = await res.json();
    console.log(data);

  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    server.close();
    process.exit(0);
  }
});
