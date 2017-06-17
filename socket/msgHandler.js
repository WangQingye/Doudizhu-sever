/*消息发送类*/

// var loginHandler = require('../game/login/loginHandler');
var gameHandler = require('../game/game/gameSever');
var commands = require('./commands');
var events = require('events');
var emitter = new events.EventEmitter();

// addEvent(commands.REGISTER, loginHandler);
// addEvent(commands.LOGIN, loginHandler);
addEvent(commands.MATCH_PLAYER, gameHandler);
addEvent(commands.PLAY_GAME, gameHandler);

function addEvent(command, handler) {
    emitter.on(command, function (ws, data) {
        handler.handMsg(ws, data);
    })
}

exports.dispatch = function (command, ws, data) {
    emitter.emit(command, ws, data);
};


