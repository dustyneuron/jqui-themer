#!/usr/bin/env node

(function () {
    var fs = require('fs');
    
    /////////////////////////////////////////////////////
    //     Code borrowed from Underscore.js 1.1.7
    //     (c) 2011 Jeremy Ashkenas, DocumentCloud Inc.
    //     Underscore is freely distributable under the MIT license.
    //     Portions of Underscore are inspired or borrowed from Prototype,
    //     Oliver Steele's Functional, and John Resig's Micro-Templating.
    //     For all details and documentation:
    //     http://documentcloud.github.com/underscore
    var templateSettings = {
        evaluate    : /<%([\s\S]+?)%>/g,
        interpolate : /<%=([\s\S]+?)%>/g
    };
    var template = function(str, data) {
        var c  = templateSettings;
        var tmpl = 'var __p=[],print=function(){__p.push.apply(__p,arguments);};' +
        'with(obj||{}){__p.push(\'' +
        str.replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(c.interpolate, function(match, code) {
                return "'," + code.replace(/\\'/g, "'") + ",'";
            })
            .replace(c.evaluate || null, function(match, code) {
                return "');" + code.replace(/\\'/g, "'")
                    .replace(/[\r\n\t]/g, ' ') + "__p.push('";
            })
            .replace(/\r/g, '\\r')
            .replace(/\n/g, '\\n')
            .replace(/\t/g, '\\t')
            + "');}return __p.join('');";
        var func = new Function('obj', tmpl);
        return data ? func(data) : func;
    };
    /////////////////////////////////////////////////////
    
    function defaults(obj, defs) {
        for (var prop in defs) {
            if (obj[prop] == null) {
                obj[prop] = defs[prop];
            }
        }
        return obj;
    }
    
    function renderFile(templateFile, jsonData, defaultsFile) {
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
            'Render a template with JSON data to stdout.\n' +
            'Missing values are provided by defaults-json-file if specified.\n' +
            'Templating syntax:\n';
        var key;
        for (key in templateSettings) {
            usage += '\t' + key + ': ' + templateSettings[key].toString() + '\n';
        }
        
        
        try {
            if ((process.argv.length < 3) || (process.argv.length > 4)) {
                throw new Error('Wrong number of args');
            }
            if ((process.argv.length === 3) && (process.argv[2] == '--help')) {
                throw new Error('Usage');
            }
            
            readInput(function (jsonData) {
                var results = renderFile(process.argv[2], jsonData, process.argv[3]);
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
    exports.renderFile = renderFile;
    
    if (require.main === module) {
        handleArgs();
    }
})();
