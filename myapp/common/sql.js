const core = require('./core');
const Sequelize = require('sequelize');
const myData = new Sequelize({
    dialect: 'sqlite',
    storage: core.datapath,
    define: {
        freezeTableName: true, //强制表名等于模型名
        timestamps: false, //禁用时间戳
    }
});

module.exports = myData;