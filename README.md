# node.js-express用户登录验证及权限演示平台

> npm install

> npm start

http://localhost:3000/

支持用户名及邮箱登录；支持RBAC角色权限及API权限和角色管理；支持注册及登录次数限制；支持邮件验证找回密码功能

初始管理员：admin 密码：111111
## 涉及技术
后端框架：Express

后端渲染：ejs

登录token验证：passport + passport-jwt

密码加密：crypto （sha512哈希加密）

访问次数限制：express-rate-limit

权限验证：casbin + casbin-express-authz

数据库：sqlite3

密码找回：nodemailer + express-session

数据库操作：sequelize（方便更换其它类型数据库）

> 以上模块均可npm下载，使用方法可自行查阅

## 学习曲线：
Express的基础使用 > ejs后端渲染框架（也可选用其它的） > passport-jwt登录验证 > 访问限制express-rate-limit > sqlite3数据库api > casbin（RBAC角色权限） > sequelize（数据库ORM）

重置网站：

删除数据库 data/flashme-data.db

清空权限文件 data/authz_policy.csv

重新安装 http://localhost:3000/install

权限模块文档：

[casbin.org/docs/zh-CN/overview(官网较慢)](http://casbin.org/docs/zh-CN/overview "casbin.org/docs/zh-CN/overview(官网较慢)")

[www.kancloud.cn/oldlei/casbin(不全)](http://www.kancloud.cn/oldlei/casbin "www.kancloud.cn/oldlei/casbin(不全)")

前端仅使用了jquery.js/ 模板引擎art-template/ 弹窗layer.js/ 树菜单melist.js （精简的前端功能）

## Express告一段落，下一步学学 koa
