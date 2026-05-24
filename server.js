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

// 1. Foydalanuvchiga tegishli faqat NOYOB (unique) secret keylarni olish
app.get('/api/get-user-secrets/:telegram_id', async (req, res) => {
    const { telegram_id } = req.params;
    try {
        // DISTINCT kalit so'zi dublikatlarni (takrorlanuvchi yozuvlarni) olib tashlaydi
        const query = 'SELECT DISTINCT secret_key FROM scanned_users WHERE telegram_id = $1';
        const result = await pool.query(query, [telegram_id]);
        
        const secrets = result.rows.map(row => row.secret_key);
        res.status(200).json({ success: true, secrets: secrets });
    } catch (err) {
        console.error("Bazadan o'qishda xatolik:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// 2. Ma'lumotni saqlash uchun API
app.post('/api/save-scan', async (req, res) => {
    const { telegram_id, qr_secret, scanned_at } = req.body;

    try {
        // Avval bu kalit shu foydalanuvchida borligini tekshiramiz (dublikat yozmaslik uchun)
        const checkQuery = 'SELECT 1 FROM scanned_users WHERE telegram_id = $1 AND secret_key = $2';
        const checkResult = await pool.query(checkQuery, [telegram_id, qr_secret]);

        if (checkResult.rows.length > 0) {
            return res.status(200).json({ success: true, message: 'Bu kalit allaqachon mavjud' });
        }

        // Agar bo'lmasa, yangisini qo'shamiz
        const insertQuery = `
            INSERT INTO scanned_users (telegram_id, secret_key, scanned_at) 
            VALUES ($1, $2, $3) RETURNING *;
        `;
        const result = await pool.query(insertQuery, [telegram_id, qr_secret, scanned_at]);
        
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
