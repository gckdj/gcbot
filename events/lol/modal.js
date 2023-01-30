const { Events } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction) {
        if (!interaction.isModalSubmit()) {
            return; 
        };

        const data = [];

        for (const [key, value] of interaction.fields.fields) {
            console.log(key);
            console.log(value);
            
            // data.push({ value.customId: value.value });
        }

        console.log(data);


        // const res = interaction;
        // const mems = res.get('membersInput').value.split(',');
        // let isWin = 0;

        // if (res.get('resultInput').value === '승리') {
        //     isWin = 1;
        // }
        // const data = { 'top': mems[0], 'jug': mems[1], 'mid': mems[2], 'adc': mems[3], 'spt': mems[4], 'name': res.get('othersideInput').value, 'isWin': isWin, 'captureUrl': res.get('urlInput').value, 'savedAt': new Date() }

        // await LOLSet.insertOne(data, (err, docs) => {
        //     if (err) {
        //         console.log(err);
        //     }
        // });

        // await interaction.reply({ content: '기록 입력이 완료되었습니다.' });

        // if (submitted) {
        //     const test = Object.keys(fields).map(key => {
        //         console.log(key);
        //         console.log(submitted.fields);
        //         console.log(interaction.getTextInputValue(fields[key].custom_id));
                
        //         // await submitted.reply({
        //         //     content: `Your age is ${age}, and your name is ${name}. Hi!`
        //         // });
        //     });
        // }
    }
}