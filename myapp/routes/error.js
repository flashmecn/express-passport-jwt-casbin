var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function (req, res, next) {
    res.send('出错啦! <a href="/">回首页<a>');
});
router.get('/auth', function (req, res, next) {
    var msg=req.query.msg;
    if(msg){
        res.json({ msg: msg });
        return;
    }
    res.json({msg:'验证用户失败！'});
});

module.exports = router;