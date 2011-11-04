# csswrangler

A css manipulation library for node.js

Based on the CSS parser included with [PEG.js](https://github.com/dmajda/pegjs)

Beware - very rough at the mo, needs work!

## Usage:

    var csswrangler = require('/wherever/csswrangler/csswrangler.js');
    var css = [
        '/* blah */',
        'p {',
        '  text-align: center;',
        '  color: blue;',
        '  /* blah */',
        '}',
        '/* blah */',
        'body h1 {',
        '  color: red;',
        '  font-weight: bold;',
        '}',
       ].join('\n');

    var tree = csswrangler.parse(css);
    
    var assert = require('assert');
    assert.ok(tree.print() === css);

### E.g. adding scoping:

    var selector = new csswrangler.Selector('.my-class');
    tree.findAll('whole_selector').forEach(function (whole_selector) {
        whole_selector.insertAfterSelectors(['*', 'html', 'body'], selector);
    });

### E.g. stripping comments:

    tree.findAll('comment').forEach(function (n) { n.remove();});
    
### E.g. changing properties:

    var black = new csswrangler.Color('#000');
    tree.forEachDeclaration('color', function (property, value) {
            value.replaceWithNode(black);
        }).
        forEachDeclaration('font-weight', function (property, value) {
            property.replaceWith('font-size');
            value.replaceWith('large');
        });
