const express = require('express');
const server = express();

server.all('/', (req, res) => {
    res.send('gcbot ok!');
});

function keepAlive() {
    server.listen(3000, ()=> {
        console.log('서버 준비 완료');
    })
}

module.exports = keepAlive;