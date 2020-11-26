var express = require('express');
var router = express.Router();
var path = require('path');

//加密模块
var crypto = require('crypto');

//用户权限模块
const casbin = require('casbin');
const authz = require('casbin-express-authz');
const enforcer = casbin.newEnforcer(path.join(__dirname, '../data/authz_model.conf'), path.join(__dirname, '../data/authz_policy.csv'));

var pass = require('../common/passport');
var core = require('../common/core');
var api = require('../common/api');

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
router.all('*', pass.passport.authenticate('jwt', { session: false, failureRedirect: '/error/auth?msg=登录过期！' }), (req, res, next) => {
    res.locals.username = req.user.role;//获取角色
    next();
});


//=================================拉取角色表

router.get('/g', function (req, res, next) {
    return core.awaiter(this, void 0, void 0, function* () {
        var role = req.query.role;
        var e = yield enforcer;
        if (global.policystate) {//当API权限有变动时重新读取角色
            yield e.loadPolicy();
            global.policystate = false;
        }
        var subject;
        e.getAllSubjects().then(function (row) {
            subject = row;
            if (role) {
                return e.getRolesForUser(role.trim());
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
        res.json({ state: true, msg: "列出数据", infor: global.rolejson.link, user: req.user });
    } else {
        api.rolelist().then(function (rows) {
            global.rolejson = { revised: false, link: [] }
            getRoleJson(rows.reverse(), global.rolejson, '0,', { req, res })
            // res.json({ state: true, msg: "列出数据", data: rolejson(rows, '0,'), user: req.user });
        })
    }
});
function getRoleJson(rows, json, level, rr) {
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
    // console.log("getRoleJson -> rows", rows)
    if (rows.length > 0) {
        for (var n in json.link) {//寻找子集类目
            // json[n].link = [];
            getRoleJson(rows, json.link[n], json.link[n].level + json.link[n].id + ',', rr);
        }
    } else {
        global.rolejson.revised = true;
        rr.res.json({ state: true, msg: "列出数据", infor: global.rolejson.link, user: rr.req.user });
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
    if (req.user.id != 1 && level.split(',').indexOf(req.user.role) != -1) {
        res.json({ msg: "越权操作！只能添加子集角色！" });
        return;
    }
    var regName = core.confirmName(name);
    if (name && regName) {
        res.json({ msg: regName });
        return;
    }
    var body = req.body;
    //检查
    api.roleget({ name: [name] }).then(function (row) {
        if (row[0] && row[0].name == name) {
            return "已有此角色！";
        }
        //新增
        return api.roleadd({ key: ['name', 'explain', 'level'], value: [[name, explain, level]] });

    }).then(function (err) {
        if (!err) {
            global.rolejson = {}
            editRoles(body, res, "新增成功");
        } else {
            res.json({ msg: err == "已有此角色！" ? err : "新增失败！" });
        }
    })
})


//================================修改数据（改）

router.put('/data', authz.authz({ newEnforcer: enforcer }), function (req, res, next) {
    //等级修改：
    var sortpath = req.body.sortpath;
    var sortid = req.body.sortid;
    if (sortpath && sortid) {
        if (sortpath.split(',').indexOf(sortid) != -1) {
            res.json({ msg: "不能移至自身及子集！" });
            return;
        }
        setlevel(req.body, req, res);
        return;
    }

    //内容修改：
    var id = req.body.id;
    var name = req.body.name;
    var explain = req.body.explain;
    if (!id || !name) {
        res.json({ msg: "未获得修改项！" });
        return;
    }
    if (explain.toString().length > 50) {
        res.json({ msg: "说明字数超出50限制！" });
        return;
    }
    api.roleget({ name: [name] }).then(function (row) {
        //修改目标是否为自己或用户子集
        if (req.user.id != 1 && req.user.role != name && row[0].level.split(',').indexOf(req.user.role) == -1) {
            res.json({ msg: "非法越权操作！" });
        }
        if (explain) {
            var updata = { name: name, data: { explain: explain } }
            api.roleedit(updata).then(function (err) {
                if (!err) {
                    editRoles(req.body, res, "修改成功");
                } else {
                    res.json({ state: false, msg: "修改失败！" });
                }
            })
        } else {
            editRoles(req.body, res);
        }
    })

})
function setlevel(body, req, res) {
    api.roleget({ name: [body.sortid] }).then(function (row) {
        //修改目标 | 迁移目标 是否为用户子集
        if (req.user.id != 1 && (row[0].level.split(',').indexOf(req.user.role) == -1 || body.sortpath.split(',').indexOf(req.user.role) == -1)) {
            return "非法越权操作！";
        }
        //迁移目标及其子集
        return api.rolelevel({ sortid: body.sortid, oldsort: row[0].level, newsort: body.sortpath });

    }).then(function (err) {
        if (!err) {
            global.rolejson = {}
            res.json({ state: true, msg: "迁移成功" });
        } else {
            res.json({ state: true, msg: err });
        }
    })

}
//角色规则配置
function editRoles(body, res, msg) {
    return core.awaiter(this, void 0, void 0, function* () {
        var e = yield enforcer;

        body.name == "root" && (body.role = "admin");//限制root角色就是admin权限

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