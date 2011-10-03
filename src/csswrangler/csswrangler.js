
(function () {
    var cssparser = require('./css.js');
    var treewrangler = require('./treewrangler.js');
    
        
    function CssNode (data, parents) {
        this.base = treewrangler.Node;
        this.base(data, parents);
        
        this.newNode = function (node, parents) {
            if (typeof node === 'undefined') {
                throw new Error('constructing node with undefined node data');
            }
            if ((typeof parents === 'undefined') || !Array.isArray(parents)) {
                throw new Error('constructing node with bogus parents ' + parents);
            }

            return new CssNode(node, parents);
        };

        this.prependSelector = function (rawNodeData) {
            this.findAll('whole_selector').forEach(function (whole_selector) {
                whole_selector.findFirst('selector').prependElement(' ').prependElement(rawNodeData);
            });
            return this;
        };
        
        this.insertAfterSelectors = function(selectors, newSel) {
            if (this._node.type !== 'whole_selector') {
                throw new Error('can only do insertAfterSelectors on a whole_selector');
            };
            if (!(newSel instanceof CssNode)) {
                throw new Error('not an instance of CssNode');
            }
            
            var sels = this.findAll('simple_selector');
            var idx, val;
            for (idx = 0; idx < sels.length; ++idx) {
                val = sels[idx].print().trim();
                //console.log(sels[idx].printTree());
                if (selectors.indexOf(val) === -1) {
                    break;
                }
            }
            
            var dest;
            if (idx < sels.length) {
                dest = sels[idx];
                dest.replaceWith({
                    type: 'selector',
                    elements: [newSel._node, ' ', dest._node]
                });
            }
            else {
                dest = this.findFirst('selector');
                dest.appendElement(newSel._node);
                dest.appendElement(' ');
            }
            
            return this;
        };
        
        this.prependScope = function (scope) {
            var treeNode = this;
            scope.split(' ').reverse().forEach(function (scopeElement) {
                if (scopeElement[0] === '.') {
                    treeNode.prependClassSelector (scopeElement.slice(1));
                }
                else if (scopeElement[0] === '#') {
                    treeNode.prependIdSelector (scopeElement.slice(1));
                }
                else {
                    treeNode.prependElementSelector (scopeElement);
                }
            });
            return treeNode;
        };
    }
    CssNode.prototype = new treewrangler.Node;
    
    
    function ClassSelector (class) {
        this.base = CssNode;
        var data = {
            type: 'simple_selector',
            elements: [{
                type: 'class_selector',
                elements: ['.', {
                    type: 'ident',
                    elements: [class]
                }]
            }]
        };
        this.base(data, []);
    }
    ClassSelector.prototype = new CssNode;
    
    function IdSelector (id) {
        this.base = CssNode;
        var data = {
            type: 'simple_selector',
            elements: [{
                type: 'ID selector',
                elements: ['#' + id]
            }]
        };
        this.base(data, []);
    }
    IdSelector.prototype = new CssNode;

    function ElementSelector (el) {
        this.base = CssNode;
        var data = {
            type: 'simple_selector',
            elements: [{
                type: 'element_selector',
                elements: [el]
            }]
        };
        this.base(data, []);
    }
    ElementSelector.prototype = new CssNode;
    
    function Selector (selector) {
        var type;
        if (selector[0] === '.') {
            selector = selector.slice(1);
            type = ClassSelector;
        }
        else if (selector[0] === '#') {
            selector = selector.slice(1);
            type = IdSelector;
        }
        else {
            type = ElementSelector;
        }
        
        this.base = type;
        this.base(selector);
    }
    Selector.prototype = new CssNode;
    
    
    function parse(str) {
        var rawNode;
        try {
            rawNode = cssparser.parse(str);
        }
        catch (e) {
            console.error(e.message);
            console.error('Line ' + e.line + ', Column ' + e.column);
            throw e;
        }
        return new CssNode(rawNode, []);
    }

    exports.Selector = Selector;
    exports.parse = parse;
})();
