var getlist = function (getlisturl) {
    var nowPage = 1, limit = 10, startlist = true;
    var myData = { page: 0, total: 0, length: 0 }
    var watch = new watchdata();
    watch.setwatch(myData);

    return {
        init: function () {
            var that = this;
            //上一页
            $('#preBtn').click(function () {
                if (nowPage > 1 && startlist) {
                    nowPage--;
                    that.list(nowPage, limit);
                }
            })
            //下一页
            $('#nextBtn').click(function () {
                if (nowPage < myData.total && startlist) {
                    nowPage++;
                    that.list(nowPage, limit);
                }
            })
            //跳转页码
            $('#gotopage').keyup(function (event) {
                if (event.keyCode == 13 && startlist) {
                    var num = parseInt($(this).val());
                    if (num < 1 || num > myData.total) {
                        return;
                    }
                    nowPage = num;
                    that.list(nowPage, limit);
                }
            });
        },
        //读取用户数据
        list: function (page, size) {
            if(!window.localStorage.getItem('flashmeToken')){
                layer.confirm("您还没有登陆！", {
                    btn: ['去登录', '知道了'],
                    title: false,
                    shadeClose: true,
                    closeBtn: 0,
                }, function () {
                    window.location.href = "/login#"+window.location.href;
                });
                return;
            }
            var that = this;
            if (!startlist || !getlisturl) {
                layer.load(1, {
                    time: 2000,
                    shade: [0.2, '#fff']
                });
                return;
            }
            startlist = false;
            limit = size || 10;
            $.ajax({
                type: "GET",
                url: getlisturl,
                data: { size: limit, page: page || 1 },
                headers: {
                    Authorization: "Bearer " + window.localStorage.getItem('flashmeToken')
                },
                success: function (result) {
                    console.log(result);
                    if (!result.state){
                        layer.msg(result.msg||'Error!');
                        return;
                    }
                    myData.page = page || 1;//页数
                    myData.length = result.count;//总条数
                    myData.total = Math.ceil(result.count / limit);//总页数
                    nowPage = myData.page;
                    // $('.listdata').html("");
                    if (result.state && result.rows) {
                        $('.listdata').html(template('table-art', result.rows));
                    } else if(result.state && result.token){
                        //续期的token
                        window.localStorage.setItem('flashmeToken', result.token);
                        startlist = true;
                        that.list(nowPage, limit);
                        return;
                    }else{
                        layer.msg('未获得数据！');
                        startlist = true;
                        return;
                    }
                    startlist = true;
                },
                error: function (err) {
                    console.log("getlist -> err", err)
                    if (err.status == 403) {
                        layer.msg('您无权限浏览！请联系管理员！');
                    } else if (err.status == 401) {
                        layer.confirm(err.responseJSON.msg, {
                            btn: ['去登录', '知道了'],
                            title: false, //不显示标题
                            shadeClose: true, //开启遮罩关闭
                            closeBtn: 0, //隐藏关闭按钮
                            // time: 2000, //2秒后自动关闭
                        }, function () {
                            window.location.href = "/login#"+window.location.href;
                        });
                        window.localStorage.removeItem('flashmeToken');
                    } else if (err.status == 500) {
                        layer.msg('被禁止或已在其它设备登陆！');
                    }
                    startlist = true;
                }
            });
        }
    }
}

function getuser(resolve, reject) {
    $.ajax({
        type: 'post',
        url: "/admin/users",
        dataType: 'json',
        headers: {
            Authorization: "Bearer " + window.localStorage.getItem('flashmeToken')
        },
        success: function (result) {
            if (result) {
                resolve && resolve(result)
            } else {
                reject && reject(result)
            }

        },
        error: function (err) {
            console.log("🚀 ~ err", err)
        }
    });
}