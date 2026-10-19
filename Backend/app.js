const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const dbService = require('./dbService');
const db = dbService.getDbServiceInstance();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const isBlank = (v) => v === undefined || v === null || String(v).trim() === '';

function send(promise, response) {
    promise
        .then((data) => response.json({ data: data }))
        .catch((err) => {
            console.log(err.message);
            response.status(500).json({ error: err.message });
        });
}

app.post('/register', async (request, response) => {
    const { username, password, firstname, lastname, salary, age } = request.body;

    if ([username, password, firstname, lastname, salary, age].some(isBlank))
        return response.status(400).json({ error: 'All fields are required.' });
    if (String(username).length > 50)
        return response.status(400).json({ error: 'Username must be 50 characters or fewer.' });
    if (String(password).length < 4)
        return response.status(400).json({ error: 'Password must be at least 4 characters.' });
    if (isNaN(Number(salary)) || Number(salary) < 0)
        return response.status(400).json({ error: 'Salary must be a number (0 or more).' });
    if (!Number.isInteger(Number(age)) || Number(age) < 0 || Number(age) > 150)
        return response.status(400).json({ error: 'Age must be a whole number from 0 to 150.' });

    try {
        const rows = await db.registerUser({
            username: String(username).trim(),
            password: String(password),
            firstname: String(firstname).trim(),
            lastname: String(lastname).trim(),
            salary: Number(salary),
            age: Number(age)
        });
        response.json({ data: rows[0] });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY')
            return response.status(409).json({ error: 'That username is already taken.' });
        console.log(err.message);
        response.status(500).json({ error: err.message });
    }
});

app.post('/signin', async (request, response) => {
    const { username, password } = request.body;
    if (isBlank(username) || isBlank(password))
        return response.status(400).json({ error: 'Username and password are required.' });
    try {
        const user = await db.signIn(String(username), String(password));
        if (!user) return response.status(401).json({ error: 'Invalid username or password.' });
        response.json({ data: user });
    } catch (err) {
        console.log(err.message);
        response.status(500).json({ error: err.message });
    }
});

app.get('/users', (request, response) => {
    send(db.getAllUsers(), response);
});

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
    console.log('I am listening on port ' + PORT);
});
