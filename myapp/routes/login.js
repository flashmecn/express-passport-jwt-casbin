var express = require('express');
var router = express.Router();

//加密模块
var crypto = require('crypto');
//访问次数限制模块
const rateLimit = require("express-rate-limit");

var pass = require('../common/passport');
var user = require('../common/user');
var core = require('../common/core');
var toemail = require('../common/email');


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
    if(core.sqlstring(name) != true){
        res.json({ msg: "含非法字符！" });
        return;
    }
    var _where = {};
    core.confirmEmail(name) == true ? _where.email = name : _where.name = name;

    //验证token的用户信息
    var payload,created;
    var theuser;
    user.sql.findOne({
		where: _where,
		raw: true,
		attributes: ['id', 'name', ['password','key'], 'email', 'role', 'dip']
	}).then(function (result) {
        theuser = result;
        if(!theuser){
            return {err: "没有此用户！"};
        }

        // Hmac加密
        var hash = crypto.createHmac('sha512', core.key)
        hash.update(password)
        var miwen = hash.digest('hex')

        if (theuser.key === miwen) {
            payload = { id: theuser.id, key: theuser.key.substr(0,6), ip: req.ip };
            created = Math.floor(Date.now() / 1000);
            return user.sql.update({ dip: req.ip, dtime: created }, {
                fields: ['dip','dtime'], //允许更新字段
                where: {
                    id: theuser.id
                }
            })
        } else {
            return {err: "密码错误！"};
            // res.status(401).json({ msg: "密码错误！" });
        }
    }).then(function(result){
        if (result && result.err) {
            res.json({ state: false, msg: result.err||"登录失败！" });
        } else {
            var token = pass.createToken(payload, created);
            delete theuser.key;
            res.json({ state: true, msg: "登录信息", token: token, user: theuser });
        }
    })
});


//===============================================用户注册START

function usercheck(obj) {
    return new Promise(function (resolve, reject) {
        if (!obj.name || !obj.password || !obj.email) {
            reject({ err: "请正确填写注册信息！" });
            return;
        }
        if(core.sqlstring(name) != true){
            res.json({ msg: "含非法字符！" });
            return;
        }
        if (obj.password.length < 6) {
            reject({ err: "密码需至少6位！" });
            return;
        }
        //验证用户名及邮箱合法性
        var regName = core.confirmName(obj.name);
        var regEmail = core.confirmEmail(obj.email);
        if (regName != true) {
            reject({ err: regName });
            return;
        }
        if (regEmail != true) {
            reject({ err: regEmail });
            return;
        }
        //检查账户
		user.sql.findOne({
			where: {
				[user.Op.or]: [
					{ name: obj.name || '00' },
					{ email: obj.email || '00' }
				]
			},
			raw: true,
			attributes: ['id', 'name', 'email']
		}).then(function (result) {
			if (result && result.name == obj.name) {
				reject({ err: "已有此用户名！" });
				return;
			}
			if (result && result.email == obj.email) {
				reject({ err: "此邮箱已注册！" });
				return;
			}

            resolve();

        })
    })
}


const createAccountLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1小时后开放
    max: 20, // 限制20次请求
    message: "您的注册请求次数过多！",
    onLimitReached: function (req, res, options) {
        res.json({ msg: options.message });
    }
});

//=================================用户注册POST口

router.post('/register', createAccountLimiter, function (req, res, next) {

    var name = req.body.name.trim();
    var password = req.body.password.trim();
    var email = req.body.email.trim();

    usercheck({ name: name, password: password, email: email }).then(function () {
        req.session.register_name = name;
        res.redirect(307, "useradd");
    }).catch(function (params) {
        res.json({ msg: params.err });
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
    var name = req.body.name;
    var password = req.body.password;
    var email = req.body.email;

    if(req.session.register_name == name){
        delete req.session.register_name;
        // Hmac加密
        var hash = crypto.createHmac('sha512', core.key)
        hash.update(password)
        var miwen = hash.digest('hex')
        //新增账户
        return user.sql.create({
			name: name,
			email: email,
			password: miwen
		}).then(function () {
            res.json({ state: true, msg: "注册成功" });
        })
    }else{
        res.json({ msg: "非法进入！" });
    }
})
//===============================================用户注册END


//================找回密码

const mailLimiter = rateLimit({
    windowMs: 60 * 1000, // 1分钟
    max: 1, // 限制请求次数
    message: "请1分钟后重试"
});
router.post('/repass', mailLimiter, function (req, res, next) {
    var email = req.body.email.trim();
    var regEmail = core.confirmEmail(email);
    if (regEmail != true) {
        res.json({ msg: regEmail });
        return;
    }

    //检查账户
    var verify, userid;

    user.sql.findOne({
        where: {
            email: email
        },
        raw: true,
        attributes: ['id', 'name', 'email', 'password']
    }).then(function (result) {
        if (!result) {
            return { err: "此邮箱未注册！" };
        }
        userid = result.id;
        verify = core.randomString(6);//生成随机码
        if(result.password == 'pass'){
            return { msg: "简单重置" };
        }
        //发送邮件
        return toemail.sendmail({
            subject: 'flashme.cn 密码找回验证', to: '"用户1" <' + email + '>',
            html: '<div style="width: 300px;margin: 20px auto;line-height: 1.7;background: #eee;text-align: center;"><h3>验证码</h3><h2>' + verify + '</h2><h4>此邮件来自：<a href="http://www.flashme.cn">flashme.cn</a></h4></div>'
        })

    }).then(function (result) {
        if(result && result.err){
            res.json({ msg: result.err });
            return;
        }
        req.session.verify = {code:verify, email:email, id:userid}
        if(result && result.msg=="简单重置"){
            res.json({ state: true, msg: verify });
            return;
        }
        res.json({ state: true, msg: "发送成功" });
    }, function (err) {
        res.json({ state: false, msg: "发送失败！" + err });
    });
})

const mailLimiter2 = rateLimit({
    windowMs: 60 * 1000, // 1分钟
    max: 3, // 限制请求次数
    message: "多次验证错误！请1分钟后重试",
    onLimitReached: function (req, res, options) {
        res.json({ msg: options.message });
    }
});
router.post('/repassword', mailLimiter2, function (req, res, next) {
    var email = req.body.email.trim();
    var verify = req.body.verify.trim();
    var password = req.body.password.trim();
    if (email != req.session.verify.email || verify != req.session.verify.code) {
        res.json({ msg: "验证失败！" });
        return;
    }
    if (password && password.length < 6) {
        res.json({ msg: "密码需至少6位！" });
        return;
    }
    // Hmac加密
    var hash = crypto.createHmac('sha512', core.key)
    hash.update(password)
    var miwen = hash.digest('hex')

    user.sql.update({ password: miwen }, {
        where: {
            id: req.session.verify.id
        }
    }).then(function (result) {
        delete req.session.verify;
        res.json({ state: true, msg: "修改成功" });
    }).catch(function (err) {
        delete req.session.verify;
        res.json({ state: false, msg: "修改失败！" });
    })
})


module.exports = router;