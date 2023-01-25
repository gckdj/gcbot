const express = require('express');
const server = express();

server.all('/', (req, res) => {
    res.send('gcbot ok1!');
});

function keepAlive() {
    server.listen(3000, ()=> {
        console.log('[express 준비 완료]');
    })
}

module.exports = keepAlive;