const { query } = require('express-validator');
const { Client } = require('pg');

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    //connectionString: 'postgres://rqdhjiijzhxdnb:a17bcb235f2309297736154f05690b3d5715ef0987713084418b06e1fd4d62e9@ec2-18-233-83-165.compute-1.amazonaws.com:5432/dd9i2ie6fgp9cq',
    ssl: {
        rejectUnauthorized: false
    }
});

client.connect();

const readSession = async () => {
    try {
        const res = await client.query('SELECT * FROM wa_sessions ORDER BY created_at DESC LIMIT 1');
        if (res.rows.length) return res.rows[0].session;
        return '';
    } catch (err) {
        throw err;
    }
}

const saveSession = (session) => {
    client.query('INSERT INTO wa_sessions (session) VALUES($1)', [session], (err, results) => {
        if (err) {
            console.error('Failed to save session!', err);
        } else {
            console.log('Session saved!');
        }
    });
}

const removeSession = () => {
    client.query('DELETE FROM wa_sessions', (err, results) => {
        if (err) {
            console.error('Failed to remove session!', err);
        } else {
            console.log('Session deleted!');
        }
    });
}

module.exports = {
    readSession,
    saveSession,
    removeSession
}