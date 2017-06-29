/**
 * Created by wqy on 2017/6/15.
 */
var commands = require('../../socket/commands');
var RoomServer = require('./roomServer');


exports.handMsg = function (ws, data) {
    var command = data.command;
    switch (command)
    {
        case commands.MATCH_PLAYER:
            matchPlayer(ws, data.content.name, data.seq, function (err, seq, players, roomId) {
                if(err)
                {
                    console.log('匹配失败');
                }else
                {
                    var resp = {command:commands.MATCH_PLAYER, code:0, seq:seq, content:{players:players, roomId:roomId}};
                    ws.send(JSON.stringify(resp));
                }
            });
            break;
        case commands.PLAY_GAME:
        case commands.PLAYER_PLAYCARD:
        case commands.PLAYER_WANTDIZHU:
            playGame(ws, data);
            break;
        case commands.WS_CLOSE:
            /**如果他还在排队就移除排队队列*/
            if (queue.indexOf(ws) !== -1)
            {
                queue.splice(queue.indexOf(ws),1);
            }
            break;
    }
};


var queue = []; //当前匹配队列
var rooms = {}; //所有房间
var roomIndex = 1; //房间编号

function matchPlayer(ws, name, seq, callBack) {
    queue.push({ws:ws, name:name, seq:seq, callback:callBack});

    console.log('当前玩家数:' + queue.length);

    //队列每到3人就分配一个房间
    if(queue.length === 3)
    {
        var names = [queue[0].name, queue[1].name,queue[2].name];
        var players = [queue[0], queue[1], queue[2]];
        var roomPlayers = [];
        for(var i = 0; i < 3; i++)
        {
            players[i].callback(null, queue[i].seq, names, roomIndex);
            roomPlayers.push({ws:players[i].ws, name:players[i].name});
        }

        var room = new RoomServer();
        room.roomId = roomIndex;
        roomIndex++;
        rooms[room.roomId] = room;
        room.players = roomPlayers;
        room.initGame();
        queue = [];//每匹配到一次玩家就清空一次排队队列
    }
}

function playGame(ws, data) {
    console.log('收到玩家关于游戏内的消息' + JSON.stringify(data));
    var roomId = data.content.roomId;
    var index = data.content.index;
    var name = data.content.name;
    //如果发出的请求和接收的链接不同则不执行
    if(name !== ws.name)
    {
        console.log( name + '玩家发送了不对的信息');
        return;
    }
    var room = rooms[roomId];
    if(room)
    {
        console.log("房间" + roomId + '的' + index + '号位玩家发出请求' + JSON.stringify(data));
        room.handlePlayersQuest(index, data);
    }
}

/*玩家退出队列，要将其移除*/
function userExit(name) {
    for(var i = 0; i < queue.length; i++)
    {
        if(queue[i].name === name)
        {
            queue.splice(i,1);
            break;
        }
    }
}