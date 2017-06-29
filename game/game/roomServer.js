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
    if(this.curPlayerIndex > 3)
    {
        this.curPlayerIndex = 1; //每次到4就变回1
    }
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
    NO_CARDS : -1, //前面没有牌（每次开始出牌）
    ERROR_CARDS : 0, //错误牌型
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
p.curCards = {type: CARD_TYPE.NO_CARDS, header:0, cards:[]};

p.initGame = function () {
    var cards = getNewCards54();
    this.p1Cards = cards.slice(0,17);
    this.p2Cards = cards.slice(17,34);
    this.p3Cards = cards.slice(34,51);
    this.dzCards = cards.slice(51,54);
    this.sendToOnePlayers(1, {command:commands.PLAY_GAME, content:{ state: 0, roomId: this.roomId, cards:this.p1Cards}});
    this.sendToOnePlayers(2, {command:commands.PLAY_GAME, content:{ state: 0, roomId: this.roomId,  cards:this.p2Cards}});
    this.sendToOnePlayers(3, {command:commands.PLAY_GAME, content:{ state: 0, roomId: this.roomId,  cards:this.p3Cards}});
    this.changeState(3);
};

//当前状态 2是结算，1是游戏中, 3是抢地主
p.changeState = function (state) {
    switch (state){
        case 1:
            this.sendToRoomPlayers({command:commands.PLAY_GAME, content:{ state:1, curPlayerIndex:this.curPlayerIndex, curCard:this.curCards }});
            break;
        case 2:
            this.sendToRoomPlayers({command:commands.ROOM_NOTIFY, content:{state:2}});
            break;
        case 3:
            this.curPlayerIndex = Math.ceil(Math.random() * 3);
            this.sendToRoomPlayers({command:commands.PLAYER_WANTDIZHU, content:{ state:3, curPlayerIndex:this.curPlayerIndex, nowScore:0}});
            break;
    }
};


//处理玩家请求
p.handlePlayersQuest = function (index, data) {
    var quest = data.command;
    var seq = data.seq;
    console.log('玩家的请求' + quest);
    switch(quest)
    {
        case commands.PLAYER_PLAYCARD:
            this.playCard(index, data.content.curCards, seq);
            break;
        case commands.PLAYER_WANTDIZHU:
            this.wantDizhu(index, data.content, seq);
            break;
    }
};

p.nowBigger = 0; //这个数据用来记录当前牌最大的那个人
p.passNum = 0; //这个数据用来记录有几个人点了pass，如果有2个，说明要重新出牌了。
p.playCard = function (index, curCards, seq) {
    //前后端都需要判断出牌是否符合规则
    // if(cardPlayAble(this["p"+index+"Cards"], content.cards))
    // {
    //
    // }
    console.log('告知玩家出牌成功');
    this.sendToOnePlayers(index, {command:commands.PLAYER_PLAYCARD, seq:seq, code:0});

    //如果出了牌，就替换最新的当前牌
    if(curCards.type !== -2)
    {
        this.curCards = curCards;
    }else//有人点击了过牌
    {
        this.passNum++;
        if(this.passNum === 1) //第一次点击的时候记录，第二次因为curindex已经变了所以不记录
        {
            this.nowBigger = this.curPlayerIndex - 1 < 1  ? 1 : this.curPlayerIndex - 1;
            console.log('有一个玩家点击了过牌现在牌最大的玩家是'+this.nowBigger);
            this.curCards.type = -2;
        }else if(this.passNum === 2) //连续两个人点击了过，说明要重新发起出牌流程，而起始就是之前最大的那个人
        {
            console.log('有两个玩家点击了过牌');
            this.passNum = 0;
            this.curPlayerIndex = this.nowBigger;
            this.sendToRoomPlayers({command:commands.PLAY_GAME, content:{ state:1, curPlayerIndex:this.curPlayerIndex, curCard:{type: CARD_TYPE.NO_CARDS, header:0, cards:[]}}});
            this.nowBigger = 0;
            return;
        }
    }
    //通知下一个玩家和出的牌
    this.addCurIndex();
    this.sendToRoomPlayers({command:commands.PLAY_GAME, content:{ state:1, curPlayerIndex:this.curPlayerIndex, curCard:this.curCards}});
};

p.nowScore = 0; //记录当前抢地主到几分了
p.dizhu = 0; //记录几号玩家是地主
p.wantDizhuTimes = 0; //记录是第几个玩家开始抢
p.wantDizhu = function (index, content, seq) {
    var score = content.score;
    this.wantDizhuTimes++;
    console.log('告知玩家叫分成功');
    this.sendToOnePlayers(index, {command:commands.PLAYER_WANTDIZHU, seq:seq, code:0});
    //到3分了说明有人已经抢到地主
    if(score ===3)
    {
        var cards = this['p'+index+'Cards'].concat(this.dzCards);
        console.log('dizhupai',cards);
        this.sendToOnePlayers(index, {command:commands.PLAY_GAME, content:{ state: 0, roomId: this.roomId, cards:cards}});
        this.dizhu = index;
        this.curPlayerIndex = index;
        this.changeState(1);
        return;
    }else if(score > this.nowScore)
    {
        this.nowScore = score;
        this.dizhu = index;
    }
    if(this.wantDizhuTimes === 3)
    {
        var cards1 = this['p'+index+'Cards'].concat(this.dzCards);
        console.log('dizhupai',cards1);
        this.sendToOnePlayers(index, {command:commands.PLAY_GAME, content:{ state: 0, roomId: this.roomId, cards:cards1}});
        this.sendToRoomPlayers({command:commands.PLAYER_WANTDIZHU, content:{ state:3, dizhu:this.curPlayerIndex, nowScore:this.nowScore}});
        this.changeState(1);
        console.log();
    }else
    {
        this.addCurIndex();
        this.sendToRoomPlayers({command:commands.PLAYER_WANTDIZHU, content:{ state:3, curPlayerIndex:this.curPlayerIndex, nowScore:this.nowScore}});
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
p.sendToOnePlayers = function (index, data) {
    console.log('132123', index);
    this.players[index - 1].ws.send(JSON.stringify(data));
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