const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'aura_secret_token_key_12345';

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Support base64 image uploads

// Serve Frontend Static Files
app.use(express.static(path.join(__dirname)));

let db;

// DB Initialization and Table Creation
async function initDatabase() {
    const sslConfig = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined;

    const connectionConfig = {
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        ssl: sslConfig
    };

    try {
        console.log("Connecting to MySQL service...");
        const tempConn = await mysql.createConnection(connectionConfig);
        await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'aura_db'}\``);
        await tempConn.end();
        console.log(`Database '${process.env.DB_NAME || 'aura_db'}' verified/created.`);

        db = mysql.createPool({
            ...connectionConfig,
            database: process.env.DB_NAME || 'aura_db',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        // Initialize tables
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS user_profiles (
                user_id INT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                location VARCHAR(255),
                lat DOUBLE,
                lon DOUBLE,
                profile_pic LONGTEXT,
                gender VARCHAR(50),
                last_period_date VARCHAR(50),
                cycle_length INT DEFAULT 28,
                age INT,
                weight VARCHAR(50),
                height VARCHAR(50),
                goal VARCHAR(50),
                skin_type VARCHAR(50),
                hair_type VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS user_progress (
                user_id INT PRIMARY KEY,
                coins INT DEFAULT 150,
                water_count INT DEFAULT 0,
                water_goal INT DEFAULT 8,
                last_spin_date VARCHAR(50),
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS daily_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                log_date DATE NOT NULL,
                water_glasses INT DEFAULT 0,
                steps INT DEFAULT 0,
                calories_burned INT DEFAULT 0,
                active_minutes INT DEFAULT 0,
                sleep_minutes INT DEFAULT 0,
                sleep_efficiency INT DEFAULT 0,
                coins_earned INT DEFAULT 0,
                UNIQUE KEY user_date (user_id, log_date),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        console.log("Database tables initialized successfully.");
    } catch (error) {
        console.error("MySQL connection or initialization failed:", error.message);
        console.error("Please verify your MySQL service is running and credentials in .env are correct.");
        process.exit(1);
    }
}

// Token Verification Middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Authentication token is missing' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token is invalid or expired' });
        }
        req.user = user;
        next();
    });
}

// Routes

// 1. Auth Signup
app.post('/api/auth/signup', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await db.query('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashedPassword]);
        const userId = result.insertId;

        // Create default user progress
        await db.query('INSERT INTO user_progress (user_id, coins, water_count, water_goal) VALUES (?, 150, 0, 8)', [userId]);

        const token = jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ token, userId, message: 'User created successfully' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Email is already registered' });
        }
        console.error(err);
        res.status(500).json({ error: 'Database signup failed' });
    }
});

// 2. Auth Login
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    try {
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        // Check if user has complete profile
        const [profiles] = await db.query('SELECT user_id FROM user_profiles WHERE user_id = ?', [user.id]);
        const hasProfile = profiles.length > 0;

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, userId: user.id, hasProfile, message: 'Login successful' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database login failed' });
    }
});

// 3. Get User Profile
app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        const [profiles] = await db.query('SELECT * FROM user_profiles WHERE user_id = ?', [req.user.id]);
        if (profiles.length === 0) {
            return res.status(404).json({ error: 'Profile not found' });
        }
        res.json(profiles[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Fetch profile failed' });
    }
});

// 4. Update/Create User Profile
app.post('/api/profile', authenticateToken, async (req, res) => {
    const { 
        name, location, lat, lon, profilePic, gender, 
        lastPeriodDate, cycleLength, age, weight, height, 
        goal, skinType, hairType 
    } = req.body;

    try {
        const [profiles] = await db.query('SELECT user_id FROM user_profiles WHERE user_id = ?', [req.user.id]);
        if (profiles.length > 0) {
            await db.query(`
                UPDATE user_profiles 
                SET name=?, location=?, lat=?, lon=?, profile_pic=?, gender=?, last_period_date=?, cycle_length=?, age=?, weight=?, height=?, goal=?, skin_type=?, hair_type=?
                WHERE user_id=?
            `, [name, location, lat, lon, profilePic, gender, lastPeriodDate, cycleLength, age, weight, height, goal, skinType, hairType, req.user.id]);
        } else {
            await db.query(`
                INSERT INTO user_profiles (user_id, name, location, lat, lon, profile_pic, gender, last_period_date, cycle_length, age, weight, height, goal, skin_type, hair_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [req.user.id, name, location, lat, lon, profilePic, gender, lastPeriodDate, cycleLength, age, weight, height, goal, skinType, hairType]);
        }
        res.json({ message: 'Profile saved successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Saving profile failed' });
    }
});

// 5. Get User Progress
app.get('/api/progress', authenticateToken, async (req, res) => {
    try {
        const [progress] = await db.query('SELECT * FROM user_progress WHERE user_id = ?', [req.user.id]);
        if (progress.length === 0) {
            return res.status(404).json({ error: 'Progress details not found' });
        }
        res.json(progress[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Fetch progress failed' });
    }
});

// 6. Update Water Tracker
app.post('/api/water', authenticateToken, async (req, res) => {
    const { water_count, date, goal } = req.body;
    try {
        await db.query('UPDATE user_progress SET water_count = ?, water_goal = ? WHERE user_id = ?', [water_count, goal, req.user.id]);
        
        await db.query(`
            INSERT INTO daily_logs (user_id, log_date, water_glasses)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE water_glasses = VALUES(water_glasses)
        `, [req.user.id, date, water_count]);

        res.json({ message: 'Water count saved successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Logging water failed' });
    }
});

// 7. Update Coins (General task / Spin Wheel)
app.post('/api/coins', authenticateToken, async (req, res) => {
    const { coins, earned, date } = req.body;
    try {
        await db.query('UPDATE user_progress SET coins = ? WHERE user_id = ?', [coins, req.user.id]);
        
        if (earned && date) {
            await db.query(`
                INSERT INTO daily_logs (user_id, log_date, coins_earned)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE coins_earned = coins_earned + VALUES(coins_earned)
            `, [req.user.id, date, earned]);
        }
        res.json({ message: 'Coins progress synced' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Syncing coins failed' });
    }
});

// 8. Log Completed Workout
app.post('/api/workout', authenticateToken, async (req, res) => {
    const { duration, steps, calories, coins_earned, date } = req.body;
    try {
        // Increment coins
        const [progress] = await db.query('SELECT coins FROM user_progress WHERE user_id = ?', [req.user.id]);
        let newCoins = 150;
        if (progress.length > 0) {
            newCoins = progress[0].coins + coins_earned;
            await db.query('UPDATE user_progress SET coins = ? WHERE user_id = ?', [newCoins, req.user.id]);
        }

        // Add to daily log
        await db.query(`
            INSERT INTO daily_logs (user_id, log_date, steps, calories_burned, active_minutes, coins_earned)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                steps = steps + VALUES(steps), 
                calories_burned = calories_burned + VALUES(calories_burned), 
                active_minutes = active_minutes + VALUES(active_minutes),
                coins_earned = coins_earned + VALUES(coins_earned)
        `, [req.user.id, date, steps, calories, duration, coins_earned]);

        res.json({ coins: newCoins, message: 'Workout logged' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Logging workout failed' });
    }
});

// 9. Log Sleep data
app.post('/api/sleep', authenticateToken, async (req, res) => {
    const { hours, efficiency, date } = req.body;
    try {
        const sleepMinutes = Math.round(hours * 60);
        await db.query(`
            INSERT INTO daily_logs (user_id, log_date, sleep_minutes, sleep_efficiency)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                sleep_minutes = VALUES(sleep_minutes), 
                sleep_efficiency = VALUES(sleep_efficiency)
        `, [req.user.id, date, sleepMinutes, efficiency]);

        res.json({ message: 'Sleep metrics logged' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Logging sleep failed' });
    }
});

// 10. Get Dashboard / Analytics Summary (Last 7 Days)
app.get('/api/analytics', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                SUM(steps) as total_steps,
                SUM(calories_burned) as total_calories,
                SUM(active_minutes) as total_active_minutes,
                AVG(sleep_minutes) as avg_sleep_minutes,
                AVG(sleep_efficiency) as avg_sleep_efficiency,
                AVG(water_glasses) as avg_water_glasses
            FROM daily_logs
            WHERE user_id = ? AND log_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        `, [req.user.id]);

        const stats = rows[0] || {};
        res.json({
            steps: stats.total_steps || 0,
            calories: stats.total_calories || 0,
            active_minutes: stats.total_active_minutes || 0,
            avg_sleep_hours: stats.avg_sleep_minutes ? (stats.avg_sleep_minutes / 60).toFixed(1) : 0,
            avg_sleep_efficiency: stats.avg_sleep_efficiency ? Math.round(stats.avg_sleep_efficiency) : 0,
            avg_water_glasses: stats.avg_water_glasses ? parseFloat(stats.avg_water_glasses).toFixed(1) : 0
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Fetch analytics failed' });
    }
});

// 11. Chatbot API Integration using Gemini Model
app.post('/api/chat', authenticateToken, async (req, res) => {
    const { message, history } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Gemini API Key is not configured on the server.' });
    }

    try {
        const contents = (history || []).map(h => ({
            role: h.role === 'model' ? 'model' : 'user',
            parts: [{ text: h.content }]
        }));

        if (contents.length === 0 && message) {
            contents.push({
                role: 'user',
                parts: [{ text: message }]
            });
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        
        const payload = {
            contents: contents,
            systemInstruction: {
                parts: [{ 
                    text: "You are Aura AI Coach, an expert health, fitness, and wellness AI coach. Respond in the exact language used by the user (English, Urdu, or Roman Urdu). Give helpful, premium, motivating wellness and self-care advice. Keep answers relatively concise and easy to read." 
                }]
            }
        };

        const apiResponse = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await apiResponse.json();

        if (!apiResponse.ok) {
            console.error("Gemini API error:", data);
            return res.status(500).json({ error: 'Gemini API call failed.' });
        }

        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "I am unable to generate a response at the moment.";
        res.json({ reply });
    } catch (err) {
        console.error("Chat API error:", err);
        res.status(500).json({ error: 'Failed to communicate with AI model.' });
    }
});

// Start Server
initDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running at http://localhost:${PORT}`);
    });
});
