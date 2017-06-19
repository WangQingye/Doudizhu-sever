/**
* 单个房间管理
* */

var wss = require('../../socket/websocket');
var commands = require('../../socket/commands');


var RoomServer = function () {

};

var p = RoomServer.prototype;

//房间信息
p.roomId = 0;

//玩家信息
p.players = [];
p.p1Cards = [];
p.p2Cards = [];
p.p3Cards = [];
p.dzCards = [];

//当前信息
p.curPlayerIndex = 1; //暂时初始为1，游戏进程中为1，2，3
p.addCurIndex = function () {
    this.curPlayerIndex++;
    this.curPlayerIndex = this.curPlayerIndex % 4;
};
/** 关于正在出的牌
 * 初步想法是记录牌型：
 * 单，对，三带一，顺子，连对，飞机，四带二，炸弹
 * 顺子连队飞机的话必须数量对上（除开炸弹，毕竟炸弹不讲道理的）
 * 然后按照斗地主的规则，记录最小的一张（头子）
 * 特例：4443,记录4 ; 666654，记录6
 * */

//先定义可能出现的牌型
const CARD_TYPE = {
    //各种牌型的对应数字
    NO_CARDS : 0, //错误牌型
    SINGLE_CARD : 1, //单牌
    DOUBLE_CARD : 2, //对子
    THREE_CARD : 3,//3不带
    THREE_ONE_CARD : 4,//3带1
    THREE_TWO_CARD : 5, //3带2
    BOMB_TWO_CARD : 6, //四个带2张单牌
    BOMB_FOUR_CARD : 7, //四个带2对
    CONNECT_CARD : 8, //连牌
    COMPANY_CARD : 9, //连队
    AIRCRAFT_CARD : 10, //飞机不带
    AIRCRAFT_WING : 11, //飞机带单牌或对子
    BOMB_CARD : 12, //炸弹
    KINGBOMB_CARD : 13//王炸
};
//只记录最小的一张，特例比如4443，要记录4，注意这里的index是跟curPlayerIndex不一样
p.curCard = {type: CARD_TYPE.NO_CARDS, small:0};

p.initGame = function () {
    var cards = getNewCards54();
    this.p1Cards = cards.slice(0,17);
    this.p2Cards = cards.slice(17,34);
    this.p3Cards = cards.slice(34,51);
    this.dzCards = cards.slice(51,54);
    this.sendToOnePlayers({command:commands.ROOM_NOTIFY, content:{ state: 0, cards:this.p1Cards}}, 0);
    this.sendToOnePlayers({command:commands.ROOM_NOTIFY, content:{ state: 0, cards:this.p2Cards}}, 1);
    this.sendToOnePlayers({command:commands.ROOM_NOTIFY, content:{ state: 0, cards:this.p3Cards}}, 2);
    this.changeState(1);
};

//当前状态 2是结算，1是游戏中, 0是第一次发牌
p.changeState = function (state) {
    switch (state){
        case 1:
            this.sendToRoomPlayers({command:commands.PLAY_GAME, content:{ state:1, curPlayerIndex:this.curPlayerIndex, curCard:this.curCard }});
            break;
        case 2:
            this.sendToRoomPlayers({command:commands.ROOM_NOTIFY, content:{state:2}});
            break;
    }
};


//向房间的所有玩家发送信息
p.sendToRoomPlayers = function (data) {
    for(var i = 0; i < this.players.length; i++)
    {
        this.players[i].ws.send(JSON.stringify(data));
    }
};

//向房间的某一个玩家发送信息
p.sendToOnePlayers = function (data, index) {
    this.players[index].ws.send(JSON.stringify(data));
};

//处理玩家请求
p.handlePlayersQuest = function (index, data) {
    var quest = data.content.quest;
    var seq = data.seq;
    switch(quest)
    {
        case commands.PLAYER_PLAYCARD:
            this.playCard(index, data.content.cards, seq);
            break;
        case commands.PLAYER_WANTDIZHU:
            this.wantDizhu(index, data.content, seq);
            break;
    }
};

p.playCard = function (index, cards, seq) {
    //前后端都需要判断出牌是否符合规则
    // if(cardPlayAble(this["p"+index+"Cards"], content.cards))
    // {
    //
    // }
    //告知玩家出牌成功
    this.sendToOnePlayers(index, {command:commands.PLAYER_PLAYCARD, seq:seq, code:0});
    //通知下一个出牌玩家和出的牌
    this.addCurIndex();
    this.sendToRoomPlayers({command:commands.ROOM_NOTIFY, content:{ state:1, curPlayerIndex:this.curPlayerIndex, curCard:this.curCard}});
};




//取得一组打乱的牌(开局时)
function getNewCards54() {
    var arr = [];
    for( var i = 1; i < 55; i++)
    {
        arr.push(i);
    }
    arr = arr.shuffle();
    return arr;
}
//打乱算法
if (!Array.prototype.shuffle) {
    Array.prototype.shuffle = function() {
        for(var j, x, i = this.length; i; j = parseInt(Math.random() * i), x = this[--i], this[i] = this[j], this[j] = x);
        return this;
    };
}

module.exports = RoomServer;