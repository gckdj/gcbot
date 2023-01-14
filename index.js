const { Client, GatewayIntentBits, Events, ModalBuilder, TextInputBuilder, TextInputStyle, interaction, EmbedBuilder, REST, Routes, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { commands } = require('./command.js');
const { Random } = require("random-js");
const random = new Random();
const keepAlive = require('./server.js');
const moment = require('moment');
require('moment-timezone');
moment.locale('ko');
moment.tz.setDefault("Asia/Seoul");

const mongoose = require('mongoose');
const ScMatch = require('./schemas/scmatch.js');
const ScMap = require('./schemas/scmap.js');

const fetch = require('@replit/node-fetch');

const applicaitonId = process.env['application_id'];
const token = process.env['token'];
const clientId = process.env['client_id'];
const uri = process.env['uri'];
const naverClientId = process.env['nClientId'];
const naverSecret = process.env['nClientSecret']

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
const rest = new REST({ version: '10' }).setToken(token);

mongoose.connect(uri, {
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
        await rest.put(Routes.applicationCommands(clientId, applicaitonId), { body: commands });
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on(Events.InteractionCreate, async interaction => {

    if (!interaction.isChatInputCommand()) {
        return;
    }

    if (interaction.commandName === '뽑기') {

        const maps = await ScMap.find({ 'isUsing': true }).sort({ 'people': 1, 'description': 'asc' });

        let embed = new EmbedBuilder()
            .setColor('Red')
            .setTitle('맵 리스트')
            .setURL('https://910map.tistory.com/');

        maps.forEach(map => {
            const field = {
                'name': map.name,
                'value': map.description,
                'inline': false,
            }

            embed.addFields(field);
        });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('noban')
                    .setLabel('맵 뽑기')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🏹')
            );

        await interaction.reply({ embeds: [embed], components: [row] });
    }

    if (interaction.commandName === '조회') {

        const guildId = interaction.guildId;
        const guild = await client.guilds.fetch(guildId);
        const members = await guild.members.fetch();

        const matches = await ScMatch.find({ 'isComplete': true }).sort({ 'savedAt': 'asc' }).limit(10);

        let result = [];

        matches.forEach(match => {
            const aP = members.get(match.aPlyr);
            const bP = members.get(match.bPlyr);

            const aName = getPlayerName(aP);
            const bName = getPlayerName(bP);

            let finalWinner = null;

            let lSco = 0;
            let rSco = 0;

            if (match.cGm === null) {
                if (aP.user.id === match.aGm) {
                    tWinner = '경기없음';
                    finalWinner = aName;
                    lSco = 2;
                } else {
                    tWinner = '경기없음';
                    finalWinner = bName;
                    rSco = 2;
                }
            } else {
                if (aP.user.id === match.cGm) {
                    finalWinner = aName;
                    lSco = 2;
                    rSco = 1;
                } else {
                    finalWinner = bName;
                    rSco = 2;
                    lSco = 1;
                }
            }

            const nowMoment = moment(match.savedAt);
            const today = nowMoment.format('YYYY/MM/DD HH:mm:ss');

            const content = {
                'name': `${today}, 승리: ${finalWinner})`,
                'value': `대진: ${aName} vs ${bName}, 스코어: [${lSco} : ${rSco}]`
            }

            result.push(content);
        });

        let notice = null;

        if (matches.length === 0) {
            notice = '조회된 결과가 없습니다.';
        } else {
            notice = '최근 매치결과입니다.';
        }

        let matchList = new EmbedBuilder()
            .setColor('Red')
            .setTitle('매치 결과조회')
            .setDescription(notice)
            .setTimestamp();

        result.forEach(item => {
            matchList.addFields(item);
        });

        interaction.reply({ embeds: [matchList] });
    }

    if (interaction.commandName === '맛집') {

        const query = '거창 고깃집';
        const ranStart = random.integer(0, 500);
        
        await fetch(`https://openapi.naver.com/v1/search/local?query=${query}&display=10&start=10&sort=random`, {
            'method': 'GET',
            'headers': {
                'X-Naver-Client-Id': `${naverClientId}`,
                'X-Naver-Client-Secret': `${naverSecret}`
            },
        })
        .then((res) => {
            return res.json();
        })
        .then(data => {
            console.log(data);
        })
        .catch(console.error.bind(console));
    }
});


// 버튼 상호작용
client.on(Events.InteractionCreate, async interaction => {

    if (!interaction.isButton()) {
        return;
    }

    const guildId = interaction.guildId;
    const guild = await client.guilds.fetch(guildId);
    const members = await guild.members.fetch();

    if (interaction.customId === 'noban') {
        let maps = await ScMap.find({ 'isUsing': true }).sort({ 'people': 1, 'description': 'asc' });
        let matchMaps = [];

        let peopleFlag = false;

        while (matchMaps.length < 3) {
            let n = random.integer(0, maps.length - 1);
            let map = maps[n];

            if (map.isUniq === true) {
                if (random.integer(1, 100) >= 70 ? true : false) {
                    map.name = map.name + ' 유니크';
                }
            }

            if (map.people === 2) {
                if (peopleFlag === false) {
                    peopleFlag = true;
                } else {
                    maps.splice(n, 1);
                    continue;
                }
            }

            matchMaps.push(map);
            maps.splice(n, 1);
        }

        const nice = new EmbedBuilder()
            .setColor('Red')
            .setURL('https://910map.tistory.com/')
            .setTitle('맵 선택결과')
            .addFields(
                { name: '1경기', value: matchMaps[0].name },
                { name: '2경기', value: matchMaps[1].name },
                { name: '3경기', value: matchMaps[2].name },
            )
            .setDescription('Good Luck 🍀');

        let match = new ScMatch();
        match.maps = matchMaps;
        match.save(err => {
            if (err) {
                throw 'id save error';
            }
        });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('insertResultStart||' + match._id)
                    .setLabel('이 매치의 결과를 입력할게요')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🖋')
            );

        await interaction.reply({ embeds: [nice], components: [row] });
    }

    if (interaction.customId.split('||')[0] === 'insertResultStart') {

        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('selectPlayer1||' + interaction.customId.split('||')[1])
                    .setPlaceholder('플레이어1 선택')
                    .addOptions(getPlayerOptions(members))
            );

        await interaction.reply({ content: '플레이어1을 선택하세요', components: [row] });
    }
});

// select 상호작용
client.on(Events.InteractionCreate, async interaction => {

    if (!interaction.isStringSelectMenu()) {
        return;
    }

    const today = moment().format('YYYY/MM/DD HH:mm:ss');

    const key = interaction.customId.split('||')[1];

    const guildId = interaction.guildId;
    const guild = await client.guilds.fetch(guildId);
    const members = await guild.members.fetch();
    const selectValues = interaction.values;

    if (interaction.customId.split('||')[0] === 'selectPlayer1') {

        await ScMatch.updateOne({ _id: key }, { 'aPlyr': members.get(selectValues[0]).user.id });

        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('selectPlayer2||' + key)
                    .setPlaceholder('플레이어2 선택')
                    .addOptions(getPlayerOptions(members))
            );

        await interaction.reply({ content: '플레이어2를 선택하세요', components: [row] });
    }

    if (interaction.customId.split('||')[0] === 'selectPlayer2') {

        await ScMatch.updateOne({ _id: key }, { 'bPlyr': members.get(selectValues[0]).user.id });

        const match = await ScMatch.findOne({ _id: key });
        let someMembers = [];

        someMembers.push(members.get(match.aPlyr));
        someMembers.push(members.get(match.bPlyr));

        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('firstGameWinner||' + interaction.customId.split('||')[1])
                    .setPlaceholder('1세트 승자')
                    .addOptions(getPlayerOptions(someMembers))
            );

        await interaction.reply({ content: '1세트 승자를 선택하세요', components: [row] });
    }

    if (interaction.customId.split('||')[0] === 'firstGameWinner') {

        await ScMatch.updateOne({ _id: key }, { 'aGm': members.get(selectValues[0]).user.id });

        const match = await ScMatch.findOne({ _id: key });
        let someMembers = [];

        someMembers.push(members.get(match.aPlyr));
        someMembers.push(members.get(match.bPlyr));

        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('secondGameWinner||' + interaction.customId.split('||')[1])
                    .setPlaceholder('2세트 승자')
                    .addOptions(getPlayerOptions(someMembers))
            );

        await interaction.reply({ content: '2세트 승자를 선택하세요', components: [row] });
    }

    if (interaction.customId.split('||')[0] === 'secondGameWinner') {

        await ScMatch.updateOne({ _id: key }, { 'bGm': members.get(selectValues[0]).user.id });

        const match = await ScMatch.findOne({ _id: key });
        let someMembers = [];

        someMembers.push(members.get(match.aPlyr));
        someMembers.push(members.get(match.bPlyr));

        if (match.aGm === match.bGm) {

            let winner = null;

            const aPlyr = members.get(match.aPlyr);
            const bPlyr = members.get(match.bPlyr);

            const aName = getPlayerName(aPlyr);
            const bName = getPlayerName(bPlyr);

            if (match.aPlyr === match.aGm) {
                winner = aName;
            } else {
                winner = bName;
            }

            console.log('match', match);

            await ScMatch.updateOne({ _id: key }, { 'isComplete': true, 'savedAt': new Date(), 'cGm': null });

            const resultEmbed = new EmbedBuilder()
                .setColor('Red')
                .setTitle('저장된 매치결과')
                .setDescription(today)
                .addFields(
                    { name: '매치업', value: `${aName} vs ${bName}` },
                    { name: '1세트: ' + match.maps[0].name, value: winner },
                    { name: '2세트: ' + match.maps[1].name, value: winner },
                    { name: '3세트: ' + match.maps[2].name, value: '경기없음' },
                    { name: '승자', value: `${winner} 🔥` },
                )
                .setTimestamp();

            interaction.reply({ embeds: [resultEmbed] });

        } else {

            const row = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('insertResultEnd||' + interaction.customId.split('||')[1])
                        .setPlaceholder('3세트 승자')
                        .addOptions(getPlayerOptions(someMembers))
                );

            await interaction.reply({ content: '3세트 승자를 선택하세요', components: [row] });
        }
    }

    if (interaction.customId.split('||')[0] === 'insertResultEnd') {

        const match = await ScMatch.findOne({ _id: key });

        let cGame = members.get(selectValues[0]).user.id;

        const aPlyr = members.get(match.aPlyr);
        const bPlyr = members.get(match.bPlyr);

        const aName = getPlayerName(aPlyr);
        const bName = getPlayerName(bPlyr);

        let fWinner = null;
        let sWinner = null;
        let tWinner = null;

        if (match.aPlyr === match.aGm) {
            fWinner = aName;
            sWinner = bName;
        } else {
            fWinner = bName;
            sWinner = aName;
        }

        if (match.aPlyr === cGame) {
            tWinner = aName;
        } else {
            tWinner = bName;
        }

        await ScMatch.updateOne({ _id: key }, { 'cGm': cGame, 'isComplete': true, 'savedAt': new Date() });

        console.log('match', match);

        const resultEmbed = new EmbedBuilder()
            .setColor('Red')
            .setTitle('저장된 매치결과')
            .setDescription(today)
            .addFields(
                { name: '매치업', value: `${aName} vs ${bName}` },
                { name: '1세트: ' + match.maps[0].name, value: fWinner },
                { name: '2세트: ' + match.maps[1].name, value: sWinner },
                { name: '3세트: ' + match.maps[2].name, value: tWinner },
                { name: '승자', value: `${tWinner} 🔥` },
            )
            .setTimestamp();

        interaction.reply({ embeds: [resultEmbed] });
    }
});

keepAlive();
client.login(token);

function getPlayerName(member) {

    if (member.nickname == null) {
        return member.user.username;
    } else {
        return member.nickname;
    }
}

function getPlayerOptions(members) {
    let plyrs = [];

    members.forEach(member => {
        let plyr = {};

        if (member.nickname == null) {
            plyr.label = member.user.username;
        } else {
            plyr.label = member.nickname;
        }

        plyr.value = member.user.id;
        plyrs.push(plyr);
    });

    return plyrs;
}