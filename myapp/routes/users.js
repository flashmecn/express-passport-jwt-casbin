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
var user = require('../common/user');
var core = require('../common/core');
var role = require('../common/role');


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
router.all('*', pass.passport.authenticate('jwt', { session: false, failureRedirect: '/error/auth' }), (req, res, next) => {
	return core.awaiter(this, void 0, void 0, function* () {
		var e = yield enforcer;
		yield e.loadPolicy();
		res.locals.username = req.user.role;//获取角色
		// var token = pass.getToken(req.get('Authorization'));//解析用户token内的信息
		next();
	})
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
	var size = req.query.size;
	var page = req.query.page;
	var line = (size < 101 ? size : 100) * (page - 1);
	//获取列表并分页 Limit:读取条数 Offset:跳过条数
	user.sql.findAndCountAll({
		where: {
		},
		limit: size,
		offset: line,
		raw: true,
		attributes: { exclude: ['password'] } //  排除字段
	}).then(function (result) {
		// success
		result.state = true;
		result.msg = "获取用户数据";
		// result.user = req.user;
		res.json(result)
	}).catch(function (error) {
		res.json({ msg: '读取失败！' })
	});
});

//================================新增账户（增）

router.post('/data', authz.authz({ newEnforcer: enforcer }), function (req, res, next) {
	var name = req.body.name.trim();
	var email = req.body.email.trim();
	var password = req.body.password.trim();
	var role = req.body.role.trim();
	var level = req.body.level ? req.body.level : 0;
	var rolesort = req.body.rolesort;
	//检查迁移目标是否为可操作子集 并排除自己
	if (req.user.id != 1 && (rolesort.indexOf(req.user.role) == -1 || rolesort == req.user.role || rolesort[rolesort.length - 1] == req.user.role)) {
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
	if (regName != true) {
		res.json({ msg: regName });
		return;
	}
	if (email && regEmail != true) {
		res.json({ msg: regEmail });
		return;
	}

	//检查账户
	user.sql.findOne({
		where: {
			[user.Op.or]: [
				{ name: name || '00' },
				{ email: email || '00' }
			]
		},
		raw: true,
		attributes: ['id', 'name', 'email']
	}).then(function (result) {
		if (result && result.name == name) {
			return { err: "已有此用户名！" };
		} else if (result && result.email == email) {
			return { err: "此邮箱已注册！" };
		}
		// Hmac加密
		var hash = crypto.createHmac('sha512', core.key)
		hash.update(password)
		var miwen = hash.digest('hex')
		//新增账户
		return user.sql.create({
			name: name,
			email: email,
			password: miwen,
			role: role,
			level: level
		})
	}).then(function (result) {
		if (result && result.err) {
			res.json({ msg: result.err });
		} else {
			res.json({ state: true, msg: "新增成功" });
		}
	}).catch(function (error) {
		console.log(error);
		res.json({ msg: "新增失败！" });
	})

})

//================================删除账户（删）

router.delete('/data', authz.authz({ newEnforcer: enforcer }), function (req, res, next) {
	var id = req.body.id;
	id = id instanceof Array ? id : [id];
	if (id.indexOf("1") != -1 || id.indexOf(1) != -1) {
		res.json({ msg: "禁止删除初始管理员！" });
		return;
	}
	user.sql.destroy({
		where: {
			id: {
				[user.Op.in]: id
			}
		}
	}).then(function (result) {
		res.json({ state: true, msg: "删除成功 " + result + "项" });
	}).catch(function (error) {
		res.json({ msg: "删除失败！" });
	})
})


//================================修改账户（改）

router.put('/data', authz.authz({ newEnforcer: enforcer }), function (req, res, next) {
	var body = {};
	body.id = Number(req.body.id);
	body.name = req.body.name;
	body.email = req.body.email;
	body.password = req.body.password;
	body.uptime = req.body.uptime;
	body.oldrole = req.body.oldrole || null;
	body.role = req.body.role;
	body.level = req.body.level ? req.body.level : (body.id != 1 ? 0 : 1);
	var rolesort = req.body.rolesort;
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
	if (body.name && regName != true) {
		res.json({ msg: regName });
		return;
	}
	if (body.email && regEmail != true) {
		res.json({ msg: regEmail });
		return;
	}
	if (body.password && body.password.length < 6) {
		res.json({ msg: "密码需至少6位！" });
		return;
	}

	//暂时只对角色的操作限制权限
	//只允许操作子集用户角色
	if (body.role && body.role != body.oldrole && body.oldrole) {
		//检查迁移目标是否为可操作子集 并排除自己
		if (req.user.id != 1 && (rolesort.indexOf(req.user.role) == -1 || rolesort == req.user.role || rolesort[rolesort.length - 1] == req.user.role)) {
			res.json({ msg: "只能移至下级附属角色！" });
			return;
		}
		if (body.id == 1) {
			res.json({ msg: "超级管理员角色禁止修改！" });
			return;
		}
		//检查操作目标用户是否为登录用户的子集
		role.sql.findOne({
			where: {
				name: body.oldrole
			},
			raw: true
		}).then(function (result) {
			if (req.user.id != 1 && result && result.level.split(',').indexOf(req.user.role) == -1) {
				res.json({ msg: "越权操作角色！" });
				return;
			}
			if (result) {
				setuser(body, req, res);
			} else {
				res.json({ msg: "空操作项！" });
			}
		})
	} else {
		req.user.role != "root" && (body.role = false);
		setuser(body, req, res);
	}


})

function setuser(body, req, res) {
	var updata = { where: { id: body.id }, data: { level: body.level, uptime: body.uptime } }
	body.oldrole && (updata.where.role = body.oldrole)
	body.role && (updata.data.role = body.role.trim())
	if (body.password) {
		// Hmac加密
		var hash = crypto.createHmac('sha512', core.key)
		hash.update(body.password)
		var miwen = hash.digest('hex')
		updata.data["password"] = miwen;
	}
	body.name = body.name.trim();
	body.email = body.email.trim();
	if (body.name || body.email) {
		//检查账户
		user.sql.findOne({
			where: {
				[user.Op.or]: [
					{ name: body.name || '00' },
					{ email: body.email || '00' }
				]
			},
			raw: true,
			attributes: ['id', 'name', 'email']
		}).then(function (result) {
			if (result && result.name == body.name) {
				res.json({ msg: "已有此用户名！" });
				return;
			}
			if (result && result.email == body.email) {
				res.json({ msg: "此邮箱已注册！" });
				return;
			}
			body.name && (updata.data["name"] = body.name);
			body.email && (updata.data["email"] = body.email);
			useredit(updata, res);
		}).catch(function (error) {
			// error
			console.log('err:', error)
		});

	} else {
		useredit(updata, res);
	}
}
function useredit(updata, res) {
	user.sql.update(updata.data, {
		where: updata.where
	}).then(function (result) {
		res.json({ state: true, msg: "修改成功" });
	}).catch(function (error) {
		res.json({ msg: "修改失败！" });
	});
}


module.exports = router;
