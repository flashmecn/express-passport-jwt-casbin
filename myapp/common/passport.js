const secret = "www.flashme.cn.20200519";//用于token加密加盐

var user = require('../common/user');

var base64url = require("base64url");
var passport = require("passport");
var passportJWT = require("passport-jwt");

var ExtractJwt = passportJWT.ExtractJwt;
var JwtStrategy = passportJWT.Strategy;


var jwtOptions = {}
jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
jwtOptions.secretOrKey = secret;

//获取数据库账户数据
function resetUser(where) {
    return new Promise(function (resolve, reject) {
        user.userget(where ? where : null).then(function (row) {

            var strategy = new JwtStrategy(jwtOptions, function (jwt_payload, done) {
                // usually this would be a database call:
                var user = row.find(user => user.id === jwt_payload.id);
                if (user) {
                    done(null, user);
                } else {
                    done(null, false);
                }
            });
            passport.use(strategy);

            if (row.length > 0) {
                resolve(row);
            }else{
                reject();
            }

        })
    })

}





// JWT 验证
const jwt = require("jsonwebtoken");

function createToken(payload) {
    let created = Math.floor(Date.now() / 1000);
    payload.iat = created;
    payload.exp = created + 60 * 60 * 2;//token有效期2小时
    return jwt.sign(payload, secret);
}

// function checkToken(token) {
//     return new Promise((resolve, reject) => {
//         jwt.verify(token, secret, (err, res) => {
//             if (!err) {
//                 console.log("checkToken -> res", res)
//                 resolve(res)
//             } else {
//                 console.log("checkToken -> err", res)
//                 reject("token验证失败");
//             }
//         })
//     })
// }



//解析token
function getToken(token) {
    // let token = localStorage.getJson('token');
    if (!token) {
        return undefined;
    }

    let parts = token.split('.');
    if (parts.length !== 3) {
        return undefined;
    }

    let payload = parts[1];
    return JSON.parse(base64url.decode(payload));
}


module.exports = {
    passport, secret, createToken, resetUser, getToken
}