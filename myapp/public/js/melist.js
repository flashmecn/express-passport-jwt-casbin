/*
 * ==========================================
// 夕空 | www.flashme.cn
// 2020-10-22
 * ==========================================
*/
function filteroption($root) {  //初始化列表，(对象)
    var tempul;
    tempul = $root.clone(true);
    tempul.children().each(function() {
        var htmword = $(this).html();
        var pyword = $(this).toPinyin();
        var supperword = "";
        pyword.replace(/[A-Z]/g, function(word) { supperword += word });
        $(this).attr("mka", (htmword).toLowerCase());
        $(this).attr("mkb", (pyword).toLowerCase());
        $(this).attr("mkc", (supperword).toLowerCase());
    });
    window[$root.attr('id')] = tempul;
}

//筛选符合的列表项
function resetOption(keys, $root) {
    if(!window[$root.attr("id")]){
        return;
    }
    keys = keys.toLowerCase();
    $root.children().remove();
    var duplul = window[$root.attr("id")];
    if (duplul==undefined){
        return false;
    }
    if (keys.length <= 0) {
        duplul.children().each(function() {
            $root.append($(this).clone(true).removeAttr("mka").removeAttr("mkb").removeAttr("mkc"));
        });
        return;
    }
    duplul.children('[mka*="' + keys + '"],[mkb*="' + keys + '"],[mkc*="' + keys + '"]').each(function() {
        $root.append($(this).clone(true).removeAttr("mka").removeAttr("mkb").removeAttr("mkc"));
    });
}


//==========================================
// 搜索列表功能
//==========================================
function melist(){
    var soparams={};//存储链接事件
    $.fn.sotag=function(data,clear,taghtml,getlink){
        var $target=this;
        if(getlink){
            soparams[$target.attr('id')]=getlink;
        }
        if(clear){
            $target.html('');
        }
        if(data==undefined){
            return;
        }
        for(var i in data){
            var $this=$(taghtml);
            $this.data('id',data[i].id);
            $this.data('name',data[i].name);
            $this.data('link',data[i].link);
            $this.html(data[i].title);
            $target.append($this);
        }
    }
    $.fn.oladd=function(id,name,title,link){
        var $root=this.closest('.textroot');
        var $target=$root.find('ol');
        $target.children('.start').remove();
        var newli=$($target.data('li'));
        newli.find("input").prop('checked', true);
        newli.find("input").val(id);
        newli.find('input').attr('name',name);
        newli.data('link',link);
        newli.data('title',title);
        newli.append(title);
        $target.append(newli);
        if($root.attr('linkage')=="url"){//处理逐级加载的
            if(!link || !window.getLinkage){
                $root.find("input[type=text]").hide();
               return;
            }
            window.getLinkage(link,this,'url');

        }else if($root.attr('linkage')=="all"){//处理全级加载的
            if(!link || !window.getLinkage){
                $root.find("input[type=text]").hide();
               return;
            }
        }
        
    }
    $.fn.olclear=function(){
        this.trigger("clear");
    }
    $('.textroot').each(function(){
        var activeArr=[];
        var $target=$(this);
        var type=$target.find("ol li input").attr('type');
        var olinput=$target.find("ol li").prop('outerHTML');//备份表单项
        $target.find("ol").data('li',olinput);
        var thisid=$target.find(".soso").attr('id');
        var startlink=$target.find(".soso").data('link');//起始ajax地址
        $target.find("ol li").addClass('start');

        //输入框变动事件
        $target.find("input[type=text]").bind("propertychange input focus",function(event){
            resetOption($.trim($(this).val()), $target.find(".soso"));
            inputfocus();
            if(!$target.attr('linkage')){
                sosoState();
            }
        })
        function inputfocus(){
            $('.textroot .soso').hide();
            $('.textroot .more').hide();
            $('.textroot input[type=text]').css('z-index','98');
            if($target.find(".soso").html()!=""){
                if($('.sosobg').length<1){$target.append('<div class="sosobg"></div>');}
                $target.find(".soso").css({"display":"block"});
                $target.find(".soso").show();
                $target.find(".more").show();
                $target.find('input[type=text]').css('z-index','100');
            }
        }
        // 更新按钮选择状态
        function sosoState(){
            $target.find('.soso li').removeClass('active');
            for(var i=0;i<activeArr.length;i++){
                var li=$target.find(".soso li:contains('"+activeArr[i]+"')");
                if(li){
                    li.addClass('active');
                }
            }
        }
        $target.on('click','ol',function(event) {
            $target.find("input[type=text]").focus();
        });
        //列表点击事件
        $target.find(".soso").on('click','li',function(){
            if($(this).hasClass('active')){
                return;
            }
            $target.find("ol .start").remove();
            var newli=$(olinput);
            newli.find("input").prop('checked', true);
            newli.find("input").val($(this).data('id'));
            newli.find('input').attr('name',$(this).data('name'));
            newli.data('link',$(this).data('link'));
            newli.data('title',$(this).html());
            newli.append($(this).html());
            if(type=='radio'){
                $target.find('ol').html(newli);
                activeArr=[];
                sosoState();
            }else if($target.attr('linkage')){
                activeArr=[];
                $target.find('ol').append(newli);
            }else if(!$target.find('ol input[value="'+$(this).data('id')+'"]').prop('outerHTML')){
                $target.find('ol').append(newli);
            }
            var valObj={id:$(this).data('id'),title:$(this).html(),link:$(this).data('link'),name:$(this).data('name')}
            //联动结尾隐藏输入框判断
            if($target.attr('linkage') && !$(this).data('link')){
                $('body .sosobg').trigger("mousedown");
                $target.find("input[type=text]").hide();
                $target.find(".soso").trigger("selected", valObj);
            }
            $target.find(".soso").trigger("select", valObj);
            if(soparams[thisid] && $(this).data('link')){
                soparams[thisid]($(this).data('link'), thisid);
            }
            $(this).addClass('active');
            activeArr.push($(this).html());
        })
        $target.find(".more").click(function(){
            setTimeout(function () {
                $target.find(".soso").css({"display":"table"});
                $target.find(".more").hide();
            }, 20);
        })
        $('body').on('mousedown','.sosobg',function(){
            $(this).remove();
            $target.find(".soso").hide();
            $target.find(".more").hide();
            $target.find("input[type=text]").val("");
            $target.find("input[type=text]").blur();
            $target.find("input[type=text]").css('z-index','98');
        });
        //完全清除事件
        $target.find('.soso').bind('clear', function () {
            activeArr=[];
            $target.find("input[type=text]").show();
            if(soparams[thisid] && $target.attr('linkage')){
                if($target.attr('linkage')=="all"){
                    soparams[thisid]($target.find(".soso").data('dataAll'), thisid);
                }else{
                    startlink=$target.find(".soso").data('link');
                    soparams[thisid](startlink, thisid);
                }
                $target.find("input[type=text]").focus();
            }else{
                sosoState();
            }
            $target.find('ol').html($(olinput).addClass('start'));
        })
        //结果项点击清除事件
        $target.find('ol').on('click','li',function(){
            var index=activeArr.indexOf($(this).data('title'));
            var valObj;
            if(index>-1){
                activeArr.splice(index, 1);
            }
            //联动显示判断
            if($target.attr('linkage')){
                $(this).nextAll().remove();
                $target.find("input[type=text]").show();
                if(soparams[thisid]){
                    if($(this).prev().prop('outerHTML')){
                        //点击清掉返回前一个值
                        valObj={
                            id:$(this).prev().find('input').val(),
                            name:$(this).prev().find('input').attr('name'),
                            title:$(this).prev().data('title'),
                            link:$(this).prev().data('link')
                        }
                        soparams[thisid]($(this).prev().data('link'), thisid);
                    }else if($target.attr('linkage')=="all"){
                        soparams[thisid]($target.find(".soso").data('dataAll'), thisid);
                    }else{
                        startlink=$target.find(".soso").data('link');
                        soparams[thisid](startlink, thisid);
                    }
                }
                $target.find("input[type=text]").focus();
            }else{
                sosoState();
            }
            //判断是否删空
            if($(this).parent().children('li').length==1){
                $(this).parent().html($(olinput).addClass('start'));
                $target.find(".soso").trigger("clean",false);
                $target.find(".soso").trigger("cleanest");
                $target.find(".soso").trigger("select",false);
            }else{
                $(this).remove();
                $target.find(".soso").trigger("clean",valObj?valObj:false);
                $target.find(".soso").trigger("select",valObj?valObj:false);
            }
        })
        //键盘回车事件
        $target.keyup(function(event){
            if(event.keyCode ==13){
                $target.find('.soso li:eq(0)').trigger("click");
                $target.find("input[type=text]").val('');
                if($target.attr('linkage')){
                    return;
                }
                $target.find(".soso").hide();
                $target.find(".more").hide();
                return;
            }
        });
        // $target.find(".soso").hide();
        // $target.find(".more").hide();
    })
}

//START: Ajax获取列表&多级联动型
function linkageall(){
    
    window.getLinkage=function(url,$target,linkage){
        $.ajax({
            url:url,
            dataType:"json",
            success:function(ev){

                //----更新列表内容
                if(linkage=='url'){
                    $target.sotag(ev.infor, true, '<li></li>', function(newurl,id){
                        window.getLinkage(newurl,$('#'+id),linkage);
                    });
                    filteroption($target);
                }else if(linkage=='all'){
                    window.setLinkageAll($target, ev.infor);
                }else{
                    $target.sotag(ev.infor, true, '<li></li>');
                    filteroption($target);
                }
                //----
            },
            error: function (XHR) {
                console.log($target.attr('id')+'|'+url+'|'+XHR.status);
            }
        })
    }
    window.getLinkageAll=function(subData,$target){
        $target.sotag(subData, true, '<li></li>', function(subData,id){
            window.getLinkageAll(subData,$('#'+id));
        });
        filteroption($target);
    }
    window.setLinkageAll=function ($target,data) {
        $target.data('dataAll',data);
        window.getLinkageAll(data, $target);
        showBtn(data, $target);//初始show菜单
    }
    function showBtn(infor,$target){
        for(var k in infor){
            if(infor[k].show==true || infor[k].show=="true"){
                window.getLinkageAll(infor[k].link, $target);
                $target.oladd(infor[k].id,infor[k].name,infor[k].title,infor[k].link);
                if(infor[k].link){
                    showBtn(infor[k].link, $target);
                }else{
                    $target.trigger("initial", {id:infor[k].id,title:infor[k].title});
                }
                return;
            }
        }
    }

    $('.textroot').each(function(){
        if($(this).find('.soso').data('link')){
            window.getLinkage($(this).find('.soso').data('link'), $(this).find('.soso'), $(this).attr('linkage'));
        }
    })
    
}
//END


//==========================================树形菜单

var treelist = function ($root, $input) {
    function tree() {
        $root.on('click', 'li.parent_li > span', function (e) {
            var children = $(this).siblings('ul');
            if (children.children('li').length == 0) {
                return;
            }
            treesub(children, $(this), true);
            e.stopPropagation();
        });
        $root.on('click', '.check', function (e) {
            e.stopPropagation();
        });
        $root.find('li:has(ul)').addClass('parent_li');
    }
    function treesub($target, ev, open) {
        if (!$target.is(":visible") && open) {
            $target.show('fast');
            ev.find(' > i').attr('title', '收起分支').addClass('fa-minus-square-o').removeClass('fa-plus-square-o');
        } else {
            $target.hide('fast');
            ev.find(' > i').attr('title', '展开分支').addClass('fa-plus-square-o').removeClass('fa-minus-square-o');
        }
    }

    function filteroption() {
        $root.find('h3').each(function () {
            var htmword = $(this).text();
            var pyword = $(this).toPinyin();
            var supperword = "";
            pyword.replace(/[A-Z]/g, function (word) { supperword += word });
            $(this).parent().attr("mka", (htmword).toLowerCase());
            $(this).parent().attr("mkb", (pyword).toLowerCase());
            $(this).parent().attr("mkc", (supperword).toLowerCase());
        });
    }
    function resetOption(keys) {
        if (keys.length <= 0) {
            $root.find('span').removeClass('hideso');
            return;
        }
        $root.find('span').addClass('hideso');
        $root.find('[mka*="' + keys + '"],[mkb*="' + keys + '"],[mkc*="' + keys + '"]').each(function () {
            $(this).removeClass('hideso');
        });
    }
    
    $input.bind("propertychange input focus", function (event) {
        $root.find('ul').show();
        $root.find('.parent_li span:has(+ul>li)').find(' > i').attr('title', '收起分支').addClass('fa-minus-square-o').removeClass('fa-plus-square-o');
        resetOption($.trim($(this).val()));
    })

    // function fordata(dom, data) {}

    return {

        init: function(jsondata){
            if(jsondata){
                // fordata($('.tree ul'),jsondata);
                $('.tree ul').html(template('treeli-art', jsondata));
            }
            
            filteroption();
            tree();

        },
        show: function(){
            
            $root.find('>ul ul').each(function(el){
                var ul = $(this);
                if (ul.children('li').length == 0) {
                    return true;
                }
                treesub(ul, ul.siblings('span'), true);
            })
        },
        hide: function(){
            $root.find('>ul ul').each(function(el){
                var ul = $(this);
                if (ul.children('li').length == 0) {
                    return true;
                }
                treesub(ul, ul.siblings('span'), false);
            })
        }
    }
}