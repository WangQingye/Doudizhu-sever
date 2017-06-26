/*基础websocket连接*/

var WebSocketServer = require('ws').Server;
var wss             = new WebSocketServer({port:8181});
//var wsPool          = require('./wsPool');
//var clients         = new wsPool(); //存放所有连接
var players         = []; //存放所有连接
var msgHandler      =  require('./msgHandler');
var commands = require('../socket/commands');

wss.on('connection', function (ws) {

    players.push(ws);

    console.log('当前总人数' + players.length);

    ws.on('message', function (message) {
        try{
            var data = JSON.parse(message);
        }catch (e)
        {
            console.log('消息格式错误');
        }
        var command = data.command;
        msgHandler.dispatch(command, ws, data);
    });

    /**有玩家退出要把他移除队列*/
    ws.on('close', function () {
        players.splice(players.indexOf(ws),1);
        var data = {};
        data.command = commands.WS_CLOSE;
        msgHandler.dispatch(commands.WS_CLOSE, ws, data);
    });
});
