const Sequelize = require('sequelize');
const myData = require('./sql');
const sql = myData.define('api', {
    id: {
        type: Sequelize.INTEGER,//设置类型
        primaryKey: true,//主键
        autoIncrement: true,//自增
        allowNull: false,//非空
    },
    name: { //API名
        type: Sequelize.STRING,
        allowNull: false,
        unique: true, //唯一
    },
    route: { //API
        type: Sequelize.STRING,
        allowNull: false,
        unique: true, //唯一
    },
}, {
    freezeTableName: true, //强制表名等于模型名
});


exports.Op = Sequelize.Op;

exports.sql = sql;
