var express = require('express');
var router = express.Router();

var core = require('../common/core');
var user = require('../common/user');
var api = require('../common/api');
var role = require('../common/role');
//加密模块
var crypto = require('crypto');

router.get('/', function (req, res, next) {
	// res.send('安装口已关闭 <a href="/">回首页<a>');
	// return;

	var setup;
	// 安装用户表
	user.sql.sync().then(function () {
		// Hmac加密
		var hash = crypto.createHmac('sha512', core.key)
		hash.update('111111')
		var miwen = hash.digest('hex')
		//新增初始管理员账户
		return user.sql.create({
			name: 'admin',
			email: '168387321@qq.com',
			password: miwen,
			role: 'root',
			level: 1
		})
	}).then(function () {
		if(!setup){
			setup=true;
			resend(true, res)
		}
	}).catch(function () {
		if(!setup){
			setup=true;
			resend(false, res)
		}
	})

	// 安装api表
	api.sql.sync().then(function () {
		//新增默认api
		return api.sql.bulkCreate([
			{ name: '用户管理', route: '/admin/users/data*' },
			{ name: 'API管理', route: '/admin/api/data*' },
			{ name: '角色分配', route: '/admin/role/data*' }
		]);
	}).then(function () {
		if(!setup){
			setup=true;
			resend(true, res)
		}
	}).catch(function () {
		if(!setup){
			setup=true;
			resend(false, res)
		}
	})

	// 安装role表
	role.sql.sync().then(function () {
		//新增最高默认权限
		return role.sql.create({
			name: 'root',
			explain: '拥有最高权限',
			level: '0,'
		})
	}).then(function () {
		if(!setup){
			setup=true;
			resend(true, res)
		}
	}).catch(function () {
		if(!setup){
			setup=true;
			resend(false, res)
		}
	})

});

function resend(setup, res){
	if(setup){
		res.send('系统安装完毕 <a href="/">回首页<a> <a href="/login">去登录<a><p>初始管理员: admin 密码: 111111 (建议登录后修改)</p>');
	}else{
		res.send('系统已安装过了 <a href="/">回首页<a> <a href="/login">去登录<a>');
	}

}


module.exports = router;