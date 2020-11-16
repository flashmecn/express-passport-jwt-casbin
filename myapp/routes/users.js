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
var user = require('../common/user');
var core = require('../common/core');
var api = require('../common/api');


//用户管理页
router.get('/', function (req, res, next) {
  res.render('userlist', { menuactive: "menu_user" });
});

/* 修改用户页面. */
router.get('/edit', function (req, res, next) {
  res.render('useredit');
});



//*
//=================================登录判断，给下面权限模块判断 res.locals.username
//*
router.all('*', pass.passport.authenticate('jwt', { session: false, failureRedirect: '/error/auth?msg=请先登录！' }), (req, res, next) => {
  res.locals.username = req.user.role;//获取角色
  // var token = pass.getToken(req.get('Authorization'));//解析用户token内的信息
  next();
});

router.post('/', function (req, res, next) {
  var theuser = {
    id: req.user.id,
    name: req.user.name,
    email: req.user.email
  };
  res.json({ state: true, msg: "登录信息", user: theuser });
});

//=================================拉取用户列表（查）

router.get('/data', authz.authz({ newEnforcer: enforcer }), function (req, res, next) {
  var size = req.query.size.trim();
  var page = req.query.page.trim();
  user.userlist({ size: size, num: page }).then(function (rows) {
    res.json({ state: true, msg: "获取用户数据", length: rows.length, data: rows.rows, user: req.user });
  })
});

//================================新增账户（增）

router.post('/data', authz.authz({ newEnforcer: enforcer }), function (req, res, next) {
  var name = req.body.name.trim();
  var email = req.body.email.trim();
  var password = req.body.password.trim();
  var role = req.body.role.trim();
  var level = req.body.level ? req.body.level : 0;
	var rolesort = req.body.rolesort ? ((req.body.rolesort instanceof Array ? req.body.rolesort.join() : req.body.rolesort) + ',') : '';
	rolesort = '0,' + rolesort;
  //检查迁移目标是否为可操作子集 并排除自己
  if (req.user.id != 1 && (rolesort.indexOf(req.user.role + ',') == -1 || req.body.rolesort == req.user.role || req.body.rolesort[req.body.rolesort.length-1] == req.user.role)) {
    res.json({ msg: "只能移至下级附属角色！" });
    return;
  }

  if (!name || !password) {
    res.json({ msg: "请正确填写注册信息！" });
    return;
  }
  if (password.length < 6) {
    res.json({ msg: "密码需至少6位！" });
    return;
  }
  //验证用户名合法性
  var regName = core.confirmName(name);
  var regEmail = core.confirmEmail(email);
  if (regName) {
    res.json({ msg: regName });
    return;
  }
  if (email && regEmail) {
    res.json({ msg: regEmail });
    return;
  }

  //检查账户
  user.userget({ name: [name || '00'], email: [email || '00'] }).then(function (row) {
    // usually this would be a database call:
    if (row[0] && row[0].name == name) {
      res.json({ msg: "已有此用户名！" });
      return;
    }
    if (row[0] && row[0].email == email) {
      res.json({ msg: "此邮箱已注册！" });
      return;
    }
    // Hmac加密
    var hash = crypto.createHmac('sha512', core.key)
    hash.update(password)
    var miwen = hash.digest('hex')
    //新增账户
    return user.useradd({ key: ['name', 'email', 'password', 'role', 'level'], value: [[name, email, miwen, role, level]] });

  }).then(function (err) {
    if (!err) {
      res.json({ state: true, msg: "新增成功" });
      // pass.resetUser();
    } else {
      res.json({ msg: "新增失败！" });
    }
  })
})

//================================删除账户（删）

router.delete('/data', authz.authz({ newEnforcer: enforcer }), function (req, res, next) {
  var id = req.body.id;
  if (id.toString().trim() == "1" || (id instanceof Array && (id.indexOf("1") != -1 || id.indexOf(1) != -1))) {
    res.json({ msg: "禁止删除初始管理员！" });
    return;
  }
  user.userdel(id).then(function (err) {
    if (!err) {
      res.json({ state: true, msg: "删除成功" });
      // pass.resetUser();
    } else {
      res.json({ msg: "删除失败！" });
    }
  })
})


//================================修改账户（改）

router.put('/data', authz.authz({ newEnforcer: enforcer }), function (req, res, next) {
  console.log(req.body);
  var body = {};
  body.id = req.body.id;
  body.name = req.body.name;
  body.email = req.body.email;
  body.password = req.body.password;
  body.oldrole = req.body.oldrole;
  body.role = req.body.role;
  body.level = req.body.level ? req.body.level : (body.id != 1 ? 0 : 1);
	var rolesort = req.body.rolesort ? ((req.body.rolesort instanceof Array ? req.body.rolesort.join() : req.body.rolesort) + ',') : '';
	body.rolesort = '0,' + rolesort;
  if (!body.id) {
    res.json({ msg: "没有修改信息！" });
    return;
  }
  if (req.user.id != 1 && body.id == 1) {
    res.json({ msg: "您无权限修改初始管理员！" });
    return;
  }
  //验证用户名合法性
  var regName = core.confirmName(body.name);
  var regEmail = core.confirmEmail(body.email);
  if (body.name && regName) {
    res.json({ msg: regName });
    return;
  }
  if (body.email && regEmail) {
    res.json({ msg: regEmail });
    return;
  }
  if (body.password && body.password.length < 6) {
    res.json({ msg: "密码需至少6位！" });
    return;
  }

  //暂时只对角色的操作限制权限
  //只允许操作子集用户角色
  if (body.role && req.user.id != 1 && req.user.role != body.oldrole) {
    //检查迁移目标是否为可操作子集 并排除自己
    if (body.rolesort.indexOf(req.user.role + ',') == -1 || req.body.rolesort == req.user.role || req.body.rolesort[req.body.rolesort.length-1] == req.user.role) {
      res.json({ msg: "只能移至下级附属角色！" });
      return;
    }
    //检查操作目标用户是否为登录用户的子集
    api.roleget({ name: [body.oldrole] }).then(function (row) {
      if (row[0].level.indexOf(req.user.role + ',') == -1) {
        res.json({ msg: "越权操作角色！" });
        return;
      }

      setuser(body, req, res);
    })
  }else{
    req.user.id != 1 && (body.role=false);
    setuser(body, req, res);
  }


})

function setuser(body, req, res) {
  var updata = { id: body.id, oldrole:body.oldrole, data: { level: body.level } }
  body.role && (updata.data.role = body.role.trim())
  if (body.password) {
    // Hmac加密
    var hash = crypto.createHmac('sha512', core.key)
    hash.update(body.password)
    var miwen = hash.digest('hex')
    updata.data["password"] = miwen;
  }
  if (body.name || body.email) {
    //检查账户
    user.userget({ name: [body.name.trim() || '00'], email: [body.email.trim() || '00'] }).then(function (row) {
      // usually this would be a database call:
      if (row[0] && row[0].name == body.name.trim()) {
        res.json({ msg: "已有此用户名！" });
        return;
      }
      if (row[0] && row[0].email == body.email.trim()) {
        res.json({ msg: "此邮箱已注册！" });
        return;
      }
      body.name && (updata.data["name"] = body.name.trim());
      body.email && (updata.data["email"] = body.email.trim());
      useredit(updata, res);
    })
  } else {
    useredit(updata, res);
  }
}
function useredit(updata, res) {
  user.useredit(updata, updata.oldrole).then(function (err) {
    if (!err) {
      res.json({ state: true, msg: "修改成功" });
      // pass.resetUser();
    } else {
      res.json({ state: false, msg: "修改失败！" });
    }
  })
}


module.exports = router;
