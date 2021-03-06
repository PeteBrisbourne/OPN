var Alexa = require('alexa-sdk');
var storyData = require('story_data.json');
var request = require('request');
var SugarCube = require('sugarcube');
var voucherReader = require('./voucher_reader');

// TODO: Add handling for delay_then_go actions.
// TODO: Add more natural reprompt hints for phrases.  Summarize the content and suggest a keyword?

var DEBUG = true;
var PLAY_MODE = "PLAY_MODE";
var RESUME_DECISION_MODE = "RESUME_DECISION_MODE";
var CONFIRM_MODE = "CONFIRM_MODE";

// create handlers for all the story nodes
var newSessionHandlers = {
    'NewSession': function() {
        console.log("NewSession: ");
        console.log("this in NewSession" + JSON.stringify(this));


        if (this.attributes.lastNode && this.attributes.lastNode != "intro") {
                console.log("this.attributes" + JSON.stringify(this.attributes));
                console.log("here");
                this.attributes.lastNode = this.attributes.lastNode.split("_choice")[0];
                this.attributes.lastNode = this.attributes.lastNode.split("_help")[0];

                console.log(this.attributes.lastNode);

                if (this.attributes.lastNode == 'will' || this.attributes.lastNode == 'wont') {
                    this.attributes.lastNode += "_help";
                }
                var lastNode = this.attributes.lastNode.replace(/_/g, " ");

                console.log(lastNode);
                console.log(this.attributes.lastNode);
                this.handler.state = RESUME_DECISION_MODE;
                var welcomeMsg = "Welcome to One Piercing Note, RuneScape quest. A game has already started. Last scene you visited was " + lastNode
                    +  ". Would you like to continue the game?" + "Say 'Yes' to continue, or 'No' to start a new game. ";
                var reprompt = "Would you like to continue the game? Say 'Yes' to continue the game, Or 'No' to start a new game. ";
                this.emit(':ask', welcomeMsg, reprompt);
            }
        else {
                var game = new SugarCube(storyData, this.attributes, storyData.intro);
                var dialog = game.resolve();
                this.attributes.lastNode = game.currentNode.name;
                dialog = dialog.replace(/\n/g, "<break time='250ms'/>");
                this.handler.state = PLAY_MODE;
                this.emit(':ask', dialog, buildReprompt(game));
            }
    },

    'AMAZON.HelpIntent': function () {
        var message = "Would you like to continue the game? Say 'Yes' to continue the game, Or say 'No' to start a new game. ";
        var reprompt = "Say 'Yes' to continue the game, Or say 'No' to start a new game.";
        this.emit(':ask', message, reprompt);
    },
    'AMAZON.StopIntent': function () {
        console.log("this in Stop" + JSON.stringify(this));
        this.emit(':tell', 'Goodbye.');
    },
    'AMAZON.CancelIntent': function () {
        console.log("this in Cancel" + JSON.stringify(this));
        this.emit(':tell', 'Goodbye.');
    },

    'Unhandled': function () {
        console.log("this in NewSession Unhandle" + JSON.stringify(this));
        console.log("Unhandled:  Shouldn't have gotten here 1: " + JSON.stringify(this.event, null, 4));
        var message = "Sorry, I did not get that, say 'continue' to continue game or say 'new game' to start a new game";
        var reprompt = "Say 'continue' to continue game or say 'new game' to start a new game";
        this.emit(':ask', message, reprompt);
    }
};
var stateHandlers = {
    resumeDecisionModeIntentHandlers: Alexa.CreateStateHandler(RESUME_DECISION_MODE, {
        "NewSession" : function () {
            console.log("new session in resume decision mode");
            this.emit("NewSession");
        },
        'AMAZON.YesIntent': function () {
            console.log("continue game");
            this.handler.state = PLAY_MODE;
            var lastNode = this.attributes.lastNode;
            console.log(lastNode);
            var game = new SugarCube(storyData, this.attributes, storyData[lastNode]);
            var dialog = game.resolve();
            this.attributes.lastNode = game.currentNode.name;
            dialog = dialog.replace(/\n/g, "<break time='250ms'/>");
            if (lastNode == 'end' || lastNode == 'end_help') {
                this.emit(':tell', dialog);
            }
            else {
                this.emit(':ask', dialog, buildReprompt(game));
            }
        },
        'AMAZON.NoIntent': function () {
            this.handler.state = CONFIRM_MODE;
            console.log('new game');
            var message = "Are you sure you want to start a new game? A new game will override the old saved game. Say 'Yes' to confirm " +
                "the new game, Or say 'No' to continue previous game.";
            var reprompt = "Say 'Yes' to confirm the new game, Or say 'No' to continue previous game.";
            this.emit(':ask', message, reprompt);
        },
        'ContinueGameIntent': function () {
            this.emitWithState("AMAZON.YesIntent");
        },
        'NewGameIntent': function () {
            this.emitWithState("AMAZON.NoIntent");
        },
        'AMAZON.HelpIntent': function () {
            var message = "Would you like to continue the game? Say 'Yes' to continue the game, Or say 'No' to start a new game. ";
            var reprompt = "Say 'Yes' to continue the game, Or say 'No' to start a new game.";
            this.emit(':ask', message, reprompt);
        },
        'AMAZON.StopIntent': function () {
            console.log("this in Stop" + JSON.stringify(this));
            this.emit(':tell', 'Goodbye.');
        },
        'AMAZON.CancelIntent': function () {
            console.log("this in Cancel" + JSON.stringify(this));
            this.emit(':tell', 'Goodbye.');
        },
        'Unhandled': function () {
            console.log("Unhandled: " + JSON.stringify(this.event, null, 4));
            var message = "Sorry, I did not get that. Trying say 'Yes' to continue the game, Or say 'No' to start a new game.";
            var reprompt = "Say 'Yes' to continue the game, Or say 'No' to start a new game.";
            this.emit(':ask', message, reprompt);
        }
    }),

    confirmModeIntentHandlers : Alexa.CreateStateHandler(CONFIRM_MODE, {
        "NewSession" : function () {
            console.log("new session in confirm mode");
            this.emit("NewSession");
        },
        'AMAZON.YesIntent': function () {
            this.handler.state = PLAY_MODE;
            console.log("confirm new game");
            var game = new SugarCube(storyData, this.attributes, storyData.intro);
            var dialog = game.resolve();
            this.attributes.lastNode = game.currentNode.name;
            dialog = dialog.replace(/\n/g, "<break time='250ms'/>");
            this.emit(':ask', dialog, buildReprompt(game));
        },
        'ContinueGameIntent': function () {
            this.emitWithState("AMAZON.NoIntent");
        },
        'NewGameIntent': function () {
            this.emitWithState("AMAZON.YesIntent");
        },
        'AMAZON.HelpIntent': function () {
            var message = "Say 'Yes' to confirm the new game, Or say 'No' to continue previous game.";
            var reprompt = "Say 'Yes' to confirm the new game, Or say 'No' to continue previous game.";
            this.emit(':ask', message, reprompt);
        },
        'AMAZON.StopIntent': function () {
            console.log("this in Stop" + JSON.stringify(this));
            this.emit(':tell', 'Goodbye.');
        },
        'AMAZON.CancelIntent': function () {
            console.log("this in Cancel" + JSON.stringify(this));
            this.emit(':tell', 'Goodbye.');
        },
        'AMAZON.NoIntent': function () {
            console.log("confirm continue game");
            this.handler.state = PLAY_MODE;
            var lastNode = this.attributes.lastNode;
            console.log(lastNode);
            var game = new SugarCube(storyData, this.attributes, storyData[lastNode]);
            var dialog = game.resolve();
            this.attributes.lastNode = game.currentNode.name;
            dialog = dialog.replace(/\n/g, "<break time='250ms'/>");
            if (lastNode == 'end' || lastNode == 'end_help') {
                this.emit(':tell', dialog);
            }
            else this.emit(':ask', dialog, buildReprompt(game));
        },
        'Unhandled': function () {
            console.log("Unhandled: " + JSON.stringify(this.event, null, 4));
            var message = "Sorry, I did not get that. Trying say 'Yes' to confirm the new game, Or say 'No' to continue previous game.";
            var reprompt = "Say 'Yes' to confirm the new game, Or say 'No' to continue previous game.";
            this.emit(':ask', message, reprompt);
        }
    }),

    playModeIntentHandlers: Alexa.CreateStateHandler(PLAY_MODE, {
        'NewSession': function () {
            console.log("NewSession in play mode");
            console.log("this" + JSON.stringify(this));
            //this.emitWithState("importVoucherCode");
            this.emit("NewSession");
            //this.emitWithState("scanVoucherCode");
        },
        'AMAZON.HelpIntent': function () {
            this.emitWithState('EverythingElseIntent', 'help');
        },
        'AMAZON.StopIntent': function () {
            console.log("this in Stop" + JSON.stringify(this));
            this.emit(':tell', 'Goodbye.');
        },
        'AMAZON.CancelIntent': function () {
            console.log("this in Cancel" + JSON.stringify(this));
            this.emit(':tell', 'Goodbye.');
        },
        'AMAZON.YesIntent': function () {
            this.emitWithState('EverythingElseIntent', 'yes');
        },
        'AMAZON.NoIntent': function () {
            this.emitWithState('EverythingElseIntent', 'no');
        },
        'AMAZON.RepeatIntent': function () {
            this.emitWithState('EverythingElseIntent', 'replay');
        },
        'EverythingElseIntent': function (userDialog) {
            if (!userDialog) {
                userDialog = this.event.request.intent.slots.PlayerDialog.value;
            }
            console.log("EverythingElseIntent: " + userDialog);
            if (DEBUG) console.log("EverythingElseIntent: session=" + JSON.stringify(this));
            var that = this;

            // restore the game state
            var game = new SugarCube(storyData, that.attributes, storyData[that.attributes.lastNode]);

            // figure out which choice was selected
            game.pickNode(userDialog, function (err, node) {
                console.log("picknode callback");
                console.log("err" + JSON.stringify(err));
                console.log("node" + JSON.stringify(node));
                if (err) {
                    console.log(err);
                    that.emit(':tell', "Sorry, something went wrong...");
                } else if (node == null) {
                    that.emit(':ask', "Sorry, I didn't catch that...", buildReprompt(game));
                } else {
                    if (DEBUG) console.log("EverythingElseIntent: selectedNode=" + JSON.stringify(node, null, 4));
                    console.log(JSON.stringify(node));
                    game.currentNode = node;
                    var dialog = game.resolve();
                    that.attributes.lastNode = game.currentNode.name;
                    // console.log("this.attributes.lastNode" + that.attributes.lastNode);
                    console.log("this.attributes.lastNode" + that.attributes.lastNode);
                    dialog = dialog.replace(/\n/g, "<break time='250ms'/>");

                    if (game.currentNode.action.type == 'end_game') {
                        if (node.name == "end") {
                            scanVoucherCode.call(that,()=>{
                                if (that.attributes.voucherCode != "undefined") {
                                    var cardTitle = 'Your RuneScape Offer';
                                    var code = that.attributes.voucherCode;
                                    var cardContent = 'Get your hands on £20 worth of content, including 25 days of membership, in-game currency, and keys to unlock prizes! Your code is ' + code +'\r\n' +
                                        'Download instructions \r\n' +
                                        "1.  Visit http://www.runescape.com/ and create your FREE Runescape account\r\n" +
                                        "2.  Hit ‘Play Now’ and follow the prompts to download – you now have access to the world of Gielinor! \r\n" +
                                        "3.  Next, visit http://www.runescape.com/redeem and log in when prompted \r\n" +
                                        "4.  Enter your starter pack code in the box available then hit redeem to unlock your greatest adventure!\r\n";
                                    var imageObj = {
                                        "smallImageUrl" : "https://s3-eu-west-1.amazonaws.com/runescape/images/Runescape_Logo_small.png",
                                        "largeImageUrl" : "https://s3-eu-west-1.amazonaws.com/runescape/images/Runescape_Logo.png"
                                    };
                                    that.emit(':tellWithCard', dialog, cardTitle, cardContent, imageObj);
                                }
                                else that.emit(':tell', dialog);
                            });
                        }
                        else that.emit(':tell', dialog);
                    } else {
                        that.emit(':ask', dialog, buildReprompt(game));
                    }
                }
            })
        },
        'SessionEndedRequest': function () {
            console.log("SessionEndedRequest");
            console.log(JSON.stringify(this));
            this.emit(':responseReady');
        },
        'Unhandled': function () {
            console.log("unhandled in play mode");
            var message = "Sorry, I didn't get that. Trying say 'help' to see what you can say.";
            var reprompt = "Trying say 'help' to get available options.";
            this.emit(':ask', message, reprompt);
        }
    })
};


exports.handler = function(event, context) {
    console.log("skill entry");
    console.log("event in skill entry" + JSON.stringify(event));
    console.log("context in skill entry" + JSON.stringify(context));
    var alexa = Alexa.handler(event, context);
    alexa.registerHandlers(newSessionHandlers, stateHandlers.playModeIntentHandlers, stateHandlers.confirmModeIntentHandlers, stateHandlers.resumeDecisionModeIntentHandlers);
    alexa.dynamoDBTableName = "RuneScape";
    alexa.execute();
};

function buildReprompt(game) {
    var reprompt = "Try saying: ";
    var choices = game.currentNode.action.choices;
    if (choices) {
        for (var i = 0; i < (choices.length > 6 ? 6 : choices.length); i++) {
            if (i == choices.length - 1) {
                reprompt += "or \"" + choices[i].utterance + "\".";
            } else {
                reprompt += "\"" + choices[i].utterance + "\", ";
            }
        }
    }
    return reprompt;
}

function importVoucherCode() {
    voucherReader.importVoucherCodes(()=>{
        this.emit(":tell","good bye");
    });
}

function scanVoucherCode(callback) {
    console.log("scanVoucherCode");
    voucherReader.scanVoucherCodes((items)=>{
        console.log(JSON.stringify(this));
        console.log("finish scanVoucherCode");
        console.log(items.length);
        var userID = this.event.session.user.userId;
        console.log(userID);
        var selectedItems = [];
        while (selectedItems.length < 3) {
            var rand = items[Math.floor(Math.random() * items.length)];
            if (selectedItems.indexOf(rand) == -1) {
                selectedItems.push(rand);
            }
        }
        console.log(selectedItems.length);
        console.log(JSON.stringify(selectedItems));
        updateVoucherCode.call(this, selectedItems, userID, ()=>{
            callback();
        });
    });
}

function updateVoucherCode(items, userID, callback) {
    console.log("updateVoucherCode");
    //pick up one by random
    //var selectedItem = items[Math.floor(Math.random() * items.length)];
    //console.log(selectedItem);
    //console.log(JSON.stringify(selectedItem));

    voucherReader.updateVoucherCodes(items[0], userID, (err)=>{
        if (err) {
            console.log(error);
            items.shift();
            if (items.length > 0) {
                updateVoucherCode.call(this, items, userID);
            } else {
                this.attributes.voucherCode = "undefined";
            }
        }
        else {
            console.log(JSON.stringify(this));
            console.log(JSON.stringify(items[0]));
            this.event.session.attributes.voucherCode = items[0].voucherCode;
            console.log("finish updateVoucherCode");
            callback();
        }
    });
}



