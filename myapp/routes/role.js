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
        var subject;
        e.getAllSubjects().then(function (row) {
            subject = row;
            if (role) {
                return e.getRolesForUser(role.trim());
                // return e.getFilteredNamedGroupingPolicy('g', 0, role);
            } else {
                res.json({ state: true, msg: "角色表", roles: subject, role: [] });
            }
        }).then(function (row) {
            res.json({ state: true, msg: "角色表", roles: subject, role: row });
        })
    })
});


//=================================拉取数据列表（查）

router.get('/data', authz.authz({ newEnforcer: enforcer }), function (req, res, next) {
    var size = req.query.size.trim();
    var page = req.query.page.trim();
    api.rolelist({ size: size, num: page }).then(function (rows) {
        res.json({ state: true, msg: "列出数据", length: rows.length, data: rows.rows });
    })
});

//================================删除数据（删）

router.delete('/data', authz.authz({ newEnforcer: enforcer }), function (req, res, next) {
    return core.awaiter(this, void 0, void 0, function* () {
        var id = req.body.id;
        var name = req.body.name;
        if (!id || !name) {
            res.json({ msg: "未获得删除项！" });
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
        api.roledel(typeof(id)=='string'?id.split(','):id).then(function (err) {
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
    var explain = req.body.explain;

    if (!name) {
        res.json({ msg: "请正确填写信息！" });
        return;
    }
    if(explain.toString().length>100){
        res.json({ msg: "说明字数超出100限制！" });
        return;
    }
    var body = req.body;
    //检查
    api.roleget({ name: [name] }).then(function (row) {
        if (row[0] && row[0].name == name) {
            res.json({ msg: "已有此角色！" });
            return;
        }
        //新增
        return api.roleadd([name, explain]);

    }).then(function (err) {
        if (!err) {
            editRoles(body, res, "新增成功");
        } else {
            res.json({ msg: "新增失败！" });
        }
    })
})


//================================修改数据（改）

router.put('/data', authz.authz({ newEnforcer: enforcer }), function (req, res, next) {

    var id = req.body.id;
    var name = req.body.name;
    var explain = req.body.explain;
    if (!id || !name) {
        res.json({ msg: "未获得修改项！" });
        return;
    }
    if(explain.toString().length>100){
        res.json({ msg: "说明字数超出100限制！" });
        return;
    }
    if(explain){
        var updata = { id: id.trim(), data: {explain:explain} }
        api.roleedit(updata).then(function (err) {
            if (!err) {
                editRoles(req.body, res, "修改成功");
            } else {
                res.json({ state: false, msg: "修改失败！" });
            }
        })
    }else{
        editRoles(req.body, res);
    }

})
//角色规则配置
function editRoles(body, res, msg) {
    return core.awaiter(this, void 0, void 0, function* () {
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
        res.json({ state:true, msg: msg||"角色分配成功" });
        //------
    })
}


module.exports = router;