"use strict";

var async = require('async');

var dynamoDbClient = require('./dynamoDbClient');
var calls = [];

var voucherReader = function() {
    return {
        // Import all voucher codes into dynamoDB
        importVoucherCodes : function (callback) {
            console.log("importVoucherCodes");
            var i = 0;
            var lineReader = require('readline').createInterface({
                input: require('fs').createReadStream('voucherCode3.csv')
            });

            lineReader.on('line', function (line) {
                console.log(i);
                i++;
                console.log(line);
                dynamoDbClient.putVoucherCode(line, ()=> {
                    console.log('Line from file:', line);
                });
            });

        },

        scanVoucherCodes : function (callback) {
            console.log("scanVoucherCodes");
            dynamoDbClient.scanVoucherCode((items)=>{
                callback(items);
            });
        },

        updateVoucherCodes : function (selectedItem, userID, callback) {
            console.log("updateVoucherCode");
            dynamoDbClient.updateVoucherCode(selectedItem, userID, (err)=>{
                callback(err);
            });
        }
    };
}();

module.exports = voucherReader;
