const http = require('http');

const request = (options, data) => {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if(res.statusCode >= 200 && res.statusCode < 300) {
                    try { resolve(JSON.parse(body)); } 
                    catch(e) { resolve(body); }
                } else {
                    reject(new Error(`Status ${res.statusCode}: ${body}`));
                }
            });
        });
        req.on('error', reject);
        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
};

async function testOrders() {
    try {
        console.log('--- Probando POST /api/orders ---');
        const orderData = {
            buyer_name: 'Juan Perez',
            buyer_phone: '1123456789',
            buyer_email: 'juan@example.com',
            delivery_method: 'delivery',
            shipping_fee: 500,
            shipping_cost_to_remis: 400,
            address_street: 'Calle Falsa',
            address_number: '123',
            items: [
                { product_id: 1, product_name: 'Producto A', unit_price: 1000, quantity: 2 },
                { product_id: 2, product_name: 'Producto B', unit_price: 500, quantity: 1 }
            ]
        };

        const postResult = await request({
            hostname: 'localhost',
            port: 3000,
            path: '/api/orders',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, orderData);
        console.log('POST Result:', postResult);
        const orderId = postResult.order.id;

        console.log('\n--- Probando GET /api/orders ---');
        const getResult = await request({
            hostname: 'localhost',
            port: 3000,
            path: '/api/orders',
            method: 'GET'
        });
        console.log('GET Result (total):', getResult.length, 'orders');

        console.log(`\n--- Probando GET /api/orders/${orderId} ---`);
        const getByIdResult = await request({
            hostname: 'localhost',
            port: 3000,
            path: `/api/orders/${orderId}`,
            method: 'GET'
        });
        console.log('GET By ID Result:', getByIdResult.order_number, 'Items:', getByIdResult.items.length);

        console.log(`\n--- Probando PUT /api/orders/${orderId}/status ---`);
        const putResult = await request({
            hostname: 'localhost',
            port: 3000,
            path: `/api/orders/${orderId}/status`,
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        }, { status: 'PREPARING' });
        console.log('PUT Result:', putResult.order.status);

        console.log('\nTodas las pruebas pasaron ✅');
    } catch (e) {
        console.error('Error durante la prueba:', e.message);
    }
}

testOrders();
