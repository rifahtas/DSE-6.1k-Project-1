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

function send(promise, response) {
    promise
        .then((data) => response.json({ data: data }))
        .catch((err) => {
            console.log(err.message);
            response.status(500).json({ error: err.message });
        });
}

app.get('/users', (request, response) => {
    send(db.getAllUsers(), response);
});

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
    console.log('I am listening on port ' + PORT);
});
