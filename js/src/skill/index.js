var Alexa = require('alexa-sdk');
var storyData = require('story_data.json');
var request = require('request');
var SugarCube = require('sugarcube');

// TODO: Add handling for delay_then_go actions.
// TODO: Add more natural reprompt hints for phrases.  Summarize the content and suggest a keyword?

var DEBUG = true;

// create handlers for all the story nodes
var handlers = {
    'NewSession': function() {
        console.log("NewSession: ");
        console.log("this in NewSession" + JSON.stringify(this.attributes));
        var game = new SugarCube(storyData, this.attributes, storyData.intro);
        var dialog = game.resolve();
        this.attributes.lastNode = game.currentNode.name;
        dialog = dialog.replace(/\n/g, "<break time='250ms'/>");
        this.emit(':ask', dialog, buildReprompt(game));
    },
    'AMAZON.HelpIntent': function() {
        this.emit(':tell', 'not yet implemented :(');
    },
    'AMAZON.StopIntent': function() {
        console.log("this in Stop" + JSON.stringify(this.attributes));
        this.emit(':tell', 'Goodbye.');
    },
    'AMAZON.CancelIntent': function() {
        console.log("this in Cancel" + JSON.stringify(this.attributes));
        this.emit(':tell', 'Goodbye.');
    },
    'EverythingElseIntent': function() {
        var userDialog = this.event.request.intent.slots.PlayerDialog.value;
        console.log("EverythingElseIntent: " + userDialog);
        if(DEBUG) console.log("EverythingElseIntent: session=" + JSON.stringify(this.attributes));
        var that = this;

        // restore the game state
        var game = new SugarCube(storyData, that.attributes, storyData[that.attributes.lastNode]);

        // figure out which choice was selected
        game.pickNode(userDialog, function(err, node) {
            if(err) {
                console.log(err);
                that.emit(':tell', "Sorry, something went wrong...");
            } else if(node == null) {
                that.emit(':ask', "Sorry, I didn't catch that...", buildReprompt(game));
            } else {
                if(DEBUG) console.log("EverythingElseIntent: selectedNode=" + JSON.stringify(node, null, 4));

                game.currentNode = node;
                var dialog = game.resolve();
                that.attributes.lastNode = game.currentNode.name;
                dialog = dialog.replace(/\n/g, "<break time='250ms'/>");

                if(game.currentNode.action.type == 'end_game') {
                    that.emit(':tell', dialog);
                } else {
                    that.emit(':ask', dialog, buildReprompt(game));
                }
            }
        }, this);
    },
    'Unhandled': function() {
        console.log("Unhandled:  Shouldn't have gotten here: " + JSON.stringify(this.event, null, 4));
        this.emit(':tell', 'Goodbye.');
    }
};

exports.handler = function(event, context) {
    var alexa = Alexa.handler(event, context);
    alexa.registerHandlers(handlers);
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