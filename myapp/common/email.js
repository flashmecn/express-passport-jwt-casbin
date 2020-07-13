var core = require('./core');
var nodemailer = require('nodemailer');

var mailTransport = nodemailer.createTransport({
    host: core.email.service,
    secureConnection: true, // 使用SSL方式（安全方式，防止被窃取信息）
    auth: core.email,
});

var emailOptions = {
    from: core.email.user,
    to: '',//"用户1" <邮箱地址1>, "用户2" <邮箱地址2>
    // cc         : ''  //抄送
    // bcc      : ''    //密送
    subject: '一封来自夕空的邮件',
    text: '你好，一封来自夕空的邮件',
    html: '<h1>此邮件由flashme.cn发出</h1><br>',
    // attachments:
    //     [
    //         {
    //             filename: 'img1.png',            // 改成你的附件名
    //             path: 'public/images/img1.png',  // 改成你的附件路径
    //             cid: '00000001'                 // cid可被邮件使用
    //         },
    //         {
    //             filename: 'img2.png',            // 改成你的附件名
    //             path: 'public/images/img2.png',  // 改成你的附件路径
    //             cid: '00000002'                 // cid可被邮件使用
    //         },
    //     ]
};

function sendmail(options) {
    return new Promise(function (resolve, reject) {
        if (!options || !options.to) {
            return "请填写发送地址"
        }
        options = extend(emailOptions, options);
        mailTransport.sendMail(options, function (err, msg) {
            if (err) {
                console.log("ERROR：" + err);
                reject(err);
            }
            else {
                console.log("已发送：" + msg.accepted);
                resolve(msg);
            }
        });
    })
}

//合并object(已有, 新的)
function extend(a, b) {
    for (var key in b) {
        if (b.hasOwnProperty(key)) {
            a[key] = b[key];
        }
    }
    return a;
}

module.exports = {
    sendmail
}