#!/usr/bin/env node

(function () {
    var querystring = require('querystring');

    var defaultData = {
        "download": "true",
        "files[]": [
            "ui.core.js",
            "ui.widget.js",
            "ui.mouse.js",
            "ui.position.js",
            "ui.draggable.js",
            "ui.droppable.js",
            "ui.resizable.js",
            "ui.selectable.js",
            "ui.sortable.js",
            "ui.accordion.js",
            "ui.autocomplete.js",
            "ui.button.js",
            "ui.dialog.js",
            "ui.slider.js",
            "ui.tabs.js",
            "ui.datepicker.js",
            "ui.progressbar.js",
            "effects.core.js",
            "effects.blind.js",
            "effects.bounce.js",
            "effects.clip.js",
            "effects.drop.js",
            "effects.explode.js",
            "effects.fold.js",
            "effects.highlight.js",
            "effects.pulsate.js",
            "effects.scale.js",
            "effects.shake.js",
            "effects.slide.js",
            "effects.transfer.js"
        ],
        "scope": "",
        "ui-version": "1.8.2"
    };
    
    function looksLikeColor(val) {
        return (val.length === 7) && (/^#[a-fA-F0-9]+$/.test(val));
    }
    
    function getThemeQS (themeName, obj) {
        var key, data = {};
        for (key in defaultData) {
            if (defaultData.hasOwnProperty(key)) {
                data[key] = defaultData[key];
            }
        }
        data['t-name'] = themeName;
        
        for (key in obj) {
            if (looksLikeColor(obj[key])) {
                // remove leading '#'
                obj[key] = obj[key].slice(1);
            }
        }
        
        data['theme'] = '?' + querystring.stringify(obj);
        
        return querystring.stringify(data);
    }

    var scriptName = require('path').basename(process.argv[1]);
    var usage = 'Usage:\n' +
        '\t' + scriptName + ' themeName json-file\n' +
        '\t' + scriptName + ' themeName < json-file\n\n' +
        'Print corresponding ThemeRoller querystring for theme JSON to stdout.\n' +
        'Querystrings will look like "download=true&files%5B%5D=ui.core.js&...&theme=%3FffDefault%3DTrebuchet..."\n';
    
    function getInput(callback) {
        var args = process.argv.slice(2);
        if ((args.length < 1) || (args.length > 2) || (args.some(function (a) {return  a=== '--help';}))) {
            callback(new Error('Usage'));
        }
        var themeName = args[0];

        if (args.length > 1) {
            var fs = require('fs');
            callback(undefined, themeName, fs.readFileSync(args[1], 'utf8'));
        }
        else {
            process.stdin.setEncoding('utf8');
            
            var stdin = '';
            process.stdin.on('data', function (chunk) {
                stdin += chunk;
            });
            process.stdin.on('end', function () {
                callback(undefined, themeName, stdin);
            });
            
            process.stdin.resume();
        }
    }
    
    exports.getThemeQS = getThemeQS;
    
    if (require.main === module) {
        getInput(function (err, themeName, data) {
            var qs;
            if (err) {
                console.error(err.toString() + '\n');
                console.error(usage);
                process.exit(1);
            }
            else {
                try {
                    qs = getThemeQS(themeName, JSON.parse(data));
                } catch (e) {
                    err = e;
                }
            }
            
            if (err) {
                console.error(usage);
                throw err;
            }
            
            process.stdout.write(qs);
            process.stdout.end();
        });
    }
})();
