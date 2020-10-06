//获取用户个人数据
$.ajax({
    type: "POST",
    url: "/users",
    headers: {
        Authorization: "Bearer " + window.localStorage.getItem('flashmeToken')
    },
    success: function (result) {
        if (result.state) {
            $('.username').length > 0 && $('.username').text(result.user.name);
            $('.useremail').length > 0 && $('.useremail').text(result.user.email);
        } else {
            layer.confirm(result.msg, {
                btn: ['去登录', '知道了'],
                title: false, //不显示标题
                shadeClose: true, //开启遮罩关闭
                closeBtn: 0, //隐藏关闭按钮
                // time: 2000, //2秒后自动关闭
            }, function () {
                window.location.href = "/login#"+window.location.href;
            });
        }
    },
    error: function (err) {
        if(err.status==500){
            layer.confirm("需要登陆！", {
                btn: ['去登录', '知道了'],
                title: false,
                shadeClose: true,
                closeBtn: 0,
            }, function () {
                window.location.href = "/login#"+window.location.href;
            });
        }
    }
})