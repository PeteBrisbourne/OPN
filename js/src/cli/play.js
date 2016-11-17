var storyData = require('./../skill/story_data');
var prompt = require('prompt');
var colors = require('colors/safe');
var SugarCube = require('../skill/sugarcube');

var game = new SugarCube(storyData, {}, storyData.intro);

console.log(colors.cyan('Other: ') + game.resolve());
prompt.message = '';
prompt.delimiter = colors.cyan(':');
prompt.start();
promptUser();

function promptUser() {
    prompt.get({
        properties: {
            text: {
                description: colors.cyan("You")
            }
        }
    }, function(err, result) {
        if(err) {
            console.log(err);
        } else {
            if(result.text.toLowerCase() == 'exit') {
                process.exit();
            } else if(result.text.toLowerCase() == 'session') {
                console.log(colors.red(JSON.stringify(game.session)));
                promptUser();
            } else if(result.text.toLowerCase() == 'choices') {
                console.log(colors.red(JSON.stringify(game.currentNode.action.choices)));
                promptUser();
            } else {
                game.pickNode(result.text, function(err, node) {
                    if(err) {
                        console.log(err);
                    } else if(node) {
                        game.currentNode = node;
                        console.log(colors.cyan('Other: ') + game.resolve());
                        if(game.currentNode.action.type == 'end_game') {
                            // do nothing
                        } else {
                            promptUser();
                        }
                    } else {
                        console.log(colors.cyan("Other: ") + "Sorry, I don't understand you...");
                        promptUser();
                    }
                });
            }
        }
    });
}