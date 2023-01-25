const { Client, Collection, GatewayIntentBits, REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const keepAlive = require('./server.js');

const mongoose = require('mongoose');

const token = process.env['token'];
const clientId = process.env['client_id'];
const atlasURI = process.env['uri'];

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
client.commands = new Collection();
const rest = new REST({ version: '10' }).setToken(token);

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

const recursiveReadCommands = (filePath) => {
    fs.readdirSync(filePath, { withFileTypes: true })
        .forEach(file => {
            if (file.isDirectory()) {
                const newPath = filePath + '/' + file.name;
                recursiveReadCommands(newPath);
            } else {
                if (file.name.endsWith('.js')) {
                    const command = require(`${filePath}/${file.name}`);

                    // 클라이언트에 제공될 커맨드리스트
                    commands.push(command.data.toJSON());
                    // 커맨드컬렉션에 커맨드명, 실행함수 set
                    client.commands.set(command.data.name, command);
                }
            }
        });
}

// 사용자커맨드 입력
recursiveReadCommands(commandsPath);

const eventsPath = path.join(__dirname, 'events');

const recursiveReadEvents = (eventsPath) => {
    fs.readdirSync(eventsPath, { withFileTypes: true })
        .forEach(file => {
            if (file.isDirectory()) {
                const newPath = eventsPath + '/' + file.name;
                recursiveReadEvents(newPath);
            } else {
                if (file.name.endsWith('.js')) {
                    const event = require(`${eventsPath}/${file.name}`);
                    if (event.once) {
                        client.once(event.name, (...args) => event.execute(...args));
                    } else {
                        client.on(event.name, (...args) => event.execute(...args));
                    }
                }
            }
        });
}

// interaction 간의 이벤트입력
recursiveReadEvents(eventsPath);

mongoose.connect(atlasURI, {
    dbName: 'Gcbot',
    useNewUrlParser: true,
}, (err) => {
    if (err) {
        console.error('mongodb connection error', err);
    }
});

mongoose.connection.on('open', async function() {
    console.log('mongoose opened');
});

(async () => {
    try {
        const result = await rest.put(Routes.applicationCommands(clientId), { body: commands });
        console.log(`[디스코드 명령어 ${result.length}건 등록완료]`);
    } catch (error) {
        console.error(error);
    }
})();

keepAlive();
client.login(token);