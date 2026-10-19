const mysql = require('mysql');
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

class DbService {
    static getDbServiceInstance() {
        if (!instance) instance = new DbService();
        return instance;
    }

    async getAllUsers() {
        return runQuery('SELECT ' + SAFE_COLUMNS + ' FROM Users ORDER BY username;');
    }
}

module.exports = DbService;
