
exports.key = "www.flashme.cn.20200607";//用于密码加密加盐
exports.datapath = "./data/flashme-data.db";

//邮件SMTP服务
exports.email = {
  service: 'smtp.qq.com',
  user: '168387321@qq.com',
  pass: ''
}

//检查用户名合法性
exports.confirmName = function (value) {
  var reg = /^([\u4E00-\uFA29]|[\uE7C7-\uE7F3]|[a-zA-Z0-9_-]){3,12}$/;
  var reg2 = /^(_|-|[0-9])/;
  if (!reg.test(value)) {
    return "名称不合法！限“中英文 数字 _-”3至12个字符";
  } else if (reg2.test(value)) {
    return "名称起始不允许数字及符号";
  } else {
    return true;
  }

}
//检查邮箱合法性
exports.confirmEmail = function (value) {
  var reg = /^([a-zA-Z0-9_-])+@([a-zA-Z0-9_-])+(.[a-zA-Z0-9_-])+/;
  if (!reg.test(value)) {
    return "邮箱格式不正确!";
  } else {
    return true;
  }

}
//过滤非法字符
exports.sqlstring = function (value) {
  var str=['"',"'","and","or","exec","insert","select","delete","update","count","chr","mid","master","truncate","char","declare","*","%",";","-","+",","];
  for (const k in str) {
    if(value.indexOf(str[k]) != -1){
      return "含非法字符!";
    } else {
      return true;
    }
  }
}

//随机字符串
exports.randomString = function (len) {
  len = len || 8;
  var $chars = 'ABCDEFGHJKLMNPQRSTWXYZabcdefhijkmnprstwxyz123456789';
  var maxPos = $chars.length;
  var pwd = '';
  for (i = 0; i < len; i++) {
    pwd += $chars.charAt(Math.floor(Math.random() * maxPos));
  }
  return pwd;
}

// 时间转换例子：
// Format("YYYY-MM-DD hh:mm:ss.S") ==> 2006-07-02 08:09:04.423
// Format("YYYY-M-D h:m:s.S")      ==> 2006-7-2 8:9:4.18
exports.dateFormat = function (fmt, _time) {
  var time = _time ? new Date(_time) : new Date();
  var o = {
      "M+": time.getMonth() + 1, //月
      "D+": time.getDate(), //日
      "h+": time.getHours(), //时
      "m+": time.getMinutes(), //分
      "s+": time.getSeconds(), //秒
      "q+": Math.floor((time.getMonth() + 3) / 3), //季度
      "S": time.getMilliseconds() //毫秒
  };
  if (/(Y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (time.getFullYear() + "").substr(4 - RegExp.$1.length));
  for (var k in o)
  if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
  return fmt;
}


/*
//异步改同步执行
return core.awaiter(this, void 0, void 0, function* () {yield})
*/
exports.awaiter = (this && this.awaiter) || function (thisArg, _arguments, P, generator) {
  function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
  return new (P || (P = Promise))(function (resolve, reject) {
    function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
    function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
    function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
}

