const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors()); // CORS muammosini hal qiladi (GitHub Pages dan ulanishga ruxsat beradi)

// Ma'lumotlar bazasiga ulanish (Parol maxfiy o'zgaruvchidan olinadi)
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

// Ma'lumotni saqlash uchun API
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