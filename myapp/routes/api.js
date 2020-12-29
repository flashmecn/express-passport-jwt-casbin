var express = require('express');
var router = express.Router();
var path = require('path');

//加密模块
var crypto = require('crypto');

//用户权限模块
const casbin = require('casbin');
const authz = require('casbin-express-authz');
const enforcer = casbin.newEnforcer('./data/authz_model.conf', './data/authz_policy.csv');

var pass = require('../common/passport');
var core = require('../common/core');
var api = require('../common/api');

//用户管理页
router.get('/', function (req, res, next) {
    res.render('apilist', { menuactive: "menu_api" });
});

/* 修改用户页面. */
router.get('/edit', function (req, res, next) {
    res.render('apiedit');
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

//=================================拉取权限表

router.get('/p', function (req, res, next) {
    return core.awaiter(this, void 0, void 0, function* () {
        var e = yield enforcer;
        // if (global.policystate) {//当有变动时重新读取
        //     yield e.loadPolicy();
        //     global.policystate = false;
        // }
        var route = req.query.route;
        var subject;
        e.getAllSubjects().then(function (row) {
            subject = row;
            if (route) {
                return e.getFilteredPolicy(1, route.trim());
            } else {
                res.json({ state: true, msg: "权限表", roles: subject, policy: [] });
            }
        }).then(function (row) {
            res.json({ state: true, msg: "权限表", roles: subject, policy: row });
        })
    })
});

//=================================拉取数据列表（查）

router.get('/data', authz.authz({ newEnforcer: enforcer }), function (req, res, next) {
    var size = req.query.size;
    var page = req.query.page;
    var line = (size < 101 ? size : 100) * (page - 1);
    //获取列表并分页 Limit:读取条数 Offset:跳过条数
    api.sql.findAndCountAll({
        where: {
        },
        limit: size,
        offset: line,
        raw: true,
    }).then(function (result) {
        // success
        result.state = true;
        result.msg = "列出API";
        // result.user = req.user;
        res.json(result)
    }).catch(function (error) {
        res.json({ msg: '读取失败！' })
    });
});

//================================删除数据（删）

router.delete('/data', authz.authz({ newEnforcer: enforcer }), function (req, res, next) {
    return core.awaiter(this, void 0, void 0, function* () {
        var id = req.body.id;
        var apiroute = req.body.route;
        if (!id || !apiroute) {
            res.json({ msg: "未获得删除项！" });
            return;
        }
        id = id instanceof Array ? id : [id];
        var e = yield enforcer;
        if (apiroute instanceof Array) {
            for (var k in apiroute) {
                yield e.removeFilteredPolicy(1, apiroute[k]);
            }
        } else {
            yield e.removeFilteredPolicy(1, apiroute);
        }

        yield e.savePolicy();//保存新规则
        global.policystate = true;
        api.sql.destroy({
            where: {
                id: {
                    [api.Op.in]: id
                }
            }
        }).then(function (result) {
            res.json({ state: true, msg: "删除成功 " + result + "项" });
        }).catch(function (error) {
            res.json({ msg: "删除失败！" });
        })
    })
})


//================================新增数据（增）

router.post('/data', authz.authz({ newEnforcer: enforcer }), function (req, res, next) {
    var name = req.body.name.trim();
    var newroute = req.body.route.trim();

    if (!name || !newroute) {
        res.json({ msg: "请正确填写信息！" });
        return;
    }
    var body = req.body;
    editPolicy(body, newroute);
    //检查
    api.sql.findOne({
        where: {
            route: newroute
        },
        raw: true
    }).then(function (result) {
        if (result && result.route == newroute) {
            return { err: "已有此API！" };
        }
        //新增
        return api.sql.create({
            name: name,
            route: newroute,
        })

    }).then(function (result) {
        if (result && result.err) {
            res.json({ msg: result.err });
        } else {
            res.json({ state: true, msg: "新增成功" });
        }
    })
})


//================================修改数据（改）

router.put('/data', authz.authz({ newEnforcer: enforcer }), function (req, res, next) {

    var id = req.body.id.trim();
    var name = req.body.name.trim();
    var apiroute = req.body.api.trim();//原API
    var newroute = req.body.route.trim();//新API
    if (!id) {
        res.json({ msg: "未获得修改项！" });
        return;
    }
    var body = req.body;
    editPolicy(body, apiroute, newroute);

    var updata = { id: id, data: {} }
    name && (updata.data["name"] = name);
    if (newroute) {
        //检查重复API
        api.sql.findOne({
            where: {
                route: newroute
            },
            raw: true
        }).then(function (result) {
            if (result && result.route == newroute) {
                res.json({ msg: "已有此API！" });
                return;
            }
            updata.data["route"] = newroute;
            dataedit(updata, res);

        })
    } else if (name) {
        dataedit(updata, res);
    } else {
        res.json({ state: true, msg: "规则修改成功" });
    }


})
function dataedit(updata, res) {
    api.sql.update(updata.data, {
        where: {
            id: updata.id,
        }
    }).then(function(result){
        res.json({ state: true, msg: "修改成功" });
    })
}


//API规则
function editPolicy(body, apiroute, newroute) {
    return core.awaiter(this, void 0, void 0, function* () {
        //------API规则配置
        var e = yield enforcer;

        // console.log(yield e.getPolicy());
        const removed = yield e.removeFilteredPolicy(1, apiroute);//移除此API所有规则
        if (body) {
            for (var k in body) {
                var pp = k.toString();
                if (pp == "id" || pp == "name" || pp == "api" || pp == "route") {//排除非角色表单
                    continue;
                }
                if (body[k] instanceof Array) {
                    if (body[k].length == 4) {
                        yield e.addPolicy(pp, newroute || apiroute, "*")
                    } else {
                        for (var n in body[k]) {
                            yield e.addPolicy(pp, newroute || apiroute, body[k][n].toUpperCase())
                        }
                    }
                } else {
                    yield e.addPolicy(pp, newroute || apiroute, body[k].toUpperCase())
                }

            }
        }

        // console.log(yield e.getPolicy());
        yield e.savePolicy();//保存新规则
        global.policystate = true;
        //------
    })
}

module.exports = router;