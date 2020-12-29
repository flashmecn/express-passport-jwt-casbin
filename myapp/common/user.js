
// var core = require('./core');
// var SqliteDB = require('./sqlite').SqliteDB;
// var db = new SqliteDB(core.datapath);
//无数据库user则新建
// var createUser = "create table if not exists user(id INTEGER primary key autoincrement, name TEXT, password TEXT, email TEXT, time TIMESTAMP default (datetime('now', 'localtime')), ctime TIMESTAMP, role TEXT)";
// db.createTable(createUser);

const Sequelize = require('sequelize');
const myData = require('./sql');
const sql = myData.define('user', {
    id: {
        type: Sequelize.INTEGER,//设置类型
        primaryKey: true,//主键
        autoIncrement: true,//自增
        allowNull: false,//非空
    },
    name: { //用户名
        type: Sequelize.STRING,
        allowNull: false,
        unique: true, //唯一
    },
    email: { //邮箱
        type: Sequelize.STRING,
    },
    password: { //密码
        type: Sequelize.TEXT,
        allowNull: false,
    },
    role: { //角色
        type: Sequelize.STRING,
    },
    level: { //状态
        type: Sequelize.INTEGER,
        defaultValue: 1
    },
    dip: { //登录IP
        type: Sequelize.STRING,
    },
    dtime: { //登录时间
        type: Sequelize.INTEGER,
    },
    uptime: { //更新时间
        type: Sequelize.DATE,
    },
    created: { //创建时间
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW()
    },
}, {
    freezeTableName: true, //强制表名等于模型名
});


exports.Op = Sequelize.Op;

exports.sql = sql;

// //获取用户信息
// exports.userget = function (data, col) {
//     return new Promise(function (resolve, reject) {
//         var sql;
//         if (data) {//按用户名或邮箱查找
//             var name = "", email = "", id = "";
//             data.id && (id = data.id.join());
//             for (var k in data.name) {
//                 name += ("'" + data.name[k] + "',")
//             }
//             for (var n in data.email) {
//                 email += ("'" + data.email[n] + "',")
//             }
//             sql = "select " + (col || "id,name") + " from user where id in(" + id + ") or name in(" + name.slice(0, -1) + ") or email in(" + email.slice(0, -1) + ")";
//         } else {//全部信息
//             sql = "select * from user";
//         }
//         db.queryData(sql, function (row) {
//             resolve(row);
//         })
//     })
// }

// //新增注册用户
// exports.useradd = function (data) {
//     return new Promise(function (resolve, reject) {
//         // 多条录入value:[[],[],...]
//         var vv = "";
//         for (var i = 0; i < data.key.length; i++) {
//             vv += "?,";
//         }
//         db.insertData('insert into user(' + data.key.join() + ') values(' + vv.slice(0, -1) + ')', data.value, function (err) {
//             resolve(err);
//         });
//     })
// }
// //删除用户
// exports.userdel = function (data) {
//     return new Promise(function (resolve, reject) {
//         db.executeSql('DELETE FROM user WHERE id in(' + data + ')', function (err) {
//             resolve(err);
//         });
//     })
// }
// //修改用户
// exports.useredit = function (data, oldrole) {
//     return new Promise(function (resolve, reject) {
//         var str = "";
//         for (var k in data.data) {
//             str += (k + '="' + data.data[k] + '",')
//         }
//         db.executeSql('update user set ' + str.slice(0, -1) + ' where id=' + data.id + (oldrole ? ' and role="' + oldrole + '"' : ''), function (err) {
//             resolve(err);
//         });
//     })
// }
// //获取权限表role
// exports.getrole = function (name) {
//     return new Promise(function (resolve, reject) {
//         db.queryData('select * from role where name=' + name, function (row) {
//             resolve(row);
//         })
//     })
// }