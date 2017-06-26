/*消息发送类*/

// var loginHandler = require('../game/login/loginHandler');
var gameSever = require('../game/game/gameSever');
var commands = require('./commands');
var events = require('events');
var emitter = new events.EventEmitter();

// addEvent(commands.REGISTER, loginHandler);
// addEvent(commands.LOGIN, loginHandler);
addEvent(commands.MATCH_PLAYER, gameSever);
addEvent(commands.PLAY_GAME, gameSever);
addEvent(commands.WS_CLOSE, gameSever);
addEvent(commands.PLAYER_PLAYCARD, gameSever);

function addEvent(command, handler) {
    emitter.on(command, function (ws, data) {
        handler.handMsg(ws, data);
    })
}

exports.dispatch = function (command, ws, data) {
    emitter.emit(command, ws, data);
};


