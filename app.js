var express =require('express');
var app = express();

var wss = require('./socket/websocket');

app.listen(3000);
console.log('sever start');