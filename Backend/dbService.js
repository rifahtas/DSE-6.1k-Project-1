const mysql = require('mysql');
const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config();

let instance = null;

const pool = mysql.createPool({
    connectionLimit: 5,
    host: process.env.HOST,
    user: process.env.DB_USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE,
    port: process.env.DB_PORT,
    dateStrings: true
});

pool.getConnection((err, conn) => {
    if (err) {
        console.log('DB CONNECTION FAILED: ' + err.message);
    } else {
        console.log('db connected');
        conn.release();
    }
});

const SAFE_COLUMNS =
    'username, firstname, lastname, salary, age, registerday, signintime';

function runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        pool.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
}

function hashPassword(plain) {
    return new Promise((resolve, reject) => {
        const salt = crypto.randomBytes(16).toString('hex');
        crypto.scrypt(plain, salt, 64, (err, key) => {
            if (err) reject(err);
            else resolve(salt + ':' + key.toString('hex'));
        });
    });
}

function verifyPassword(plain, stored) {
    return new Promise((resolve, reject) => {
        if (!stored || !stored.includes(':')) return resolve(false);
        const [salt, hash] = stored.split(':');
        crypto.scrypt(plain, salt, 64, (err, key) => {
            if (err) return reject(err);
            const expected = Buffer.from(hash, 'hex');
            resolve(expected.length === key.length && crypto.timingSafeEqual(expected, key));
        });
    });
}

class DbService {
    static getDbServiceInstance() {
        if (!instance) instance = new DbService();
        return instance;
    }

    async registerUser({ username, password, firstname, lastname, salary, age }) {
        const hashed = await hashPassword(password);
        const sql =
            'INSERT INTO Users (username, password, firstname, lastname, salary, age, registerday, signintime) ' +
            'VALUES (?, ?, ?, ?, ?, ?, CURDATE(), NULL);';
        await runQuery(sql, [username, hashed, firstname, lastname, salary, age]);
        return this.searchByUsername(username);
    }

    async signIn(username, password) {
        const rows = await runQuery(
            'SELECT username, password FROM Users WHERE username = ?;', [username]);
        if (rows.length === 0) return null;
        const ok = await verifyPassword(password, rows[0].password);
        if (!ok) return null;
        await runQuery('UPDATE Users SET signintime = NOW() WHERE username = ?;', [username]);
        const user = await this.searchByUsername(username);
        return user[0];
    }

    async searchByName(first, last) {
        const conditions = [];
        const params = [];
        if (first) { conditions.push('firstname LIKE ?'); params.push('%' + first + '%'); }
        if (last) { conditions.push('lastname LIKE ?'); params.push('%' + last + '%'); }
        const sql = 'SELECT ' + SAFE_COLUMNS + ' FROM Users WHERE ' +
                    conditions.join(' AND ') + ' ORDER BY username;';
        return runQuery(sql, params);
    }

    async searchByUsername(username) {
        return runQuery('SELECT ' + SAFE_COLUMNS + ' FROM Users WHERE username = ?;', [username]);
    }

    async searchBySalary(min, max) {
        return runQuery('SELECT ' + SAFE_COLUMNS +
            ' FROM Users WHERE salary BETWEEN ? AND ? ORDER BY salary;', [min, max]);
    }

    async searchByAge(min, max) {
        return runQuery('SELECT ' + SAFE_COLUMNS +
            ' FROM Users WHERE age BETWEEN ? AND ? ORDER BY age;', [min, max]);
    }

    async registeredAfter(username) {
        return runQuery('SELECT ' + SAFE_COLUMNS +
            ' FROM Users WHERE registerday > ' +
            '(SELECT registerday FROM Users WHERE username = ?) ORDER BY registerday, username;',
            [username]);
    }

    async neverSignedIn() {
        return runQuery('SELECT ' + SAFE_COLUMNS +
            ' FROM Users WHERE signintime IS NULL ORDER BY username;');
    }

    async registeredSameDay(username) {
        return runQuery('SELECT ' + SAFE_COLUMNS +
            ' FROM Users WHERE registerday = ' +
            '(SELECT registerday FROM Users WHERE username = ?) AND username <> ? ORDER BY username;',
            [username, username]);
    }

    async registeredToday() {
        return runQuery('SELECT ' + SAFE_COLUMNS +
            ' FROM Users WHERE registerday = CURDATE() ORDER BY username;');
    }

    async getAllUsers() {
        return runQuery('SELECT ' + SAFE_COLUMNS + ' FROM Users ORDER BY username;');
    }
}

module.exports = DbService;
