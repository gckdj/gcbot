const { Events } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`[디스코드 준비완료: ${client.user.tag}]`);
    },
};