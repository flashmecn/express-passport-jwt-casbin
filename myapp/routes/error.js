var express = require('express');
var router = express.Router();

var user = require('../common/user');
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
                    let payload = pass.jwt.decode(token);
                    //逾期2小时内匹配数据库后自动续签token
                    if ((Math.floor(Date.now() / 1000) - payload.exp) < pass.limit) {
                        user.sql.findOne({
                            where: { id: payload.id },
                            raw: true,
                            attributes: ['id', 'name', ['password','key'], 'email', 'role', 'level', 'dip', 'dtime']
                        }).then(function (row) {
                            // var user = row.find(user => user.id === jwt_payload.id);
                            // 必须启用状态 & 密码头一致性 & 登陆IP一致性 & 只允许最后登录用户或续签密码
                            if (row && row.level != 0 && payload.key == row.key.substr(0,6) && payload.ip == row.dip) {
                                token = pass.createToken(payload)
                                res.statusCode = 200;
                                res.setHeader('Content-Type', 'application/json')
                                res.json({ state: true, token: token, msg: '刷新token' })
                            } else {
                                res.statusCode = 401;
                                res.json({ code: 401, msg: '登录不合规！' })
                            }
                        })
                    } else {
                        res.statusCode = 401;
                        res.json({ code: 401, msg: '登录已过期！' })
                    }

                    break;
                case 'NotBeforeError':
                    // console.log("------NotBeforeError")
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