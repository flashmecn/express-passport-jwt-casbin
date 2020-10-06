var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var session = require('express-session');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// 配置session(需要配置在路由之前)
app.use(session({
  secret: 'SECRETdver987irfvd092',
  name: 'flashme',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000*60*60 }
}));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/error', require('./routes/error'));
app.use('/users', usersRouter);
app.use('/login', require('./routes/login'));
app.use('/api', require('./routes/api'));
app.use('/role', require('./routes/role'));



var pass = require('./common/passport');
var bodyParser = require("body-parser");

//用户验证相关
// pass.resetUser();//获取全部用户数据，开发时启用可一直保持有token数据比对
app.use(pass.passport.initialize());

// parse application/x-www-form-urlencoded
// for easier testing with Postman or plain HTML forms
app.use(bodyParser.urlencoded({
  extended: true
}));

// parse application/json
app.use(bodyParser.json())


// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});





module.exports = app;

// 以下是开发时替代 module.exports=app
// 全局安装 npm install nodemon -g
// 根目录放置nodemon.json > 启动：nodemon app.js

// var debug = require('debug')('my-application'); // debug模块
// app.set('port', process.env.PORT || 3000); // 设定监听端口
// //启动监听
// var server = app.listen(app.get('port'), function () {
//   debug('Express server listening on port ' + server.address().port);
// });
