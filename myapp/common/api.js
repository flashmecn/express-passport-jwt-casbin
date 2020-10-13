var core = require('./core');
var SqliteDB = require('./sqlite').SqliteDB;
var db = new SqliteDB(core.datapath);


// ******************API部分******************

//检查
exports.apiget = function (data) {
    return new Promise(function (resolve, reject) {
        var sql;
        if (data) {
            var _w = "";
            for (var k in data.route) {
                _w += ("'" + data.route[k] + "',")
            }
            sql = "select * from api where route in(" + _w.slice(0, -1) + ")";
        } else {//全部信息
            sql = "select * from api";
        }
        db.queryData(sql, function (row) {
            resolve(row);
        })
    })
}

//列出
exports.apilist = function (page) {
    return new Promise(function (resolve, reject) {
        var sql = "select * from api";
        db.queryData("Select COUNT(id) from api", function (len) {
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


//新增数据
exports.apiadd = function (data) {
    return new Promise(function (resolve, reject) {
        // 多条录入value:[[],[],...]
        var vv="";
        for(var i=0;i<data.key.length;i++){
            vv+="?,";
        }
        db.insertData('insert into api('+data.key.join()+') values('+vv.slice(0, -1)+')', data.value, function (err) {
            resolve(err);
        });
    })
}
//修改数据
exports.apiedit = function (data) {
    return new Promise(function (resolve, reject) {
        var str = "";
        for (var k in data.data) {
            str += (k + '="' + data.data[k] + '",')
        }
        db.executeSql('update api set ' + str.slice(0, -1) + ' where id=' + data.id, function (err) {
            resolve(err);
        });
    })
}
//删除数据
exports.apidel = function (data) {
    return new Promise(function (resolve, reject) {
        db.executeSql('DELETE FROM api WHERE id in(' + data + ')', function (err) {
            resolve(err);
        });
    })
}


// ******************角色部分******************

//检查
exports.roleget = function (data) {
    return new Promise(function (resolve, reject) {
        var sql;
        if (data) {
            var _w = "";
            for (var k in data.name) {
                _w += ("'" + data.name[k] + "',")
            }
            sql = "select * from role where name in(" + _w.slice(0, -1) + ")";
        } else {//全部信息
            sql = "select * from role";
        }
        db.queryData(sql, function (row) {
            resolve(row);
        })
    })
}

//列出
exports.rolelist = function (page) {
    return new Promise(function (resolve, reject) {
        var sql = "select * from role";
        db.queryData("Select COUNT(id) from role", function (len) {
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


//新增数据
exports.roleadd = function (data) {
    return new Promise(function (resolve, reject) {
        // 多条录入value:[[],[],...]
        var vv="";
        for(var i=0;i<data.key.length;i++){
            vv+="?,";
        }
        db.insertData('insert into role('+data.key.join()+') values('+vv.slice(0, -1)+')', data.value, function (err) {
            resolve(err);
        });
    })
}
//修改数据
exports.roleedit = function (data) {
    return new Promise(function (resolve, reject) {
        var str = "";
        for (var k in data.data) {
            str += (k + '="' + data.data[k] + '",')
        }
        db.executeSql('update role set ' + str.slice(0, -1) + ' where id=' + data.id, function (err) {
            resolve(err);
        });
    })
}
//删除数据
exports.roledel = function (data) {
    return new Promise(function (resolve, reject) {
        db.executeSql('DELETE FROM role WHERE id in(' + data + ')', function (err) {
            resolve(err);
        });
    })
}