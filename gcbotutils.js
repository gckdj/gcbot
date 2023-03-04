const { Random } = require("random-js");
const random = new Random();
const moment = require('moment');
const fetch = require('@replit/node-fetch');
require('moment-timezone');
moment.locale('ko');
moment.tz.setDefault("Asia/Seoul");

module.exports = {
    getFetch: () => {
        return fetch;
    },
    getMoment: () => {
        return moment;
    },
    getRandom: () => {
        return random;
    },
    getPlayerName: (member) => {
        if (member.nickname == null) {
            return member.user.username;
        } else {
            return member.nickname;
        }
    },
    getPlayerOptions: (members) => {
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
    },
    getMatchesResults: (matches, members) => {

        let result = [];

        matches.forEach(match => {
            const aP = members.get(match.aPlyr);
            const bP = members.get(match.bPlyr);

            const aName = module.exports.getPlayerName(aP);
            const bName = module.exports.getPlayerName(bP);

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
    },
    getFMatchResult: (matches, members) => {

        const result = [];

        matches.forEach(match => {
            const aP = members.get(match.aPlyr);
            const bP = members.get(match.bPlyr);

            const aName = module.exports.getPlayerName(aP);
            const bName = module.exports.getPlayerName(bP);

            let finalWinner = null;

            if (match.aPlyr === match.finalWinner) {
                finalWinner = aName;
            } else if (match.finalWinner === 'draw') {
                finalWinner = '무승부';
            } else {
                finalWinner = bName;
            }

            console.log(match);

            const nowMoment = moment(match.savedAt);
            const today = nowMoment.format('YYYY/MM/DD HH:mm:ss');

            const content = {
                'name': `${today}, 승 : ${finalWinner})`,
                'value': `[대진 : ${aName} vs ${bName}, 맵 : ${match.maps.name}]`
            }

            result.push(content);
        });

        return result;
    }
}