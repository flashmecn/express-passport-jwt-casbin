var express = require('express');
var router = express.Router();

var pass = require('../common/passport');

/* GET users listing. */
router.get('/', function (req, res, next) {
    res.send('出错啦! <a href="/">回首页<a>');
});
router.get('/auth', function (req, res, next) {
    // var msg=req.query.msg;
    let rawToken = req.headers.authorization;
    if (!rawToken || rawToken.split(' ').length<2 || rawToken.split(' ')[1]=='null') {
        res.statusCode = 403
        res.json({ code: 403, msg: 'error for get token !' })
    } else {
        let token = rawToken.split(' ')[1]
        pass.jwt.verify(token, pass.secret, err => {
            switch (err.name) {
                case 'TokenExpiredError':
                // console.log("------TokenExpiredError")
                case 'NotBeforeError':
                    let payload = pass.jwt.decode(token);
                    //逾期1小时内自动续签token
                    if ((Math.floor(Date.now() / 1000) - payload.exp) < 60 * 60) {
                        token = pass.createToken({ id: payload.id, auto: true, key: payload.key, ip:payload.ip })
                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'application/json')
                        res.json({ state: true, token: token, msg: '刷新token' })
                    } else {
                        res.statusCode = 401;
                        res.json({ code: 401, msg: '登录已过期！' })
                    }

                    break;
                case 'JsonWebTokenError':
                // console.log("------JsonWebTokenError")
                default:
                    res.statusCode = 401
                    res.json({ code: 401, msg: 'token错误' })
                    break;
            }
        })
    }
});

module.exports = router;