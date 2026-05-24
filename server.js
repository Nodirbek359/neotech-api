const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Ma'lumotlar bazasiga ulanish
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Test uchun API
app.get('/', (req, res) => {
    res.send('Neotech API ishlayapti!');
});

// 1. Foydalanuvchini tekshirish API (YANGI)
app.get('/api/check-user/:telegram_id', async (req, res) => {
    const { telegram_id } = req.params;
    try {
        const query = 'SELECT secret_key FROM scanned_users WHERE telegram_id = $1 ORDER BY id DESC LIMIT 1';
        const result = await pool.query(query, [telegram_id]);
        
        if (result.rows.length > 0) {
            res.status(200).json({ success: true, secret: result.rows[0].secret_key });
        } else {
            res.status(404).json({ success: false, message: 'Ma\'lumot topilmadi' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 2. Ma'lumotni saqlash uchun API
app.post('/api/save-scan', async (req, res) => {
    const { telegram_id, qr_secret, scanned_at } = req.body;

    try {
        const query = `
            INSERT INTO scanned_users (telegram_id, secret_key, scanned_at) 
            VALUES ($1, $2, $3) RETURNING *;
        `;
        const values = [telegram_id, qr_secret, scanned_at];
        
        const result = await pool.query(query, values);
        res.status(200).json({ success: true, message: 'Ma\'lumot saqlandi', data: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server xatosi', error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server ${PORT}-portda ishga tushdi`);
});
