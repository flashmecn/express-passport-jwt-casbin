var express = require('express');
var router = express.Router();

//加密模块
var crypto = require('crypto');
//访问次数限制模块
const rateLimit = require("express-rate-limit");

var pass = require('../common/passport');
var user = require('../common/user');
var core = require('../common/core');


/* 登录页面. */
router.get('/', function (req, res, next) {
    res.render('login', { msg: "" });
});



//========================================用户登录POST

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 10, // 限制10次请求
    message: "此IP请求登录次数过多，请15分钟后重试"
});
router.post('/', apiLimiter, function (req, res, next) {

    var name = req.body.name.trim();
    var password = req.body.password.trim();
    if (!name || !password) {
        res.json({ msg: "请填写登陆名与密码！" });
        return;
    }
    var json = {};
    !core.confirmEmail(name) ? json.email = [name] : json.name = [name];

    //验证token的用户信息
    pass.resetUser(json).then(function (row) {
        // usually this would be a database call:
        // var theuser = row.find(age => age.name === name);
        var theuser = row[0];

        // Hmac加密
        var hash = crypto.createHmac('sha512', core.key)
        hash.update(password)
        var miwen = hash.digest('hex')


        if (theuser.password === miwen) {
            // from now on we'll identify the user by the id and the id is the only personalized value that goes into our token
            var payload = { id: theuser.id };
            var token = pass.createToken(payload);
            res.json({ state: true, msg: "登录成功", token: token });
        } else {
            res.json({ msg: "密码错误！" });
            // res.status(401).json({ msg: "密码错误！" });
            // res.redirect('/error');
        }
    },function () {
        res.json({ msg: "没有此用户！" });
    })
});


//===============================================用户注册START

function usercheck(obj, res) {
    return new Promise(function (resolve, reject) {
        if (!obj.name || !obj.password || !obj.email) {
            res.json({ msg: "请正确填写注册信息！" });
            return;
        }
        if (obj.password.length < 6) {
            res.json({ msg: "密码需至少6位！" });
            return;
        }
        //验证用户名及邮箱合法性
        var regName = core.confirmName(obj.name);
        var regEmail = core.confirmEmail(obj.email);
        if (regName) {
            res.json({ msg: regName });
            return;
        }
        if (regEmail) {
            res.json({ msg: regEmail });
            return;
        }
        //检查账户
        user.userget({ name: [obj.name], email: [obj.email] }).then(function (row) {
            // usually this would be a database call:
            if (row[0] && row[0].name == obj.name) {
                res.json({ msg: "已有此用户名！" });
                return;
            }
            if (row[0] && row[0].email == obj.email) {
                res.json({ msg: "此邮箱已注册！" });
                return;
            }

            resolve();


        })
    })
}


const createAccountLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1小时后开放
    max: 20, // 限制20次请求
    message: "您的请求注册次数过多！",
    onLimitReached: function (req, res, options) {
        res.json({ msg: options.message });
    }
});

//=================================用户注册POST口

router.post('/register', createAccountLimiter, function (req, res, next) {

    var name = req.body.name.trim();
    var password = req.body.password.trim();
    var email = req.body.email.trim();

    usercheck({ name: name, password: password, email: email }, res).then(function () {
        res.redirect(307, "useradd");
    })

})
//用户注册最终新增口
const limiter = rateLimit({
    windowMs: 12 * 60 * 60 * 1000, // 12小时后开放
    max: 1, // 限制1次请求
    // skipFailedRequests = true, //不计算失败的请求
    // skipSuccessfulRequests = true, //不计算成功的请求
    message: "一天只能注册一个账号！",
    onLimitReached: function (req, res, options) {
        res.json({ msg: options.message });
    }
});
router.post('/useradd', limiter, function (req, res, next) {
    var name = req.body.name.trim();
    var password = req.body.password.trim();
    var email = req.body.email.trim();

    usercheck({ name: name, password: password, email: email }, res).then(function () {

        // Hmac加密
        var hash = crypto.createHmac('sha512', core.key)
        hash.update(password)
        var miwen = hash.digest('hex')
        //新增账户
        return user.useradd([name, email, miwen])

    }).then(function (err) {
        if (!err) {
            res.json({ state: true, msg: "注册成功" });
            // pass.resetUser();//更新验证token的用户信息
        } else {
            res.json({ msg: "注册失败！" });
        }
    })
})
//===============================================用户注册END

module.exports = router;