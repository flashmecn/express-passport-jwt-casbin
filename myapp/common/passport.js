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
        done(null, jwt_payload);

    });
    passport.use(strategy);

}

const limit = 7200;//token逾期2小时内可以续期

// JWT 验证
const jwt = require("jsonwebtoken");

function createToken(payload, now) {
    let created = now || Math.floor(Date.now() / 1000);
    payload.iat = created;
    payload.exp = created + 60 * 10;//token有效期10分钟
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
    passport, secret, createToken, startjwt, jwt, limit
}