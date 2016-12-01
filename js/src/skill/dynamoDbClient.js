"use strict";

var AWS = require("aws-sdk");

var docClient = new AWS.DynamoDB.DocumentClient({region: "eu-west-1"});

var dynamoDbClient = function() {
    return {
        scanVoucherCode : function (callback) {
            var result = [];
            var params = {
                TableName: "VoucherCode",
                ProjectionExpression: "voucherCode, blocked, userID",
                FilterExpression: "blocked = :isBlocked",
                ExpressionAttributeValues: {
                    ":isBlocked": false,
                }
            };

            console.log("Scanning Movies table.");
            docClient.scan(params, onScan);

            function onScan(err, data) {
                if (err) {
                    console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
                } else {
                    // print all the codes
                    console.log("Scan succeeded.");
                    console.log(data.Items.length);
                    data.Items.forEach(function(item) {
                        //console.log(
                        //    code.voucherCode + ": ",
                        //    code.blocked, "- userID:", code.userID);
                        result.push(item);
                    });

                    // continue scanning if we have more movies, because
                    // scan can retrieve a maximum of 1MB of data
                    if (typeof data.LastEvaluatedKey != "undefined") {
                        console.log("Scanning for more...");
                        params.ExclusiveStartKey = data.LastEvaluatedKey;
                        docClient.scan(params, onScan);
                    }
                    else {
                        callback(result);
                    }
                }
            }
        },

        // Update selected voucher code
        updateVoucherCode : function (selectedCode, userID, callback) {
            console.log("updateVoucherCode");
            var params = {
                TableName: "VoucherCode",
                Key:{
                    "voucherCode": selectedCode.voucherCode,
                },
                UpdateExpression: "set blocked = :isBlocked, userID = :currentUserID",
                ConditionExpression: "blocked = :notBlocked",
                ExpressionAttributeValues:{
                    ":isBlocked": true,
                    ":notBlocked": false,
                    ":currentUserID": userID
                },
                ReturnValues:"UPDATED_NEW"
            };

            console.log("Attempting a conditional update...");
            docClient.update(params, function(err, data) {
                if (err) {
                    console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
                } else {
                    console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
                }
                callback(err);
            });
        },

        // Import all voucher codes into dynamoDB
        putVoucherCode : function (voucherCode, callback) {
            console.log("putVoucherCode");
            var params = {
                TableName : "VoucherCode",
                Item : {
                    "voucherCode" : voucherCode,
                    "blocked" : false,
                    "userID" : "xxx"
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
