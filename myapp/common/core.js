
exports.key = "www.flashme.cn.20200607";//用于密码加密加盐
exports.datapath = "./data/flashme-data.db";


//检查用户名合法性
exports.confirmName=function(value) {
  var reg = /^([\u4E00-\uFA29]|[\uE7C7-\uE7F3]|[a-zA-Z0-9_-]){3,12}$/;
  var reg2 = /^(_|-|[0-9])/;
  if (!reg.test(value)) {
    return "有户名不合法！限“中英文 数字 _-”3至12个字符";
  } else if (reg2.test(value)) {
    return "用户名起始不允许数字及符号";
  } else {
    return false;
  }

}
//检查邮箱合法性
exports.confirmEmail=function(value) {
  var reg = /^([a-zA-Z0-9_-])+@([a-zA-Z0-9_-])+(.[a-zA-Z0-9_-])+/;
  if (!reg.test(value)) {
    return "邮箱格式不正确!";
  } else {
    return false;
  }

}


/*
//异步改同步执行
return core.awaiter(this, void 0, void 0, function* () {yield})
*/
exports.awaiter = function (thisArg, _arguments, P, generator) {
  function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
  return new (P || (P = Promise))(function (resolve, reject) {
    function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
    function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
    function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
}

