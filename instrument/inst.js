let esprima = require('../../node_fingerprinting/node_modules/esprima')
let escodegen = require('../../node_fingerprinting/node_modules/escodegen')
let fs = require('fs');
const DEBUG = false;

  if (process.argv[2])
    startAnalysis([], 0, [])
  else
    print("Error: no files to instrument")


  function startAnalysis(item, index, arr) {
    if (process.argv[2])
      var s = fs.readFileSync(`${process.argv[2]}`, 'utf8');
    else
      var s = fs.readFileSync(`tests/${item[0]}.js`, 'utf8');

    try {
        var parsed = esprima.parseScript(s, {tokens: true});
    }
    catch (e) {}


    if (DEBUG) console.log(parsed);

    if (DEBUG) console.log("=======================");
    let total_lines_added = recursive_add(parsed, 0);

    function token() {
      return process.argv[3]
    }

    function url() {
      return process.argv[4]
    }

    function fail(init, tag) {
      if (init.type !== 'Identifier') {
        if (DEBUG) console.log("[" + tag + "] ERROR - " + init.type + " - NOT YET IMPLEMENTED");
      }
    }

// Sanity check
    function isInstrumentedCode(statement) {

      // Check if expr is our log statement
      expr = undefined;

      if (statement.type === "Program" &&
          statement.body.length === 1 &&
          statement.body[0].type &&
          statement.body[0].type === "ExpressionStatement") {
        expr = statement.body[0];
      }


      if (statement.type === "ExpressionStatement") {
        expr = statement;
      }

      if (expr &&
          expr.expression.callee &&
          expr.expression.callee.name &&
          expr.expression.callee.name === "fetch" &&
          expr.expression.arguments &&
          expr.expression.arguments[0].type === "Literal" &&
          expr.expression.arguments[0].value.startsWith(url())
      ) {
        return true;
      }
      return false;
    }

    function addFetch(current, added, i, root) {
      var aux = current + added;
      if (root.body)
        root.body.splice(i, 0, esprima.parse('fetch("' + url() + token() + '/line/' + (aux) + '");'));
      else
        root.splice(i, 0, esprima.parse('fetch("' + url() + token() + '/line/' + (aux) + '");'));
      added++;
      i++;
      return [aux, added, i];
    }

    function parseIf(root, i) {
      if (root.body[i].consequent.type && root.body[i].consequent.type !== "BlockStatement") {

        let nodeToParse = root.body[i].consequent;
        let newNode = {
          type: 'BlockStatement',
          body: [nodeToParse]
        };
        root.body[i].consequent = newNode;
      }
      if (root.body[i].alternate && root.body[i].alternate.type && root.body[i].alternate.type !== "BlockStatement") {

        let nodeToParse = root.body[i].alternate;
        let newNode = {
          type: 'BlockStatement',
          body: [nodeToParse]
        };
        root.body[i].alternate = newNode;
      }
    }

    function parseFor(root, i) {
      if (root.body[i].body.type && root.body[i].body.type !== "BlockStatement") {
        let nodeToParse = root.body[i].body;
        let newNode = {
          type: 'BlockStatement',
          body: [nodeToParse]
        };
        root.body[i].body = newNode;
      }
    }

    function recursive_add(root, current) {
      if (!root)
        return 0;
      var inserted_line_number;
      var added = 0;

      if (root.body) {
        var i = 0;
        while (root.body[i]) {
          // Sanity check to ensure we are not analyzing our inserted code
          // Checks for fetch("http://localhost:8080/" ...
          if (isInstrumentedCode(root.body[i])) {
            i = i + 1
            continue
          }
          let aux = addFetch(current, added, i, root)
          inserted_line_number = aux[0], added = aux[1], i = aux[2];
          let toAnalyzeBody = ["WithStatement", "Program", "FunctionDeclaration", "LabeledStatement", "ForInStatement", "ForStatement", "ForOfStatement"];

          if (root.body[i].type === "IfStatement") {
            parseIf(root, i)
            added += recursive_add(root.body[i].consequent, current + added);
            added += recursive_add(root.body[i].alternate, current + added);
          } else if (toAnalyzeBody.includes(root.body[i].type)) {
            parseFor(root, i)
            added += recursive_add(root.body[i].body, current + added);
          } else if (root.body[i].type === "VariableDeclaration") {
            if (root.body[i].declarations)
              for (var declaratorIndex in root.body[i].declarations){
                var declarator = root.body[i].declarations[declaratorIndex];

              if (declarator.type === "VariableDeclarator") {
                var init = declarator.init;
                if (init) {
                  if (init.type === "FunctionExpression") {
                    added += recursive_add(init.body, current + added);
                  }
                  else if (init.type === "CallExpression") {
                    if (init.callee.body && init.callee.body.type === 'BlockStatement') {
                      added += recursive_add(init.callee.body, current + added);
                    }
                    if (init.arguments)
                      for (var argumentIndex in init.arguments){
                        added += recursive_add(init.arguments[argumentIndex], current + added);
                      }
                  }
                  else if (init.type === "ConditionalExpression") {
                    if (init.consequent.body) {
                      added += recursive_add(init.consequent, current + added);
                    }
                    let toAnalyze = ["FunctionExpression", "NewExpression"]
                    if (init.alternate && toAnalyze.includes(init.alternate.type))
                      added += recursive_add(init.alternate, current + added);
                  }
                  else if (init.type === "Literal") {
                  }
                  else if (init.type === "ObjectExpression") {
                    if (init.properties) {
                      for (var property in init.properties)
                        if (init.properties[property].value)
                          added += recursive_add(init.properties[property].value.body, current + added);
                    }
                  }
                  else if(init.type === "ArrowFunctionExpression"){
                    added += recursive_add(init.body, current + added);
                  }
                  else {
                    fail(init, "VariableDeclarator");
                  }
                } else {
                  fail(declarator, "NullDeclarator");
                }
              }
            }
          } else if (["FunctionExpression", "CallExpression"].includes(root.body[i].type)) {
            //console.log()
          } else if (root.body[i].type === "ReturnStatement") {
            if (root.body[i].argument !== null) {
              if (root.body[i].argument.type !== "ConditionalExpression")
                added += recursive_add(root.body[i].argument, current + added);
            }
          } else if (root.body[i].type === "ExpressionStatement") {
            added += recursive_add(root.body[i].expression, current + added);
          } else if (root.body[i].type === "SwitchStatement") {
            var cases = root.body[i].cases;
            for (var j = 0; j < cases.length; j++) {
              if (cases[j].consequent) {

                var newArray = Array()

                for (let c = 0; c < cases[j].consequent.length; c++) {
                  let aux = addFetch(current, added, newArray.length, newArray)
                  inserted_line_number = aux[0], added = aux[1], i = aux[2];

                  added += recursive_add(cases[j].consequent[c], current + added);

                  newArray.push(cases[j].consequent[c]);
                  if (newArray[newArray.length - 1].type === "BreakStatement")
                    break;
                }

                if (newArray[newArray.length - 1] !== undefined) {
                  if (newArray[newArray.length - 1].type !== "BreakStatement") {
                    let aux = addFetch(current, added, newArray.length, newArray)
                    inserted_line_number = aux[0], added = aux[1], i = aux[2]
                  }
                }

                cases[j].consequent = newArray;
              }
            }
          } else if (root.body[i].type === "TryStatement") {
            if (root.body[i].block) {
              added += recursive_add(root.body[i].block, current + added);
            }

            if (root.body[i].handler) {
              added += recursive_add(root.body[i].handler.body, current + added);
            }

            if (root.body[i].finalizer) {
              added += recursive_add(root.body[i].finalizer.body, current + added);
            }
          } else
            fail(root.body[i], "fail-root.body");

          i++;
        }

        if (root.body && root.type === "FunctionExpression") {
          added += recursive_add(root.body, current + added);
        }

        let doNotAdd = ['ReturnStatement', 'BreakStatement']
        if ((root.body[root.body.length - 1] && !doNotAdd.includes(root.body[root.body.length - 1].type)) || (root.body.length==0)) {
          let aux = addFetch(current, added, i, root)
          inserted_line_number = aux[0], added = aux[1], i = aux[2];
        }
      } else {
        let toAnalyze = ["CallExpression", "NewExpression"]
        if(root[0] === "ExpresionStatement") {
          if (root[0].expression === "AssigmentExpression"){
            added += recursive_add(root[0].expression.left, current + added);
            added += recursive_add(root[0].expression.right, current + added);
          }

        } else if (toAnalyze.includes(root.type)) {
          added += recursive_add(root.callee, current + added);
          if (root.arguments)
            for (var elem in root.arguments) {
              if (root.arguments[elem].properties) {
                for (var property in root.arguments[elem].properties)
                  if (root.arguments[elem].properties[property].value)
                    added += recursive_add(root.arguments[elem].properties[property].value.body, current + added);
              } else if (root.arguments[elem].body) {
                added += recursive_add(root.arguments[elem].body, current + added);
              }
            }

        } else if (root.type === "IfStatement") {
          added += recursive_add(root.consequent, current + added);
          added += recursive_add(root.alternate, current + added);
        } else if (root.properties) {
          for (var elem in root.properties) {
            if (root.properties[elem].value) {
              added += recursive_add(root.properties[elem].value.body, current + added);
            }
          }
        } else if (["LogicalExpression", "AssignmentExpression"].includes(root.type) && root.right && root.right.type != 'ConditionalExpression') {
          added += recursive_add(root.left, current + added);
          added += recursive_add(root.right, current + added);
        } else if (root.expressions) {
          for (var elem in root.expressions) {
            added += recursive_add(root.expressions[elem], current + added);
          }
        }
        else if (root.declarations) {
          for (var elem in root.declarations) {
            added += recursive_add(root.declarations[elem], current + added);
          }
        }
        else if (root.init) {
          added += recursive_add(root.init.body, current + added);
        }
        else if (root.type === "ConditionalExpression") {
          // Example: (x==='Hello') ? alert("Hello") : alert("Bye");
          var exprStat = {
            type: 'ExpressionStatement',
            expression: root.consequent
          };
          let consequent = {
            type: 'BlockStatement',
            body: [exprStat]
          };
          var exprStat = {
            type: 'ExpressionStatement',
            expression: root.alternate
          };
          let alternate = {
            type: 'BlockStatement',
            body: [exprStat]
          };
          root.test = root.test;
          root.consequent = consequent;
          root.alternate = alternate;
          root.type = "IfStatement";

          added += recursive_add(root.consequent, current + added);
          added += recursive_add(root.alternate, current + added);
        }
        else if (["UnaryExpression"].includes(root.type)){
          if(root.argument){
            added += recursive_add(root.argument, current + added)
          }
        }
        else if (root.object){
          var obj = root.object;
          if (obj.arguments){
            for (var argu in obj.arguments) {
              if (obj.arguments[argu].properties) {
                for (var property in obj.arguments[argu].properties)
                  if (obj.arguments[argu].properties[property].value)
                    added += recursive_add(obj.arguments[argu].properties[property].value.body, current + added);
              }
            }
          }
        }
        else {
          fail(root, "NO BODY");
        }
      }

      return added;
    }

    try {
      var instrumented_code = escodegen.generate(parsed);

    if (!process.argv[2]) {
      //TODO: Modify when instrumenting an external file
      let FgRed = "\x1b[31m"
      let FgGreen = "\x1b[32m"
      if (total_lines_added !== item[1])
        console.log(`${FgRed}${item[0]} --> ${total_lines_added} \t\t Expected: ${item[1]}`)
      else
        console.log(`${FgGreen}${item[0]} --> ${total_lines_added}`)

      fs.writeFile(`output/${item[0]}_output.js`, instrumented_code, function (err) {
        if (err) return console.log(err);
      });
    } else {
      fs.writeFile(`output.js`, instrumented_code, function (err) {
        if (err) return console.log(err);
      });
      console.log(total_lines_added)
    }
     } catch (e) {
      console.log('-1')
      }
}
