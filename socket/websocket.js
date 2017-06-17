/*基础websocket连接*/

var WebSocketServer = require('ws').Server;
var wss             = new WebSocketServer({port:8181});
//var wsPool          = require('./wsPool');
//var clients         = new wsPool(); //存放所有连接
var players         = []; //存放所有连接
var msgHandler      =  require('./msgHandler');

wss.on('connection', function (ws) {

    console.log('有一个用户连接上了');

    players.push(ws);

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

    ws.on('close', function () {
        players.splice(players.indexOf(ws),1);
    });
});
