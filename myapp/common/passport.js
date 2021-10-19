const secret = "www.flashme.cn.20200519";//用于token加密加盐

var user = require('../common/user');

// var base64url = require("base64url");
var passport = require("passport");
var passportJWT = require("passport-jwt");



//获取数据库账户数据
function startjwt() {
    var ExtractJwt = passportJWT.ExtractJwt;
    var JwtStrategy = passportJWT.Strategy;
    var jwtOptions = {}
    jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
    jwtOptions.secretOrKey = secret;
    var strategy = new JwtStrategy(jwtOptions, function (jwt_payload, done) {
        // usually this would be a database call:
        user.sql.findOne({
            where: { id: jwt_payload.id },
            raw: true,
            attributes: ['id', 'name', ['password','key'], 'email', 'role', 'level', 'dip', 'dtime']
        }).then(function (row) {
            // var user = row.find(user => user.id === jwt_payload.id);
            // 必须启用状态 & 密码头一致性 & 登陆IP一致性 & 只允许最后登录用户或续签密码
            row && (row.key = row.key.substr(0,6))
            if (row && row.level != 0 && jwt_payload.key == row.key && jwt_payload.ip == row.dip && (jwt_payload.iat == row.dtime || jwt_payload.auto == true)) {
                done(null, row);
            } else {
                done(null, false);
            }
        })

    });
    passport.use(strategy);

}


// JWT 验证
const jwt = require("jsonwebtoken");

function createToken(payload, now) {
    let created = now || Math.floor(Date.now() / 1000);
    payload.iat = created;
    payload.exp = created + 60 * 60 * 2;//token有效期2小时
    return jwt.sign(payload, secret);
}

// function checkToken(token) {
//     return new Promise((resolve, reject) => {
//         jwt.verify(token, secret, err => {
//             if (!err) {
//                 resolve()
//             } else {
//                 reject("token验证失败");
//             }
//         })
//     })
// }


//解析token
// function getToken(token) {
//     // let token = localStorage.getJson('token');
//     if (!token) {
//         return undefined;
//     }

//     let parts = token.split('.');
//     if (parts.length !== 3) {
//         return undefined;
//     }

//     let payload = parts[1];
//     return JSON.parse(base64url.decode(payload));
// }


module.exports = {
    passport, secret, createToken, startjwt, jwt
}