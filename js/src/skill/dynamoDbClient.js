"use strict";

var AWS = require("aws-sdk");

var docClient = new AWS.DynamoDB.DocumentClient({region: "eu-west-1"});

var dynamoDbClient = function() {
    return {
  /*      getPhoneHasConfirmed : function (telephone, callback) {
            var params = {
                Key: {
                    telephone: telephone
                },
                TableName: constants.PHONE_NUMBERS_TABLE_NAME
            };
            docClient.get(params, function(err, data) {
                if (err) {
                    console.error("Unable to read data from dynamoDB. ");
                    console.log("Error : " + JSON.stringify(err));
                } else {
                    console.log("Get data successfully!.");
                    callback(data.Item.hasConfirmed);
                }
            });
        },

        // Get user's data from dynamoDB.
        savePhoneAttributes : function (telephone, title, link, imageUrl, hasConfirmed, hasPhoto, callback) {
            var params = {
                Item: {
                    telephone: telephone,
                    title: title,
                    link: link,
                    imageUrl: imageUrl,
                    hasConfirmed : hasConfirmed,
                    hasPhoto : hasPhoto
                },
                TableName: constants.PHONE_NUMBERS_TABLE_NAME
            };
            docClient.put(params, function(err, data) {
                if (err) {
                    console.error("Unable to put the state into dynamoDB.");
                    console.log("Error : " + JSON.stringify(err));
                } else {
                    console.log("PutItem succeeded.");
                    callback();
                }
            });
        },*/

        // Import all voucher codes into dynamoDB
        putVoucherCode : function (voucherCode, callback) {
            console.log("putVoucherCode");
            var params = {
                TableName : "VoucherCode",
                Item : {
                    "voucherCode" : voucherCode,
                }

            };
            docClient.put(params, function(err, data) {
                if (err) {
                    console.log("Unable to put the state into dynamoDB.");
                    console.log("Error : " + JSON.stringify(err));
                } else {
                    console.log("import codes succeeded.");
                    callback();
                }
            });
        }
    };
}();

module.exports = dynamoDbClient;
