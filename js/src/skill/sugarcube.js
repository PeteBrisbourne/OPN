var request = require('request');
var mathjs = require('mathjs');
var jsep = require('jsep');
jsep.addBinaryOp('is', 10);
jsep.addBinaryOp('and', 5);

var DEBUG = false;

module.exports = function(storyData, session, currentNode) {
    this.storyData = storyData;
    this.currentNode = currentNode;
    this.session = session;

    this.pickNode = function(input, callback) {
        console.log("pickNode");
        var that = this;
        var options = [];
        that.currentNode.action.choices.forEach(function(choice) {
          options.push(choice.utterance);
        });

        console.log("options" + JSON.stringify(options));

        request({
            url: 'https://murmuring-eyrie-11211.herokuapp.com/nlp/getClosestPhrase',
            method: "POST",
            json: {
                input: input,
                options: options
            }
        }, function(err, response, result) {
            console.log("err" + JSON.stringify(err));
            console.log("response" + JSON.stringify(response));
            console.log("result" + JSON.stringify(result));
            if(err) {
                console.log(err);
                callback(err);
            } else {
                if(result.option == null) {
                    callback(null, null);
                } else {
                    that.currentNode.action.choices.forEach(function(choice) {
                        if(choice.utterance == result.option) {
                            callback(null, storyData[choice.nextNode]);
                        }
                    });
                }
            }
        });
    };

    this.resolve = function() {
        console.log("this in resolve" + JSON.stringify(this));
        var that = this;
        var dialog = that.processScript(that.currentNode.script);
      while(that.currentNode.action.type == 'go' ||
            that.currentNode.action.type == 'delay_then_go' ||
            (that.currentNode.oneTimeAction && (that.currentNode.oneTimeAction.type == 'go' || that.currentNode.oneTimeAction.type == 'delay_then_go'))) {
          if(that.currentNode.oneTimeAction) {
              var lastNode = that.currentNode;
              that.currentNode = storyData[lastNode.oneTimeAction.nextNode];
              delete lastNode.oneTimeAction;
              dialog += "\n\n" + that.processScript(that.currentNode.script);
          } else {
              that.currentNode = storyData[that.currentNode.action.nextNode];
              dialog += "\n\n" + that.processScript(that.currentNode.script);
          }
      }
      return dialog;
    };

    this.processScript = function(script) {
        var that = this;
        var input = script;
        var output = "";
        var re = /<<([^>]*)>>/;
        var match;
        while(match = re.exec(input)) {
            if(match[1].indexOf('if') == 0) {
                var head = input.substring(0, match.index);
                var tail = input.substring(match.index + match[0].length);
                var segments = [];
                var reSub = /<<(else|elseif[^>]+|endif)>>/;
                var matchSub;
                var lastIfExpr = match[1];
                while(matchSub = reSub.exec(tail)) {
                    // peel off segments
                    if(matchSub[1].indexOf('elseif') == 0) {
                        segments.push({
                            ifExpr: lastIfExpr,
                            childScript: tail.substring(0, matchSub.index)
                        });
                        lastIfExpr = matchSub[1];
                        tail = tail.substring(matchSub.index + matchSub[0].length);
                    } else if(matchSub[1].indexOf('else') == 0) {
                        segments.push({
                            ifExpr: lastIfExpr,
                            childScript: tail.substring(0, matchSub.index)
                        });
                        lastIfExpr = matchSub[1];
                        tail = tail.substring(matchSub.index + matchSub[0].length);
                    } else if(matchSub[1].indexOf('endif') == 0) {
                        segments.push({
                            ifExpr: lastIfExpr,
                            childScript: tail.substring(0, matchSub.index)
                        });
                        lastIfExpr = null;
                        tail = tail.substring(matchSub.index + matchSub[0].length);
                        break;
                    }
                }
                if(lastIfExpr) {
                    segments.push({
                        ifExpr: lastIfExpr,
                        childScript: tail
                    });
                    lastIfExpr = null;
                    tail = "";
                } else {
                    // there was an endif tag, so keep the stuff outside the tag.
                }

                var processed = "";
                for(var i = 0; i < segments.length; i++) {
                    var segment = segments[i];
                    if(segment.ifExpr == 'else') {
                        processed = that.processScript(segment.childScript);
                        break;
                    } else {
                        var ast = jsep(segment.ifExpr.substring(3));

                        // evaluate the ast
                        function traverse(node) {
                            // visit
                            if(node.type == 'UnaryExpression') {
                                traverse(node.argument);
                            } else if(node.type == 'BinaryExpression') {
                                var left = traverse(node.left);
                                var right = traverse(node.right);

                                if(node.operator == 'is') {
                                    return left == right;
                                } else if(node.operator == 'and') {
                                    return left && right;
                                } else {
                                    console.log("SHOULDN'T HAVE GOTTEN HERE");
                                    return false;
                                }
                            } else if(node.type == 'Identifier') {
                                return that.session[node.name.substring(1)];
                            } else if(node.type == 'Literal') {
                                return node.value;
                            } else {
                                console.log("SHOULDN'T HAVE GOTTEN HERE");
                                return false;
                            }
                        }

                        if(traverse(ast)) {
                            processed = that.processScript(segment.childScript);
                            break;
                        }
                    }
                }

                input = head + processed + tail;
            } else if(match[1].indexOf('set') == 0) {
                var parts = match[1].substring(4).split('=');
                var parameter = parts[0].trim().substring(1);  // don't forget to remove the prefix '$'
                var valueExpr = parts[1].trim();

                // dereference any parameterized values
                var re2 = /\$(\S*)/;
                var matchSub;
                while(matchSub = re2.exec(valueExpr)) {
                    valueExpr = valueExpr.replace(matchSub[0], that.session[matchSub[1]]);
                }

                // evaluate the expresion and set it into the parameter
                that.session[parameter] = mathjs.eval(valueExpr);

                // remove the tag from the input
                input = input.substring(0, match.index) + input.substring(match.index + match[0].length);
            } else if(match[1].indexOf('silently') == 0) {
                var endingMatch = input.match(/<<endsilently>>/);

                // process the interior, throwing away the output
                that.processScript(input.substring(match.index + match[1].length, endingMatch.index));

                // remove this tag from the input
                input = input.substring(0, match.index) + input.substring(endingMatch.index + endingMatch[0].length);
            } else {
                console.log("SHOULDN'T HAVE GOTTEN HERE");
            }
        }

        // add any remaining input to the output
        output += input;
        output = output.trim();

        // sort of a hack, check if the output ends with a link
        var linkMatch;
        if(linkMatch = output.match(/\[\[(.*)\]\]$/)) {
            var link = linkMatch[1];
            if(DEBUG) console.log("processScript: found link in scene: " + linkMatch);
            output = output.replace(linkMatch[0], '');

            that.currentNode.oneTimeAction = {
                type: 'go',
                nextNode: link
            };
        }

        return output;
    };
};
