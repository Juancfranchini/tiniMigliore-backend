const express = require('express');
const router = express.Router();
const db = require('../db');

// Función helper para generar número de orden
const generateOrderNumber = () => {
    return `ORD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
};

// POST /api/orders
router.post('/', async (req, res) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        
        const {
            buyer_name,
            buyer_phone,
            buyer_email,
            delivery_method,
            delivery_date = null,
            delivery_time_range = null,
            shipping_fee = 0,
            shipping_cost_to_remis = 0,
            address_street = null,
            address_number = null,
            address_apartment = null,
            address_neighborhood = null,
            address_city = null,
            address_state = null,
            address_zip_code = null,
            address_references = null,
            items = []
        } = req.body;

        if (!buyer_name || !buyer_phone || items.length === 0) {
            throw new Error('Faltan datos obligatorios del comprador o artículos');
        }

        // Calculamos los totales
        let net_revenue_excluding_shipping = 0;
        
        // Iteramos los items para calcular el monto neto de los productos
        items.forEach(item => {
            const line_price = item.unit_price * item.quantity;
            net_revenue_excluding_shipping += line_price;
        });

        const order_number = generateOrderNumber();
        const initial_status = 'PENDING';

        const insertOrderText = `
            INSERT INTO orders (
                order_number, buyer_name, buyer_phone, buyer_email, delivery_method, 
                delivery_date, delivery_time_range,
                shipping_fee, shipping_cost_to_remis, net_revenue_excluding_shipping, 
                status, address_street, address_number, address_apartment, 
                address_neighborhood, address_city, address_state, address_zip_code, 
                address_references
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) 
            RETURNING *
        `;

        const insertOrderValues = [
            order_number, buyer_name, buyer_phone, buyer_email || '', delivery_method || 'pickup',
            delivery_date, delivery_time_range,
            shipping_fee, shipping_cost_to_remis, net_revenue_excluding_shipping,
            initial_status, address_street, address_number, address_apartment,
            address_neighborhood, address_city, address_state, address_zip_code, address_references
        ];

        const orderRes = await client.query(insertOrderText, insertOrderValues);
        const newOrder = orderRes.rows[0];

        // Insertamos los items
        const insertItemText = `
            INSERT INTO order_items (
                order_id, product_id, product_name, unit_price, quantity, total_line_price
            ) VALUES ($1, $2, $3, $4, $5, $6)
        `;

        for (const item of items) {
            const total_line_price = item.unit_price * item.quantity;
            await client.query(insertItemText, [
                newOrder.id,
                item.product_id,
                item.product_name,
                item.unit_price,
                item.quantity,
                total_line_price
            ]);
        }

        await client.query('COMMIT');
        res.status(201).json({ success: true, order: newOrder, message: 'Pedido creado exitosamente' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al crear orden:', error);
        res.status(500).json({ success: false, error: 'Hubo un problema al crear el pedido', details: error.message });
    } finally {
        client.release();
    }
});

// GET /api/orders
router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM orders ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener ordenes:', error);
        res.status(500).json({ error: 'Hubo un problema al listar los pedidos', details: error.message });
    }
});

// GET /api/orders/:id
router.get('/:id', async (req, res) => {
    try {
        const orderId = req.params.id;
        const result = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }
        
        const order = result.rows[0];
        
        const itemsResult = await db.query('SELECT * FROM order_items WHERE order_id = $1', [orderId]);
        order.items = itemsResult.rows;

        res.json(order);
    } catch (error) {
        console.error('Error al obtener detalle de orden:', error);
        res.status(500).json({ error: 'Hubo un problema al obtener el pedido', details: error.message });
    }
});

// PUT /api/orders/:id/status
router.put('/:id/status', async (req, res) => {
    try {
        const orderId = req.params.id;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ error: 'El estado es requerido' });
        }

        const result = await db.query(
            'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
            [status, orderId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }

        res.json({ success: true, order: result.rows[0], message: 'Estado del pedido actualizado' });
    } catch (error) {
        console.error('Error al actualizar estado:', error);
        res.status(500).json({ error: 'Hubo un problema al actualizar el estado', details: error.message });
    }
});

module.exports = router;
