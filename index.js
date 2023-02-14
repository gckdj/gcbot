const { Client, Collection, GatewayIntentBits, REST, Routes, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const keepAlive = require('./server.js');
const gcUtils = require('./gcbotutils.js');
const fetch = gcUtils.getFetch();
const moment = gcUtils.getMoment();

const mongoose = require('mongoose');

const token = process.env['token'];
const clientId = process.env['client_id'];
const atlasURI = process.env['uri'];
const lolKey = process.env['lolApiKey'];

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

        setTimeout(() => {
            showPlayer();
        }, 300000)
        showPlayer();
    } catch (error) {
        console.error(error);
    }
})();


const p1 = {
    "id": "VAfAqk6vUFyHwe0whqE7blBI_BIberNOmMG778RCdjpD_g",
    "accountId": "twVfzU8Po4rB9ELdeLLmzJpsUBxnz8iGALXycTAmXM0b",
    "puuid": "PwaF48d4KP0KAzZK3OixK0mRfLdw4TMtp95QvFrGW5Qye0VI9V5dqNou4zsUtC8ohzNe2TN1n89-MQ",
    "name": "울부짖는 구인모",
    "profileIconId": 5634,
    "revisionDate": 1676378417313,
    "summonerLevel": 168
}

const p2 = {
    "id": "LQ2rMJLIra0Qe4ldcJQ696aDJrrm5xtGHTT7Wrh9nugaeg",
    "accountId": "HV-q8gyq0AQfuGKCwU7N5UwfS6-Pm07h-yH-6V8j44r1",
    "puuid": "9B8nPLRQlZbOWxWYuO5uGvuf866mJkZlDuvTumFtw8mZdgnqdTJo4q_mtX1Fl15MF9Oi-ctclEzMIw",
    "name": "엘카프",
    "profileIconId": 5415,
    "revisionDate": 1676310441585,
    "summonerLevel": 345
}

const p3 = {
    "id": "mMh0xjkRWvTEWAyZ0KjEF7zs5eOSKJWE6Jdxxj0zjkaVQw",
    "accountId": "g8Dqoox4ckM2PICgSJqgUwtzLPVHauNExjoJBhrLJSq6",
    "puuid": "cS90Q6R9TqiCSuVX3N07tm5Ms12QpCLRsIyIjUW8NxJCZGl5HJ1QcLAtCqVfjjoGmwEueltyKe-9ew",
    "name": "신 실",
    "profileIconId": 536,
    "revisionDate": 1676379094279,
    "summonerLevel": 388
}

const p4 = {
    "id": "hzG7pp9oZdRq5Ygk3J83dfM9Hn8gR6Ipb8XNRN1xXRu1gg",
    "accountId": "3ufnySrnLzFgeQ3s5OIR2dtqaHkna2xOen_kTMfQwJ-V",
    "puuid": "M9s6cuAyZ4VB-sxL3mDftPgTPdwB6Q-EmbA1v2OWnCo7J7ctGMqKRrMgxCagcQpI9MTeRY0OHyHLlQ",
    "name": "아란드라",
    "profileIconId": 1425,
    "revisionDate": 1676049957000,
    "summonerLevel": 294
}

const p5 = {
    "id": "5V_yVlCKs8BpLGyYOKIAL4qBFv4QBM6qAR_rusgH6iQdoQ",
    "accountId": "HV-XPWVGlHtFB9qnbmOq1tsWzV7TtkvhTTM5CP8xnQCr",
    "puuid": "I-229KPpHYG8RmpZVS5Ko9PlkONI9YWNG3r-2xShmXK-metCkmbggOgFT-xszXYrhxKOxuXzr7UFOw",
    "name": "롤영역",
    "profileIconId": 23,
    "revisionDate": 1676214637000,
    "summonerLevel": 363
}

const p6 = {
    "id": "9QH7p32MZ-Mb4T0gJ2xAR63TLNWu4FxKq3RviYHpbN35ObU",
    "accountId": "WVYcV6iidhoJnGBRltAJXEY21d_zlWCUxCIq7MkV-LRhKzo",
    "puuid": "DHqnVoEQygd4yyIYtp5UbHTluTr10RgsJHDElYCVtfwDZ15QL_l2r3mRUQfKl3Ax0Lrwt1qOeqJFMA",
    "name": "짝지볼펜상습절도",
    "profileIconId": 4903,
    "revisionDate": 1676300538707,
    "summonerLevel": 298
}

const p7 = {
    "id": "D8UL8ytjkrkr-1SjsNYgKcxe3_K8PJLJVIh30PBP8WnO6zY",
    "accountId": "kFKj9kMc_rjJ-1PrNQaxuOS1_8f-g4IRo3Wa5O0l6-Ya",
    "puuid": "mhSreBFjh6teacqWEaqxYq2_UKb5SkGwB4i8e0YvtqOZ4_cSCrBB7dvMnZEkiZfWSyjd4Do_J1XuOQ",
    "name": "ChamPagNe Mix",
    "profileIconId": 3861,
    "revisionDate": 1676117913000,
    "summonerLevel": 440
}


function showPlayer() {
    const players = [p1, p2, p3, p4, p5, p6, p7];

    players.forEach(async (p) => {
        const startTime = moment().subtract(5, 'm').unix();
        const type = 'ranked';
        const queue = 420;
        const url = `https://asia.api.riotgames.com/lol/match/v5/matches/by-puuid/${p.puuid}/ids?start=0&startTime=${startTime}&type=${type}&queue=${queue}&count=5&api_key=${lolKey}`;

        await fetch(url)
            .then((res) => res.json())
            .then(async (data) => {

                if (data.length > 0) {
                    const matchUrl = `https://asia.api.riotgames.com/lol/match/v5/matches/${data[0]}?api_key=${lolKey}`;

                    await fetch(matchUrl)
                        .then((res) => res.json())
                        .then(async (matchData) => {

                            matchData.info.participants.forEach((part) => {
                                if (p.puuid === part.puuid) {
                                    sendMatchResult(part);
                                }
                            });
                        });
                }
            });
    });
}

async function sendMatchResult(gc) {
    const serverId = '868185243830603806';
    const channelId = '1061970248057761802';

    const guild = await client.guilds
        .fetch(serverId)
        .catch(console.error);

    const channel = await guild.channels
        .fetch(channelId)
        .catch(console.error);

    let isWin = '패배';
    let color = 'Red';

    if (gc.win) {
        isWin = '승리';
        color = 'Blue';
    }

    const title = `${gc.summonerName}님이 ${isWin}했습니다.`;
    const des = `${gc.championName}[${gc.kills}/${gc.deaths}/${gc.assists}], ${gc.lane}, dpm : ${String(gc.challenges.damagePerMinute).substring(0, 6)}`;
    console.log(gc);

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(des)
        .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(console.error);
}

keepAlive();
client.login(token);