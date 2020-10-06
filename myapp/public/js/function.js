//============================hash前端路由
/*
* 夕空 flashme.cn 2020-4-19
//初始化
window.Router = new Router();
window.Router.init();
//方法
Router.route("/url", function, function);
Router.route(url地址, 触发函数, 退出函数);
1.填写"hash"将会监听每次地址变更的触发
2.添加地址层级关系
  例：Router.routes['/home'].subset=['/sub1','/sub2']
  /home的子地址有/sub1、/sub2，打开子集地址/home将不执行退出函数
*/
function Router() {
    this.routes = {};
    this.currentUrl = '';
    this.beforeUrl = '';
}
Router.prototype.route = function(path, callback, removeback) {
	var obj={start:false,subset:[]};
	obj.callback=callback || function(){};
    if(removeback) obj.leave = removeback;
    this.routes[path] = obj;
};
Router.prototype.refresh = function(ev) {
    this.routes["hash"] && this.routes["hash"]();

    this.currentUrl = location.hash.slice(1) || '/';
    if(this.routes[this.currentUrl] && this.routes[this.currentUrl].start == false){
        this.routes[this.currentUrl].callback();
		this.routes[this.currentUrl].start = true;
		this.routes[this.currentUrl].before = this.beforeUrl;//记录上一个地址
	}
    //将之前的地址判断是否执行退出
	this.parentUrl(this.beforeUrl);

    //判断全部地址是否执行退出
    for(var k in this.routes){
    	var than=this.routes[k];
    	if(than.start && this.currentUrl!=k){
			//处在打开状态 & 当前地址不等于此地址
    		if(!this.forsub(than)){
    			than.start = false;
    			than.leave && than.leave();
    		}

    	}
    }
    this.beforeUrl=this.currentUrl;
    
};
Router.prototype.forsub = function(than){
	//for 子地址非打开状态  >> 执行退出函数
	for(var i in than.subset){//判断子集是否打开状态
		if(this.routes[than.subset[i]].start){
			return true;
		}
	}
	return false;
}
Router.prototype.parentUrl = function (before) {
	if (before && this.currentUrl!=before && this.routes[before] && this.routes[before].start && !this.forsub(this.routes[before])) {
		this.routes[before].start = false;
		this.routes[before].leave && this.routes[before].leave();
		var parent = this.routes[before].before;
		if (parent) {
			this.routes[before].before = null;
			this.parentUrl(parent);
		}
	}

}
Router.prototype.init = function() {
    window.addEventListener('load', this.refresh.bind(this), false);
    window.addEventListener('hashchange', this.refresh.bind(this), false);
}



//============================变量 dom 双向绑定
/*
* 夕空 flashme.cn 2020-6-5
 var obj={}
 var watch = new watchdata();
 watch.inputevent(); //绑定input变化
 watch.domevent(); //绑定dom变化
 watch.setwatch(obj);
 obj.aaa="hello world!"
 <span ng-bind="aaa"></span>
*/

var watchdata = function () {
    //缓存
    let watchscope = {};
    let domeve=false;
    //绑定变量
    return {
        setwatch: function (obj) {
            var than = this;
            let watchers = {};
            watchscope = obj;
            const propertys = Object.keys(watchscope);

            propertys.forEach(function (prop) {
                //不处理函数属性
                if ('function' == typeof watchscope[prop]) return;

                const propName = prop;
                // console.log(propName, watchscope[prop]);
                //监听对象属性
                Object.defineProperty(watchscope, prop, {
                    //value: watchscope[prop],
                    configurable: true,
                    get: function () {
                        //console.log('get', prop, 'for', propName);
                        return watchers[propName];
                    },
                    set: function (value) {
                        //防止递归导致的栈溢出，先去掉监听的函数
                        domeve && document.removeEventListener('DOMCharacterDataModified', than.element);
                        domeve && document.removeEventListener('DOMNodeInserted', than.element);
                        watchers[prop] = value;
                        var dom = document.querySelector("*[ng-bind='" + prop + "']")
                        dom.innerText = watchers[prop];
                        dom.value = watchers[prop];
                        //重新监听
                        domeve && document.addEventListener('DOMCharacterDataModified', than.element, false);
                        domeve && document.addEventListener('DOMNodeInserted', than.element, false);
                    }
                });
            });
        },

        element: function (e) {
            //dom的修改触发JS变量的修改
            // console.log(e.newValue, e.prevValue, e.path);
            const attrs = e.target.parentElement.attributes;
            for (let i = 0; i < attrs.length; i++) {
                const attr = attrs[i];
                if ('ng-bind' === attr.nodeName) {
                    watchscope[attr.nodeValue] = e.target.nodeValue;
                }
            }
        },
        domevent: function () {
            domeve=true;
            //绑定DOM的修改关联
            document.addEventListener('DOMCharacterDataModified', this.element, false);
            document.addEventListener('DOMNodeInserted', this.element, false); 
        },
        inputevent: function () {
            //绑定input表单的修改关联
            var input=document.querySelectorAll("input[ng-bind]")
            for(var k in input){
                input[k].oninput = function (e) {
                    watchscope[e.target.attributes["ng-bind"].nodeValue] = e.target.value;
                }
            }
                
        }
    }

}



//============================至底加载

function loading(target,fun){
    var thisswitch=true;
    var loadico='<div class="loaderCircle"><div class="icono-spinner spin step"></div></div>';
    target.bind('scroll', function onScroll() {
        if(!thisswitch){
            return;
        }
        var toBottom = ($(this)[0].scrollTop + $(this).height() > $(this)[0].scrollHeight - 80);
        if(toBottom&&$(this).attr('loading')!='show') {
            $(this).attr('loading','show');
            $(this).append(loadico);
            fun && fun();
        }
    });
    return {
        loadComplete:function(){
            target.attr('loading','hide');
            target.children('div.loaderCircle').remove();
        },
        switch:function (bol) {
            thisswitch=bol;
        }
    }
}
//回到顶部
function backtop($con) {
    var appTop = $con.height()*1.2 || $(window).height()*1.2;
    var scrTop;
    var backbtn=$con.siblings(".backtop");
    $con.scroll(function(e){
        scrTop = $con.scrollTop();
        if(scrTop > appTop){
            backbtn.show();
        }else{
            backbtn.hide();
        }
    })

    backbtn.click(function(){
        $con.animate({scrollTop: 0}, 400);
    })
}

//==========================================Tab按钮
function tabbox(tabtit,tab_conbox,mouseEvent) {
	$(tab_conbox).children().hide();
	$(tabtit).children("label,.label").first().addClass("active");
	$(tab_conbox).children().first().show();

	$(tabtit).children("label,.label").bind(mouseEvent,function(){
		$(this).addClass("active").siblings("label,.label").removeClass("active");
		var activeindex = $(tabtit).children("label,.label").index(this);
		$(tab_conbox).children().eq(activeindex).show().siblings().hide();

		return false;
	});

};

//将form表数据转Obj对象 postObj(form.serializeArray())
function postObj(params) {
    var values = {};
    for (x in params) {
        if (!values[params[x].name]) {
            values[params[x].name] = params[x].value;
        }else if(values[params[x].name] instanceof Array==false){
            values[params[x].name]=[values[params[x].name]];
            values[params[x].name].push(params[x].value);
        }else{
            values[params[x].name].push(params[x].value);
        }

    }
    return values;
}



// 对Date的扩展，将 Date 转化为指定格式的String
// 月(M)、日(d)、小时(h)、分(m)、秒(s)、季度(q) 可以用 1-2 个占位符，
// 年(y)可以用 1-4 个占位符，毫秒(S)只能用 1 个占位符(是 1-3 位的数字)
// 例子：
// (new Date()).Format("yyyy-MM-dd HH:mm:ss.S") ==> 2006-07-02 08:09:04.423
// (new Date()).Format("yyyy-M-d H:m:s.S")      ==> 2006-7-2 8:9:4.18
Date.prototype.Format = function (fmt) {
    var o = {
        "M+": this.getMonth() + 1, //月份 
        "d+": this.getDate(), //日 
        "H+": this.getHours(), //小时 
        "m+": this.getMinutes(), //分 
        "s+": this.getSeconds(), //秒 
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度 
        "S": this.getMilliseconds() //毫秒 
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
    if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}

//Table固定表头 class=heightY执行固定表头
function tablehead($target) {
    $target.each(function () {
        //复制表格做置顶表头
        var $this = $(this);
        if($this.hasClass('heightY')){
        	$this.find('.head').remove();
        	var tablehead = $this.find('table').clone();
        	tablehead.find('input,textarea,select').attr('name', '');
        	tablehead.find('input,textarea,select').attr('id', '');
        	tablehead.find('input.check').remove();
        	$this.append('<div class="head"></div>');
        	$this.find('.head').append(tablehead);
        	$this.find('.head').height($this.find('.head thead').height());
        	$this.scroll(function () {
        		$this.find('.head').css('top', $this.scrollTop());
        	})
        }
        
        //全选按钮
        $this.find('.check-all').click(function () {
            $this.find('tbody input[type=checkbox].check').prop('checked', $(this).prop('checked'));
        })
        $this.on('click', 'input[type=checkbox].check', function(event) {
            if($this.find('input[type=checkbox].check:checked').length==$this.find('input[type=checkbox].check').length){
            	$this.find('.check-all').prop('checked',true);
            }else{
            	$this.find('.check-all').prop('checked',false);
            }
        });
    })

}