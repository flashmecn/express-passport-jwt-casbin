
var core = require('./core');
var SqliteDB = require('./sqlite').SqliteDB;
var db = new SqliteDB(core.datapath);
//无数据库user则新建
// var createUser = "create table if not exists user(id INTEGER primary key autoincrement, name TEXT, password TEXT, email TEXT, time TIMESTAMP default (datetime('now', 'localtime')), ctime TIMESTAMP, role TEXT)";
// db.createTable(createUser);

//获取用户信息
exports.userget = function (data,col) {
    return new Promise(function (resolve, reject) {
        var sql;
        if (data) {//按用户名或邮箱查找
            var name = "", email = "", id = "";
            data.id && (id=data.id.join());
            for (var k in data.name) {
                name += ("'" + data.name[k] + "',")
            }
            for (var n in data.email) {
                email += ("'" + data.email[n] + "',")
            }
            sql = "select "+(col||"id,name")+" from user where id in(" + id + ") or name in(" + name.slice(0, -1) + ") or email in(" + email.slice(0, -1) + ")";
        } else {//全部信息
            sql = "select * from user";
        }
        db.queryData(sql, function (row) {
            resolve(row);
        })
    })
}
exports.userlist = function (page) {
    return new Promise(function (resolve, reject) {
        var sql = "select id,name,email,time,ctime,role,level from user";
        db.queryData("Select COUNT(id) from user", function (len) {
            var length = len[0]['COUNT(id)'];
            var line = (page.size<101?page.size:100) * (page.num-1);
            if (length > 0 && line <= length) {
                //获取列表并分页 Limit:读取条数 Offset:跳过条数
                sql += ' Limit ' + page.size + ' Offset ' + line;
                db.queryData(sql, function (row) {
                    resolve({ length: length, rows: row });
                })
            } else {
                resolve({ length: length, row: [] });
            }

        })
    })
}
//新增注册用户
exports.useradd = function (data) {
    return new Promise(function (resolve, reject) {
        // 多条录入value:[[],[],...]
        var vv="";
        for(var i=0;i<data.key.length;i++){
            vv+="?,";
        }
        db.insertData('insert into user('+data.key.join()+') values('+vv.slice(0, -1)+')', data.value, function (err) {
            resolve(err);
        });
    })
}
//删除用户
exports.userdel = function (data) {
    return new Promise(function (resolve, reject) {
        db.executeSql('DELETE FROM user WHERE id in(' + data + ')', function (err) {
            resolve(err);
        });
    })
}
//修改用户
exports.useredit = function (data) {
    return new Promise(function (resolve, reject) {
        var str = "";
        for (var k in data.data) {
            str += (k + '="' + data.data[k] + '",')
        }
        db.executeSql('update user set ' + str.slice(0, -1) + ' where id=' + data.id, function (err) {
            resolve(err);
        });
    })
}
//获取权限表role
exports.getrole = function () {
    return new Promise(function (resolve, reject) {
        db.queryData('select * from role', function (row) {
            resolve(row);
        })
    })
}