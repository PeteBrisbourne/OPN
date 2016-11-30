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
                input: require('fs').createReadStream('voucher.csv')
            });

            lineReader.on('line', function (line) {
                console.log(i);
                i++;
                console.log(line);
                calls.push(function() {
                    dynamoDbClient.putVoucherCode(line, ()=> {
                        console.log('Line from file:', line);
                    });
                });
            });

            async.parallel(calls, function() {
                callback();
            });
        }
    };
}();

module.exports = voucherReader;
