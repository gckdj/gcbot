const { Client, GatewayIntentBits, Events, ModalBuilder, TextInputBuilder, TextInputStyle, interaction, EmbedBuilder, REST, Routes, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { commands, maps } = require('./command.js');
const keepAlive = require('./server.js');
const moment = require('moment');
require('moment-timezone');
moment.locale('ko');
moment.tz.setDefault("Asia/Seoul");

const mongoose = require('mongoose');
const ScMatch = require('./schemas/scmatch.js');

const applicaitonId = process.env['application_id'];
const token = process.env['token'];
const clientId = process.env['client_id'];
const uri = process.env['uri'];

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers,] });
const rest = new REST({ version: '10' }).setToken(token);

mongoose.connect(uri, {
    dbName: 'Gcbot',
    useNewUrlParser: true,
}, (err) => {
    if (err) {
        console.error('mongodb connection error', err);
    }
    console.log('mongodb connected');
});

mongoose.connection.on('open', function() {
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

        const embed = new EmbedBuilder()
            .setColor('Red')
            .setTitle('맵 리스트')
            .setURL('https://910map.tistory.com/')
            .addFields(
                { name: '(2)신 단장의 능선 2.2', value: 'ASL15 Official', inline: false },
                { name: '(3)Neo_Sylphid 3.0', value: 'ASL15 Official', inline: false },
                { name: '(4)Retro 0.95', value: 'ASL15 Official', inline: false },
                { name: '(4)Vermeer SE 2.1', value: 'ASL15 Official', inline: false },
                { name: '(4)투혼 1.3', value: '시즌11 래더공식맵', inline: false }, // eud 투혼맵
                // 컨셉맵 (76), 다크오리진, 알레그로, 폴리포이드
            )

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

            let description = null;
            let name = null;

            const nowMoment = moment(match.savedAt);
            const today = nowMoment.format('YYYY/MM/DD HH:mm:ss');
            
            if (lSco >= 2) {
                name = `${today}, 승리: ${finalWinner})`;
                description = `대진: ${aName} vs ${bName}, 스코어: [${lSco} : ${rSco}]`;
            } else {
                name = `${today}, 승리: ${finalWinner})`;
                description = `대진: ${aName} vs ${bName}, 스코어: [${lSco} : ${rSco}]`;
            }

            const content = {
                'name': name,
                'value': description
            }

            result.push(content);
        });

        let matchList = new EmbedBuilder()
            .setColor('Red')
            .setTitle('매치 결과조회')
            .setDescription('최근 매치결과입니다.(최대 10개)')
            .setTimestamp();

        result.forEach(item => {
            matchList.addFields(item);
        });

        interaction.reply({ embeds: [matchList] });
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
        let selectMaps = maps.slice();
        let matchMaps = [];

        for (let i = 0; i < 3; i++) {
            let random = Math.floor(Math.random() * selectMaps.length);
            matchMaps.push(selectMaps[random]);
            selectMaps.splice(random, 1);
        }

        const nice = new EmbedBuilder()
            .setColor('Red')
            .setURL('https://910map.tistory.com/')
            .setTitle('맵 선택결과')
            .addFields(
                { name: '1경기', value: matchMaps[0].value },
                { name: '2경기', value: matchMaps[1].value },
                { name: '3경기', value: matchMaps[2].value },
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

            await ScMatch.updateOne({ _id: key }, { 'isComplete': true, 'savedAt': new Date(), 'cGm': null });

            const resultEmbed = new EmbedBuilder()
                .setColor('Red')
                .setTitle('저장된 매치결과')
                .setDescription(today)
                .addFields(
                    { name: '매치업', value: `${aName} vs ${bName}` },
                    { name: '1세트: ' + match.maps[0].label, value: winner },
                    { name: '2세트: ' + match.maps[1].label, value: winner },
                    { name: '3세트: ' + match.maps[2].label, value: '경기없음' },
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

        const resultEmbed = new EmbedBuilder()
            .setColor('Red')
            .setTitle('저장된 매치결과')
            .setDescription(today)
            .addFields(
                { name: '매치업', value: `${aName} vs ${bName}` },
                { name: '1세트: ' + match.maps[0].label, value: fWinner },
                { name: '2세트: ' + match.maps[1].label, value: sWinner },
                { name: '3세트: ' + match.maps[2].label, value: tWinner },
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