const Sequelize = require('sequelize');
const myData = require('./sql');
const sql = myData.define('role', {
    id: {
        type: Sequelize.INTEGER,//设置类型
        primaryKey: true,//主键
        autoIncrement: true,//自增
        allowNull: false,//非空
    },
    name: { //角色名
        type: Sequelize.STRING,
        allowNull: false,
        unique: true, //唯一
    },
    explain: { //说明
        type: Sequelize.STRING,
    },
    level: { //等级
        type: Sequelize.TEXT,
        defaultValue: '0,'
    },
}, {
    freezeTableName: true, //强制表名等于模型名
});


exports.Op = Sequelize.Op;

exports.sql = sql;