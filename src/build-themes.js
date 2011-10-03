#!/usr/bin/env node

(function () {
    var fs = require('fs');
    var util = require('util');
    
    var srcDir = __dirname + '/';
    var defaultsFile = srcDir + '../data/defaults.json';
    var imagesDir = srcDir + '../data/images/';
    var versionsDir = srcDir + '../data/jquery-ui/';
    
    var outputDir = srcDir + '../output/';

    var csswrangler = require(srcDir + 'csswrangler/csswrangler.js');
    var qsToJSON = require(srcDir + 'qs-to-json.js').qsToJSON;
    var renderTemplate = require(srcDir + 'css-template.js').renderTemplate;
    
    function looksLikeColor(val) {
        return (val.length === 6) && (/^[a-fA-F0-9]+$/.test(val));
    }
    
    function createFinalCss(baseThemesDir, themeCss, parsedArgs) {
        
        var exclude = ['jquery.ui.core.css', 'jquery.ui.theme.css', 'images', 'jquery.ui.all.css', 'jquery.ui.base.css'];
        
        var files = ['jquery.ui.core.css', 'jquery.ui.theme.css'];
        var allFiles = fs.readdirSync(baseThemesDir);
        var k;
        for (k in allFiles) {
            if ((files.indexOf(allFiles[k]) === -1) && (exclude.indexOf(allFiles[k]) === -1)) {
                files.push(allFiles[k]);
            }
        }
        
        var fileOutputs = [];
        for (k in files) {
            if (files[k] === 'jquery.ui.theme.css') {
                fileOutputs.push(themeCss);
            }
            else {
                fileOutputs.push(fs.readFileSync(baseThemesDir + files[k], 'utf8'));
            }
        }
        var output = fileOutputs.join('\n\n');
        
        fs.writeFileSync('/tmp/output', output);
        
        if (parsedArgs.hasOwnProperty('scope')) {
            var tree = csswrangler.parse(output);
            
            var selector = new csswrangler.Selector(parsedArgs.scope);
            
            tree.findAll('whole_selector').forEach(function (whole_selector) {
                whole_selector.insertAfterSelectors(['*', 'html', 'body'], selector);
            });
            
            output = tree.print();
        }
        
        return output.replace(/@VERSION/g, parsedArgs.version);
    }
    
    function createImg(filename, images) {
        images[filename] = true;
        return 'url(images/' + filename + ')';
    }
    
    function createBgImage(texture, opacity, col, images) {
        var texName = /^[0-9]+_([^\.]+)\.png$/.exec(texture)[1].replace('_', '-');
        var width, height;
        
        if (texName === 'diagonal-maze') {
            width = 10;
            height = 10;
        }
        else if ((texName === 'diagonals-small') || (texName === 'diagonals-medium') || (texName === 'diagonals-thick')) {
            width = 40;
            height = 40;
        }
        else if (texName === 'diamond') {
            width = 10;
            height = 8;
        }
        else if (texName === 'dots-medium') {
            width = 4;
            height = 4;
        }
        else if (texName === 'dots-small') {
            width = 2;
            height = 2;
        }
        else if (texName === 'fine-grain') {
            width = 60;
            height = 60;
        }
        else if (texName === 'flat') {
            width = 40;
            height = 100;
        }
        else if (texName === 'glass') {
            width = 1;
            height = 400;
        }
        else if (texName === 'gloss-wave') {
            width = 500;
            height = 100;
        }
        else if ((texName === 'highlight-hard') || (texName === 'highlight-soft') || (texName === 'inset-hard') || (texName === 'inset-soft')) {
            width = 1;
            height = 100;
        }
        else if (texName === 'loop') {
            width = 21;
            height = 21;
        }
        else if (texName === 'white-lines') {
            width = 40;
            height = 100;
        }
        else {
            throw new Error('uncatered-for bg image texName ' + texName);
        }
        
        return createImg('ui-bg_' + texName + '_' + opacity + '_' + col.toLowerCase() + '_' + width + 'x' + height + '.png', images);
    }
    
    function createIconImage(col, images) {
        
        return createImg('ui-icons_' + col.toLowerCase() + '_256x240.png', images);
    }

    
    function prepareTemplateData(themeVars) {
        var newData = {};
        var images = {};
        
        var k, v;
        for (k in themeVars) {
            v = themeVars[k];
            
            var iconColorMatch = /^iconColor(.*)$/.exec(k);
            
            if (themeVars.hasOwnProperty(k + 'Unit')) {
                newData[k] = v + themeVars[k + 'Unit'];
            }
            else if (iconColorMatch) {
                var new_k = 'icons' + iconColorMatch[1];
                newData[new_k] = createIconImage(v, images);
            }
            else if (k.indexOf('Texture') !== -1) {
                var opacity = themeVars[k.replace('Texture', 'ImgOpacity')];
                var col = themeVars[k.replace('Texture', 'Color')];
                newData[k.replace('Texture', 'ImgUrl')] = createBgImage(v, opacity, col, images);
            }
            else if (themeVars.hasOwnProperty(k + 'Unit')) {
                newData[k] = v + themeVars[k + 'Unit'];
            }
            else if (k.indexOf('Texture') !== -1) {
                
            }
            else if (looksLikeColor(v)) {
                newData[k] = '#' + v;
            }
            else {
                newData[k] = v;
            }
        }
                
        return { data: newData, images: images};
    }
    
    function copyImages(oldDir, newDir, imagesDict) {
        var k, data;
        for (k in imagesDict) {
            data = fs.readFileSync(oldDir + k);
            fs.writeFileSync(newDir + k, data);

            console.log(newDir + k);
        }
    }

    function buildTheme(qs, parsedArgs, jquiDir) {
        var results = qsToJSON(qs);
        var themeName = results.themeName;
        
        try {
            fs.mkdirSync(outputDir + themeName, 0755);
        } catch (e) {
        }

        //fs.writeFileSync(outputDir + themeName + '/data.json', results.json, 'utf8');
        //console.log(outputDir + themeName + '/data.json');
        
        var templateData = prepareTemplateData(results.obj);
        
        var baseThemesDir = jquiDir + 'themes/base/';
        var templateFile = baseThemesDir + 'jquery.ui.theme.css';
        
        try {
            fs.mkdirSync(outputDir + themeName + '/images', 0755);
        } catch (e) {
        }
        copyImages(imagesDir, outputDir + themeName + '/images/', templateData.images);
        
        var themeCss = renderTemplate(templateFile, templateData.data, defaultsFile);
        themeCss = themeCss.replace('http://jqueryui.com/themeroller/', 'http://jqueryui.com/themeroller/?' + qs);
        
        var finalCss = createFinalCss(baseThemesDir, themeCss, parsedArgs);
        
        fs.writeFileSync(outputDir + themeName + '/jquery-ui-' + parsedArgs.version + '.custom.css', finalCss, 'utf8');
        console.log(outputDir + themeName + '/jquery-ui-' + parsedArgs.version + '.custom.css');
    }

    function buildDefaultThemes(parsedArgs) {
    
        try {
            fs.mkdirSync(outputDir, 0755);
        } catch (e) {
        }
        
        var jquiDir = versionsDir + parsedArgs.version + '/';
        fs.readdirSync(jquiDir);

        var qstrings = fs.readFileSync(jquiDir + '/build/themes', 'utf8').split(',');
        qstrings.forEach(function (qs) {buildTheme(qs, parsedArgs, jquiDir);});
    }
    
    
        
    var scriptName = require('path').basename(process.argv[1]);
    var usage = 'Usage:\n' +
        '\t' + scriptName + ' [--version version] [--scope css-scope]\n';
                
    function parseArgs(callback) {
        var args = process.argv.slice(2);
        var parsedArgs = {
            version: "1.8.16"
        };
        
        var scopeIdx = args.indexOf('--scope');
        if (scopeIdx !== -1) {
            parsedArgs.scope = args[scopeIdx + 1];
            args.splice(scopeIdx, 2);
        }
        
        var versionIdx = args.indexOf('--version');
        if (versionIdx !== -1) {
            parsedArgs.version = args[versionIdx + 1];
            args.splice(versionIdx, 2);
        }
        
        
        if (args.some(function (a) {return a === '--help';})) {
            callback(new Error('Usage'));
        }
        
        callback(undefined, parsedArgs);
    }
    
    if (require.main === module) {
        parseArgs(function (err, parsedArgs) {
            if (err) {
                console.error(err.toString() + '\n');
                console.error(usage);
                throw err;
                //process.exit(1);
            }
            
            if (!err) {
                //try {
                    buildDefaultThemes(parsedArgs);
                /*} catch (e) {
                    err = e;
                }*/
            }
            
        });
    }
})();
