var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: '用户登录验证及权限演示平台' });
});

module.exports = router;
