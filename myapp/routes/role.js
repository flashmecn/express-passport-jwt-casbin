var express = require('express');
var router = express.Router();
var path = require('path');

//加密模块
var crypto = require('crypto');

//用户权限模块
const casbin = require('casbin');
const authz = require('casbin-express-authz');
const enforcer = casbin.newEnforcer( './data/authz_model.conf', './data/authz_policy.csv');

const myData = require('../common/sql');

var pass = require('../common/passport');
var core = require('../common/core');
var role = require('../common/role');

//用户管理页
router.get('/', function (req, res, next) {
    res.render('rolelist', { menuactive: "menu_role" });
});

/* 修改用户页面. */
router.get('/edit', function (req, res, next) {
    res.render('roleedit');
});

//*
//=================================登录判断，给下面权限模块判断 res.locals.username
//*
router.all('*', pass.passport.authenticate('jwt', { session: false, failureRedirect: '/error/auth' }), (req, res, next) => {
    return core.awaiter(this, void 0, void 0, function* () {
		var e = yield enforcer;
		yield e.loadPolicy();
		res.locals.username = req.user.role;//获取角色
		// var token = pass.getToken(req.get('Authorization'));//解析用户token内的信息
		next();
	})
});


//=================================拉取角色表

router.get('/g', function (req, res, next) {
    return core.awaiter(this, void 0, void 0, function* () {
        var reqrole = req.query.role;
        var e = yield enforcer;
        // if (global.policystate) {//当权限有变动时重新读取
        //     yield e.loadPolicy();
        //     global.policystate = false;
        // }
        var subject;
        e.getAllSubjects().then(function (row) {
            subject = row;
            if (reqrole) {
                return e.getRolesForUser(reqrole.trim());
                // return e.getFilteredNamedGroupingPolicy('g', 0, role);
            } else {
                return [];
            }
        }).then(function (row) {
            res.json({ state: true, msg: "角色表", roles: subject, role: row });
        })
    })
});


//=================================拉取数据列表（查）

router.get('/data', authz.authz({ newEnforcer: enforcer }), function (req, res, next) {
    if (global.rolejson && global.rolejson.revised) {
        res.json({ state: true, msg: "列出数据", infor: global.rolejson.link });
    } else {
        role.sql.findAll({
            raw: true,
        }).then(function (rows) {
            global.rolejson = { revised: false, link: [] }
            getRoleJson(rows.reverse(), global.rolejson, '0,', res)
        })
    }
});
function getRoleJson(rows, json, level, res) {
    json.link = [];
    var len = rows.length;
    for (var i = len - 1; i >= 0; i--) {
        if (rows[i].level == level) {
            rows[i].title = rows[i].name;
            rows[i].id = rows[i].name;
            rows[i].name = 'rolesort';
            json.link.push(rows[i]);
            rows.splice(i, 1);
        }
    }
    if (len == rows.length) {
        json.link = false;
        return;
    }
    if (rows.length > 0) {
        // console.log("寻找定位 -> rows", rows)
        for (var n in json.link) {//寻找子集类目
            getRoleJson(rows, json.link[n], json.link[n].level + json.link[n].id + ',', res);
        }
    } else {
        global.rolejson.revised = true;
        res.json({ state: true, msg: "列出数据", infor: global.rolejson.link });
    }
}

//================================删除数据（删）

router.delete('/data', authz.authz({ newEnforcer: enforcer }), function (req, res, next) {
    return core.awaiter(this, void 0, void 0, function* () {
        res.json({ msg: "暂不开通删除角色！" });
        return;
        var id = req.body.id;
        var name = req.body.name;
        if (!id || !name) {
            res.json({ msg: "未获得删除项！" });
            return;
        }
        if (id.toString().trim() == "1" || (id instanceof Array && (id.indexOf("1") != -1 || id.indexOf(1) != -1))) {
            res.json({ msg: "禁止删除初始角色！" });
            return;
        }
        var e = yield enforcer;
        if (name instanceof Array) {
            for (var k in name) {
                yield e.deleteRolesForUser(name[k]);//移除此角色配属
            }
        } else {
            yield e.deleteRolesForUser(name);//移除此角色配属
        }

        yield e.savePolicy();//保存新规则
        api.roledel(typeof (id) == 'string' ? id.split(',') : id).then(function (err) {
            if (!err) {
                res.json({ state: true, msg: "删除成功" });
                // pass.resetUser();
            } else {
                res.json({ msg: "删除失败！" });
            }
        })
    })
})


//================================新增数据（增）

router.post('/data', authz.authz({ newEnforcer: enforcer }), function (req, res, next) {
    var name = req.body.name.trim();
    var level = req.body.level.trim();
    var explain = req.body.explain;

    if (!name || !level) {
        res.json({ msg: "请正确填写信息！" });
        return;
    }
    if (explain.toString().length > 50) {
        res.json({ msg: "说明字数超出50限制！" });
        return;
    }
    if (req.user.id != 1 && level.split(',').indexOf(req.user.role) == -1) {
        res.json({ msg: "越权操作！只能添加子集角色！" });
        return;
    }
    var regName = core.confirmName(name);
    if (name && regName != true) {
        res.json({ msg: regName });
        return;
    }
    var body = req.body;
    //检查
    role.sql.findOne({
        where: {
            name: name
        },
        raw: true
    }).then(function (result) {
        if (result && result.name == name) {
            return { err: "已有此角色！" };
        }
        //新增
        return role.sql.create({
            name: name,
            explain: explain,
            level: level,
        })

    }).then(function (result) {
        if (result && result.err) {
            res.json({ msg: result.err });
        } else {
            global.rolejson = {}
            editRoles(body, res, "新增成功");
        }
    })
})


//================================修改数据（改）

router.put('/data', authz.authz({ newEnforcer: enforcer }), function (req, res, next) {
    //======等级修改：
    var sortpath = req.body.sortpath;//新位置
    var sortid = req.body.sortid;//角色名
    if (sortpath && sortid) {
        if (sortpath.split(',').indexOf(sortid) != -1) {
            res.json({ msg: "不能移至自身及子集！" });
            return;
        }
        setlevel(req.body, req, res);
        return;
    }

    //======内容修改：
    var name = req.body.name;
    var explain = req.body.explain;
    if (!name) {
        res.json({ msg: "未获得修改项！" });
        return;
    }
    if (explain.toString().length > 50) {
        res.json({ msg: "说明字数超出50限制！" });
        return;
    }
    if(req.user.id != 1 && req.user.role == name){
        res.json({ msg: "无法操作自身角色！" });
        return;
    }
    //检查权限
    role.sql.findOne({
        where: {
            name: name
        },
        raw: true
    }).then(function (result) {
        //修改目标是否为用户子集
        if (req.user.id != 1 && result.level.split(',').indexOf(req.user.role) == -1) {
            return { err: "越权操作目标！" };
        }
        if (explain) {
            return role.sql.update({ explain: explain }, {
                where: {
                    name: name,
                }
            })
        } else {
            editRoles(req.body, res);
        }
    }).then(function (result) {
        if (result && result.err) {
            res.json({ state: false, msg: result.err });
        } else {
            editRoles(req.body, res, "修改成功");
        }
    }).catch(function (error) {
        res.json({ state: false, msg: "修改失败！" });
    })

})
function setlevel(body, req, res) {
    var oldsort, newsort;
    role.sql.findOne({
        where: {
            name: body.sortid
        },
        raw: true
    }).then(function (result) {
        //修改目标 | 迁移目标 是否为用户子集
        if (req.user.id != 1 && (result.level.split(',').indexOf(req.user.role) == -1 || body.sortpath.split(',').indexOf(req.user.role) == -1)) {
            return { err: "越权操作迁移！" };
        }
        oldsort = result.level + body.sortid + ',';
        newsort = body.sortpath + body.sortid + ',';
        //迁移目标
        return role.sql.update({ level: body.sortpath }, {
            where: {
                name: body.sortid,
            }
        })

    }).then(function (result) {
        if (result && result.err) {
            res.json({ msg: result.err });
        } else {
            //迁移子集
            return myData.query('UPDATE role SET level=replace(level,"' + oldsort + '","' + newsort + '") WHERE level LIKE "' + oldsort + '%"');
        }
    }).then(function (result) {

        global.rolejson = {}
        res.json({ state: true, msg: "迁移成功" });

    }).catch(function (error) {
        global.rolejson = {}
        res.json({ msg: "迁移失败！" });
    })

}
//角色规则配置
function editRoles(body, res, msg) {
    return core.awaiter(this, void 0, void 0, function* () {
        if(body.name == "root"){
            res.json({ state: true, msg: msg || "超级管理员已是最高权限" });
            return;
        }
        var e = yield enforcer;

        // console.log(yield e.getGroupingPolicy());
        const removed = yield e.deleteRolesForUser(body.name.trim());//移除此角色配属
        if (body.role) {
            if (body.role instanceof Array) {
                for (var k in body.role) {
                    yield e.addRoleForUser(body.name.trim(), body.role[k]);
                    // yield e.addNamedGroupingPolicy('g', body.name.trim(), body.role[k])
                }
            } else {
                yield e.addRoleForUser(body.name.trim(), body.role);
            }
        }

        // console.log(yield e.getGroupingPolicy());
        yield e.savePolicy();//保存新规则
        global.policystate = true;
        res.json({ state: true, msg: msg || "角色分配成功" });
        //------
    })
}


module.exports = router;