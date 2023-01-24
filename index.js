const { Client, Collection, GatewayIntentBits, Events, ModalBuilder, TextInputBuilder, TextInputStyle, interaction, EmbedBuilder, REST, Routes, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const { Random } = require("random-js");
const keepAlive = require('./server.js');
const moment = require('moment');
require('moment-timezone');
moment.locale('ko');
moment.tz.setDefault("Asia/Seoul");

const mongoose = require('mongoose');
const ScMatch = require('./schemas/scmatch.js');
const ScSetResult = require('./schemas/scsetresult.js');
const LolSet = require('./schemas/lolset.js');

const applicaitonId = process.env['application_id'];
const token = process.env['token'];
const clientId = process.env['client_id'];
const uri = process.env['uri'];

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
client.commands = new Collection();
const rest = new REST({ version: '10' }).setToken(token);

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

const recursiveReadFiles = (filePath) => {
    fs.readdirSync(filePath, { withFileTypes: true })
        .forEach(file => {
            if (file.isDirectory()) {
                const newPath = filePath + '/' + file.name;
                recursiveReadFiles(newPath);
            } else {
                if (file.name.endsWith('.js')) {
                    const command = require(`${filePath}/${file.name}`);
                    commands.push(command.data.toJSON());
                    console.log(command);
                    client.commands.set(command.data.name, command);
                }
            }
        });
}

recursiveReadFiles(commandsPath);

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
        console.log('commands', commands);
        const result = await rest.put(Routes.applicationCommands(clientId), { body: commands });
    } catch (error) {
        console.error(error);
    }
})();

client.on('ready', () => {
    console.log(`[디스코드 API 로그인 완료: ${client.user.tag}]`);
});

client.on(Events.InteractionCreate, async interaction => {

    if (!interaction.isChatInputCommand()) {
        return;
    }

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`찾을 수 없는 명령어[입력내용: ${interaction.commandName}]`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: '존재하지 않는 명령어입니다.', ephemeral: true });
    }
});

// 모달 서브밋 이벤트
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isModalSubmit()) {
        return;
    }

    if (interaction.customId === 'insertLoLInnerMatchModal') {

        console.log(interaction);
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

        let options = getPlayerOptions(someMembers);
        options.push({
            label: '경기없음',
            value: 'nogame',
        })

        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('insertResultEnd||' + interaction.customId.split('||')[1])
                    .setPlaceholder('3세트 승자')
                    .addOptions(options)
            );

        await interaction.reply({ content: '3세트 승자를 선택하세요', components: [row] });
    }

    if (interaction.customId.split('||')[0] === 'insertResultEnd') {

        const match = await ScMatch.findOne({ _id: key });

        const aPlyr = members.get(match.aPlyr);
        const bPlyr = members.get(match.bPlyr);

        const aName = getPlayerName(aPlyr);
        const bName = getPlayerName(bPlyr);

        let lSco = 0;
        let rSco = 0;

        let fWinner = null;
        let sWinner = null;
        let tWinner = null;

        let finalWinnerId = null;
        let finalWinnerName = null;

        let cGame = null;

        let setResults = [];

        if (match.aPlyr === match.aGm) {
            fWinner = aName;
            lSco += 1;

            setResults.push({ 'matchId': key, 'plyr': match.aPlyr, 'isWin': 1, 'set': 1, 'savedAt': new Date() });
            setResults.push({ 'matchId': key, 'plyr': match.bPlyr, 'isWin': 0, 'set': 1, 'savedAt': new Date() });
        } else {
            fWinner = bName;
            rSco += 1;

            setResults.push({ 'matchId': key, 'plyr': match.aPlyr, 'isWin': 0, 'set': 1, 'savedAt': new Date() });
            setResults.push({ 'matchId': key, 'plyr': match.bPlyr, 'isWin': 1, 'set': 1, 'savedAt': new Date() });
        }

        if (match.aPlyr === match.bGm) {
            sWinner = aName;
            lSco += 1;

            setResults.push({ 'matchId': key, 'plyr': match.aPlyr, 'isWin': 1, 'set': 2, 'savedAt': new Date() });
            setResults.push({ 'matchId': key, 'plyr': match.bPlyr, 'isWin': 0, 'set': 2, 'savedAt': new Date() });
        } else {
            sWinner = bName;
            rSco += 1;

            setResults.push({ 'matchId': key, 'plyr': match.aPlyr, 'isWin': 0, 'set': 2, 'savedAt': new Date() });
            setResults.push({ 'matchId': key, 'plyr': match.bPlyr, 'isWin': 1, 'set': 2, 'savedAt': new Date() });
        }

        const sv = selectValues[0];

        if (sv != 'nogame') {
            cGame = members.get(sv).user.id;

            if (match.aPlyr === cGame) {
                tWinner = aName;
                lSco += 1;

                setResults.push({ 'matchId': key, 'plyr': match.aPlyr, 'isWin': 1, 'set': 3, 'savedAt': new Date() });
                setResults.push({ 'matchId': key, 'plyr': match.bPlyr, 'isWin': 0, 'set': 3, 'savedAt': new Date() });
            } else {
                tWinner = bName;
                rSco += 1;

                setResults.push({ 'matchId': key, 'plyr': match.aPlyr, 'isWin': 0, 'set': 3, 'savedAt': new Date() });
                setResults.push({ 'matchId': key, 'plyr': match.bPlyr, 'isWin': 1, 'set': 3, 'savedAt': new Date() });
            }
        } else {
            cGame = null;
            tWinner = '경기없음';
        }

        if (lSco >= 2) {
            finalWinnerId = match.aPlyr;
            finalWinnerName = getPlayerName(aPlyr);
        } else if (lSco === 1 && rSco === 1) {
            finalWinnerId = 'draw';
            finalWinnerName = '무승부';
        } else {
            finalWinnerId = match.bPlyr;
            finalWinnerName = getPlayerName(bPlyr);
        }

        await ScMatch.updateOne({ _id: key }, { 'cGm': cGame, 'isComplete': true, 'savedAt': new Date(), 'lSco': lSco, 'rSco': rSco, 'finalWinner': finalWinnerId });

        ScSetResult.insertMany(setResults, (err, docs) => {
            if (err) {
                console.log(err);
            }
        });

        const resultEmbed = new EmbedBuilder()
            .setColor('Red')
            .setTitle('저장된 매치결과')
            .setDescription(today)
            .addFields(
                { name: '매치업', value: `${aName} vs ${bName}` },
                { name: '1세트: ' + match.maps[0].name, value: fWinner },
                { name: '2세트: ' + match.maps[1].name, value: sWinner },
                { name: '3세트: ' + match.maps[2].name, value: tWinner },
                { name: '승자', value: `${finalWinnerName} 🔥` },
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

function getMatchesResults(matches, members) {

    let result = [];

    matches.forEach(match => {
        const aP = members.get(match.aPlyr);
        const bP = members.get(match.bPlyr);

        const aName = getPlayerName(aP);
        const bName = getPlayerName(bP);

        let finalWinner = null;

        if (match.aPlyr === match.finalWinner) {
            finalWinner = aName;
        } else if (match.finalWinner === 'draw') {
            finalWinner = '무승부';
        } else {
            finalWinner = bName;
        }

        const nowMoment = moment(match.savedAt);
        const today = nowMoment.format('YYYY/MM/DD HH:mm:ss');

        const content = {
            'name': `${today}, 승리: ${finalWinner})`,
            'value': `대진: ${aName} vs ${bName}, 스코어: [${match.lSco} : ${match.rSco}]`
        }

        result.push(content);
    });

    return result;
}