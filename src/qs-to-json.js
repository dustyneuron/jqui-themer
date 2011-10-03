#!/usr/bin/env node

(function () {
    var fs = require('fs');
    var querystring = require('querystring');
    
    function qsToJSON(qs) {
        
        var params = querystring.parse(qs.trim());
        var themeName, themeVars;
        
        if (!params.hasOwnProperty('t-name')) {
            throw new Error('Could not find param "t-name" in querystring');
        }
        if (!params.hasOwnProperty('theme')) {
            throw new Error('Could not find param "theme" in querystring');
        }
        
        themeName = params['t-name'];
        themeVars = querystring.parse(params['theme'].slice(1));
        
        return {"themeName": themeName, "obj": themeVars, "json": JSON.stringify(themeVars, null, 4)};
    }
            
    var scriptName = require('path').basename(process.argv[1]);
    var usage = 'Usage:\n' +
        '\t' + scriptName + ' [--t-name] querystring\n' +
        '\t' + scriptName + ' [--t-name] < querystring-file\n\n' +
        'Print corresponding JSON for a ThemeRoller querystring to stdout.\n' +
        '--t-name option just outputs the theme name, no JSON.\n' +
        'Querystrings look like "download=true&files%5B%5D=ui.core.js&...&theme=%3FffDefault%3DTrebuchet..."\n';
        
    function getInput(callback) {
        var args = process.argv.slice(2);
        var getThemeName = false;
        if (args.some(function (a) {return a === '--t-name';})) {
            getThemeName = true;
            args = args.filter(function (a) {return a !== '--t-name';});
        }
        
        if (args.length > 0) {
            if ((args.length > 1) || (args.some(function (a) {return a === '--help';}))) {
                callback(new Error('Usage'));
            }
            else {
                callback(undefined, args[0], getThemeName);
            }
        } else {
            process.stdin.resume();
            process.stdin.setEncoding('utf8');
            
            var stdin = '';
            process.stdin.on('data', function (chunk) {
              stdin += chunk;
            });
            process.stdin.on('end', function () {
              callback(undefined, stdin, getThemeName);
            });
        }
    }
    
    if (require.main === module) {
        getInput(function (err, qs, getThemeName) {
            var results, output;
            if (!err) {
                try {
                    results = qsToJSON(qs);
                } catch (e) {
                    err = e;
                }
            }
            
            if (err) {
                console.error(err.toString() + '\n');
                console.error(usage);
                process.exit(1);
            }
            
            if (getThemeName) {
                output = results.themeName;
            } else {
                output = results.json;
            }
            
            process.stdout.write(output);
            process.stdout.end();
        });
    }
    
    exports.qsToJSON = qsToJSON;
})();
