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

// 1. Foydalanuvchiga tegishli BARCHA secret keylarni olish (Ruyxat shaklida)
app.get('/api/get-user-secrets/:telegram_id', async (req, res) => {
    const { telegram_id } = req.params;
    try {
        // LIMIT 1 ni olib tashladik, endi barcha yozuvlar qaytadi
        const query = 'SELECT secret_key FROM scanned_users WHERE telegram_id = $1';
        const result = await pool.query(query, [telegram_id]);
        
        if (result.rows.length > 0) {
            // Secret keylar ro'yxatini massiv qilib qaytaramiz
            const secrets = result.rows.map(row => row.secret_key);
            res.status(200).json({ success: true, secrets: secrets });
        } else {
            // Ma'lumot topilmasa ham 200 qaytaramiz, lekin bo'sh massiv bilan
            res.status(200).json({ success: true, secrets: [] });
        }
    } catch (err) {
        console.error("Bazadan o'qishda xatolik:", err);
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
        console.error("Bazaga saqlashda xatolik:", err);
        res.status(500).json({ success: false, message: 'Server xatosi', error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server ${PORT}-portda ishga tushdi`);
});
