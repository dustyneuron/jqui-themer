#!/usr/bin/env node

(function () {
    var fs = require('fs');
    var csswrangler = require(__dirname + '/csswrangler/csswrangler.js');
        
    function applyTemplate(tree, data) {
                
        var replaceEntireAttribute = {
            'font-family': true,
        };

        tree.findAll('commentTag').forEach(function (magicTag) {
            
            var tagName = magicTag.print();
            
            //console.log(magicTag.printTree());
            
            if (data.hasOwnProperty(tagName)) {
                var newValue = data[tagName].toString();
                
                var declaration = magicTag.findParent('declaration');
                var ident = declaration.findFirst('property').findFirst('ident');
                
                if (replaceEntireAttribute.hasOwnProperty(ident.print())) {
                    
                    declaration.findFirst('expression').replaceWith(newValue);
                }
                else if ('filter' === ident.print()) {
                    declaration.findFirst('expression').replaceWith('Alpha(Opacity=' + newValue + ')');
                    
                    var prevDec = declaration.findPrevious('declaration');
                    var prevIdent = prevDec.findFirst('property').findFirst('ident');
                    
                    if ('opacity' === prevIdent.print()) {
                        prevDec.findFirst('expression').replaceWith('' + (data[tagName] / 100));
                    }
                }
                else {
                    var term = magicTag.findPrevious('term');
                    if (!term) {
                        throw new Error ('could not find term for ' + tagName);
                    }

                    term.replaceWith(newValue);
                }
            }
            
        });
        
        tree.findAll('commentTag').forEach(function (n) { n.findParent('comment').remove();});
        
        return tree.print();
        //return tree.printTree();
        //return '';
    }
    

    
    var template = function(str) {
        
        var tree = csswrangler.parse(str);
        
        return function (data) { return applyTemplate(tree, data);};
    };
    
    
    function defaults(obj, defs) {
        for (var prop in defs) {
            if (obj[prop] == null) {
                obj[prop] = defs[prop];
            }
        }
        return obj;
    }
    
    function renderTemplate(templateFile, jsonData, defaultsFile) {
        var defaultsJson;
        
        if (typeof defaultsFile !== 'undefined') {
            defaultsJson = JSON.parse(fs.readFileSync(defaultsFile, 'utf8'));
            defaults(jsonData, defaultsJson);
        }        
        
        return template(fs.readFileSync(templateFile, 'utf8'))(jsonData);
    }
    
    function readInput(callback) {
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        
        var stdin = '';
        process.stdin.on('data', function (chunk) {
          stdin += chunk;
        });
        process.stdin.on('end', function () {
          callback(JSON.parse(stdin));
        });
    }
        
    function handleArgs() {
        var scriptName = require('path').basename(process.argv[1]);
        var usage = 'Usage:\n' +
            '\t' + scriptName + ' template-file [defaults-json-file] < json-file\n\n' +
            'Render a CSS template with JSON data to stdout.\n' +
            'Missing values are provided by defaults-json-file if specified.\n' +
            'Tag syntax is /*{TAG}*/, placed after each property: value, just before the semicolon.\n';
        
        try {
            if ((process.argv.length < 3) || (process.argv.length > 4)) {
                throw new Error('Wrong number of args');
            }
            if ((process.argv.length === 3) && (process.argv[2] == '--help')) {
                throw new Error('Usage');
            }
            
            readInput(function (jsonData) {
                var results = renderTemplate(process.argv[2], jsonData, process.argv[3]);
                process.stdout.write(results);
                process.stdout.end();
            }); 
        }
        catch (err) {
            console.error(err + '\n');
            console.error(usage);
            process.exit(1);
        }
    }
    
    exports.defaults = defaults;
    exports.template = template;
    exports.renderTemplate = renderTemplate;
    
    if (require.main === module) {
        handleArgs();
    }
})();
