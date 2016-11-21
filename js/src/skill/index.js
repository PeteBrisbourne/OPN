var Alexa = require('alexa-sdk');
var storyData = require('story_data.json');
var request = require('request');
var SugarCube = require('sugarcube');

// TODO: Add handling for delay_then_go actions.
// TODO: Add more natural reprompt hints for phrases.  Summarize the content and suggest a keyword?

var DEBUG = true;
var PLAY_MODE = "PLAY_MODE";

// create handlers for all the story nodes
var newSessionHandlers = {
    'NewSession': function() {
        console.log("NewSession: ");
        console.log("this in NewSession" + JSON.stringify(this));
        if (this.attributes.lastNode && this.attributes.lastNode != "end") {
            console.log("this.attributes" + JSON.stringify(this.attributes));
            console.log("here");
            var lastNode = this.attributes.lastNode.replace(/_/g, " ");
            console.log(lastNode);
            var welcomeMsg = "Welcome to One Piercing Note, RuneScape quest. A game has already started. Last scene you visited is "
                + lastNode +  ". Would you like to continue the game?" +
                "Say 'Continue' to continue the game, Or say 'New Game' to start a new game. ";
            var reprompt = "Would you like to continue the game? Say 'Continue' to continue the game, Or say 'New Game' to start a new game. ";
            this.handler.state = PLAY_MODE;
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
        var message = "Would you like to continue the game? Say 'Continue' to continue the game, Or say 'New Game' to start a new game. ";
        var reprompt = "Say 'Continue' to continue the game, Or say 'New Game' to start a new game.";
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
        console.log("this in NewSeesion Unhandle" + JSON.stringify(this));
        console.log("Unhandled:  Shouldn't have gotten here: " + JSON.stringify(this.event, null, 4));
        var message = "Sorry, I did not get that, say 'continue' to continue game or say 'new game' to start a new game";
        var reprompt = "Say 'continue' to continue game or say 'new game' to start a new game";
        this.emit(':ask', message, reprompt);
    }
};
var stateHandlers = {
    playModeIntentHandlers: Alexa.CreateStateHandler(PLAY_MODE, {
        'NewSession': function () {
            console.log("NewSession: ");
            console.log("this in Play Mode" + JSON.stringify(this));
            this.emit("NewSession");
        },
        'NewGameIntent' : function () {
            console.log("new game");
            var game = new SugarCube(storyData, this.attributes, storyData.intro);
            var dialog = game.resolve();
            this.attributes.lastNode = game.currentNode.name;
            dialog = dialog.replace(/\n/g, "<break time='250ms'/>");
            this.emit(':ask', dialog, buildReprompt(game));
        },

        'ContinueGameIntent' : function () {
            console.log("continue game");
            var lastNode = this.attributes.lastNode;
            console.log(lastNode);
            var game = new SugarCube(storyData, this.attributes, storyData[lastNode]);
            var dialog = game.resolve();
            this.attributes.lastNode = game.currentNode.name;
            dialog = dialog.replace(/\n/g, "<break time='250ms'/>");
            this.emit(':ask', dialog, buildReprompt(game));
        },
        'AMAZON.HelpIntent': function () {
            this.emit(':tell', 'not yet implemented :(');
        },
        'AMAZON.StopIntent': function () {
            console.log("this in Stop" + JSON.stringify(this));
            this.emit(':tell', 'Goodbye.');
        },
        'AMAZON.CancelIntent': function () {
            console.log("this in Cancel" + JSON.stringify(this));
            this.emit(':tell', 'Goodbye.');
        },
        'EverythingElseIntent': function () {
            var userDialog = this.event.request.intent.slots.PlayerDialog.value;
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

                    game.currentNode = node;
                    var dialog = game.resolve();
                    that.attributes.lastNode = game.currentNode.name;
                    dialog = dialog.replace(/\n/g, "<break time='250ms'/>");

                    if (game.currentNode.action.type == 'end_game') {
                        that.emit(':tell', dialog);
                    } else {
                        that.emit(':ask', dialog, buildReprompt(game));
                    }
                }
            })
        },
        'Unhandled': function () {
            console.log(this.event.request.intent.slots.PlayerDialog.value);
            console.log("Unhandled:  Shouldn't have gotten here: " + JSON.stringify(this.event, null, 4));
            this.emit(':tell', 'Goodbye.');
        }
    })
};


exports.handler = function(event, context) {
    console.log("skill entry");
    console.log("event in skill entry" + JSON.stringify(event));
    console.log("context in skill entry" + JSON.stringify(context));
    var alexa = Alexa.handler(event, context);
    alexa.registerHandlers(newSessionHandlers, stateHandlers.playModeIntentHandlers);
    alexa.dynamoDBTableName = "RuneScape";
    alexa.execute();
};

function buildReprompt(game) {
    var reprompt = "Try saying: ";
    var choices = game.currentNode.action.choices;
    for(var i = 0; i < (choices.length > 3 ? 3 : choices.length); i++) {
        if(i == choices.length - 1) {
            reprompt += "or \"" + choices[i].utterance + "\".";
        } else {
            reprompt += "\"" + choices[i].utterance + "\", ";
        }
    }
    return reprompt;
}