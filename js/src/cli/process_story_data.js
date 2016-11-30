var fs = require('fs');

fs.readFile('story_tts_version.txt', 'utf8', function(err, data) {
    if(err) {
        console.log(err);
    } else {
        // strip out comments and empty lines
        data = data.replace(/^\/\/.*\n/g, '');
        data = data.replace(/[\n]+/g, '\n');
        data = data.trim();

        var nodes = {};
        data.split('\n:: ').forEach(function(rawBlock) {
            var block = rawBlock;
            var node = {};

            // replace any line continuations
            block = block.replace(/\\\n/g, '');
            block = block.replace(/\n\\/g, '');

            // the first line should be the id of the node
            node.name = validIntentPrefix(block.match(/(.*)[\n]/)[1].replace(/::/g, ''));

            // the last line should an action to take
            var action = block.match(/\n(.*)(?![\s\S]*\n.*)/)[1];
            if(action.match(/<<choice.*>>/)) {
                node.action = {
                    type: 'choice',
                    choices: []
                };
                var choices = action.split(/(?:\s*\|\s*)(?=<<)/);
                choices.forEach(function(choice) {
                    console.log("node" + JSON.stringify(node));
                    console.log("choice" + JSON.stringify(choice));
                    node.action.choices.push({
                        utterance: choice.match(/<<choice \[\[(.*)\|.*]]>>/)[1],
                        nextNode: validIntentPrefix(choice.match(/<<choice \[\[.*\|(.*)]]>>/)[1])
                    });
                });
            } else if(action.match(/\[\[delay.*\]\]/)) {
                node.action = {
                    type: 'delay_then_go',
                    delayLength: action.match(/\[\[delay (.*)\|.*\]\]/)[1],
                    nextNode: validIntentPrefix(action.match(/\[\[.*\|(.*)\]\]/)[1])
                };
                // convert to seconds
                if (node.action.delayLength.indexOf('m')) {
                    node.action.delayLength = parseInt(node.action.delayLength.replace('m', ''));
                    node.action.delayLength = node.action.delayLength * 60;
                } else if (node.action.delayLength.indexOf('s')) {
                    node.action.delayLength = parseInt(node.action.delayLength.replace('s', ''));
                }
            } else if(action.match(/\[\[.*\]\]/)) {
                node.action = {
                    type: 'go',
                    nextNode: action.match(/\[\[(.*)\]\]/)[1]
                }
            } else {
                node.action = {
                    type: 'end_game'
                }
            }

            // the rest is the script of the node
            var script = block.split('\n');
            script.splice(0,1);
            if(script.length > 1) {
                script.splice(script.length - 1,1);
            }
            script = script.join('\n');
            node.script = script;

            nodes[node.name] = node;
        });

        // get a list of all the intents
        var utteranceDedupeMap = {};
        var intentSchema = {
            intents: []
        };
        intentSchema.intents.push({intent: "AMAZON.HelpIntent"});
        intentSchema.intents.push({intent: "AMAZON.StopIntent"});
        intentSchema.intents.push({intent: "AMAZON.CancelIntent"});
        intentSchema.intents.push({
            intent: "EverythingElseIntent",
            slots: [
                {
                    name: "PlayerDialog",
                    type: "PLAYER_DIALOG"
                }
            ]
        });
        var utterances = ["EverythingElseIntent {PlayerDialog}"];
        var slotValues = [];
        for(var key in nodes) {
            var node = nodes[key];
            if(node.action.type == 'choice') {
                node.action.choices.forEach(function(choice) {
                    if(utteranceDedupeMap[choice.utterance]) {
                        // do nothing
                    } else {
                        slotValues.push(choice.utterance);
                        utteranceDedupeMap[choice.utterance] = 1;
                    }
                });
            }
        }
        console.log("Unique utterances: " + Object.keys(utteranceDedupeMap).length);

        // write out a data file for the skill to use
        fs.writeFile('../skill/story_data.json', JSON.stringify(nodes, null, 2));
        fs.writeFile('../../speechAssets/intent_schema.json', JSON.stringify(intentSchema, null, 2));
        fs.writeFile('../../speechAssets/PLAYER_DIALOG.txt', slotValues.join('\n'));
        fs.writeFile('../../speechAssets/sample_utterances.txt', utterances.join('\n'));
    }
});

function validIntentPrefix(input) {
    var name = input;
    var replacementDict = {
        " ": "", "\\.": "dot", "\\?": "question",
        "1": "one", "2": "two", "3": "three", "4": "four", "5": "five", "6": "six", "7": "seven", "8": "eight", "9": "nine"
    };
    for(var key in replacementDict) {
        name = name.replace(new RegExp(key, "g"), replacementDict[key]);
    }
    return name;
}