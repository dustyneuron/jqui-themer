
(function () {
        
    function findParentIdx(parents, type) {
        var i, p;
        for (i = parents.length -1; i >= 0; --i) {
            p = parents[i];
            if (!Array.isArray(p) && (p.type === type)) {
                return i;
            }
        }
        return -1;
    }
        
    function walkTree(tree, parents, actions) {
        var newParents;
        if (typeof parents === 'undefined') {
            newParents = [];
        }
        else {
            newParents = parents.slice(0);
        }
        
        if (typeof tree === 'object') {
            
            if (Array.isArray(tree)) {
                newParents.push(tree);
                tree.forEach(function (e) {walkTree(e, newParents, actions);});
                return;
            }
            
            if (tree.hasOwnProperty('type')) {
                if (actions.hasOwnProperty('types') && actions.types.hasOwnProperty(tree.type)) {
                    if (actions.types[tree.type](tree, newParents) !== true) {
                        return;
                    }
                }
            }
            
            if (tree.hasOwnProperty('elements')) {
                newParents.push(tree);
                walkTree(tree.elements, newParents, actions);
                return;
            }
            throw new Error('missing .elements on type ' + tree.type + ', tree=' + JSON.stringify(tree));
        }
        
        if (actions.hasOwnProperty('node')) {
            actions.node(tree, newParents);
        }
    }
    
    function findAll(tree, parents, type) {
        var results = [];
        var actions = {};
        actions.types = {};
        actions.types[type] = function (n, p) {
            results.push({node:n, parents:p});
        };
        
        walkTree(tree, parents, actions);
        
        return results;
    }
    
    function print(tree, opts) {
        var str = '';
        walkTree(tree, [], {
            node: function (n) {
                if (typeof n === 'object') {
                    throw new Error('walkTree/print got given object, type=' + n.type);
                }
                str += n.toString();
            }
        });
        return str;
    }
    
    function Node(node, parents) {
        
        if ((typeof node === 'undefined') && (typeof parents === 'undefined')) {
        }
        else {
            this._node = node;
            this._parents = parents.slice(0);
        }
    
        var nodeMethods = {
            newNode: function (data, parents) {
                if (typeof node === 'undefined') {
                    throw new Error('constructing node with undefined node data');
                }
                if ((typeof parents === 'undefined') || !Array.isArray(parents)) {
                    throw new Error('constructing node with bogus parents ' + parents);
                }

                return new Node(data, parents);            
            },
            
            findParent: function (type) {
                if (this._parents.length === 0) {
                    return undefined;
                }
                
                if (typeof type === 'undefined') {
                    var parent = this._parents[this._parents.length - 1];
                    return this.newNode(parent, this._parents.slice(0, this._parents.length - 2));
                }
                else
                {
                    var idx = findParentIdx(this._parents, type);
                    if (idx === -1) {
                        throw new Error('no parents found of type ' + type);
                    }
                    return this.newNode(this._parents[idx], this._parents.slice(0, idx));
                }
            },

            print: function () {
                return print(this._node);
            },
            
            printTree: function () {
                return JSON.stringify(this._node, null, 2);
            },
            
            printInfo: function () {
                var node = this._node;
                if (Array.isArray(node)) {
                    return 'Array length ' + node.length;
                }
                return node.type;
            },
            
            printParentsInfo: function () {
                
                var results = [];
                var parent = this.findParent();
                
                while (parent) {
                    results.push(parent.printInfo());
                    parent = parent.findParent();
                }
                
                return 'parents: [' + results.join(', ') + ']';
            },
            
            findAll: function (type) {
                var treeNode = this;
                var results = findAll(treeNode._node, treeNode._parents, type);
                return results.map(function (r) { return treeNode.newNode(r.node, r.parents);});
            },
                        
            findRoot: function () {
                var node = this;
                var parent = node.findParent();
                
                while (parent) {
                    node = parent;
                    parent = parent.findParent();
                }
                return node;
            },
            
            walk: function (actions) {
                var treeNode = this;
                var t, rawActions = {};
                
                if (actions.hasOwnProperty('node')) {
                    rawActions.node = function (n, p) {
                        return actions.node(treeNode.newNode(n, p));
                    };
                }
                if (actions.hasOwnProperty('types')) {
                    rawActions.types = {};
                    
                    function createAction(type) {
                        return function (n, p) {
                            return actions.types[type](treeNode.newNode(n, p));
                        };
                    }
                    
                    for (t in actions.types) {
                        rawActions.types[t] = createAction(t);
                    }
                }
                
                walkTree(treeNode._node, treeNode._parents, rawActions);
            },
            
            replaceWith: function (newNodeData) {
                var treeNode = this;
                var parentData = treeNode.findParent()._node;
                                
                var idx = parentData.indexOf(treeNode._node);
                if (idx === -1) {
                    throw new Error('could not find parent for node "' + treeNode.print() + '", ' + treeNode.printParentsInfo());
                }
                
                var newNode = treeNode.newNode(newNodeData, treeNode._parents);            
                parentData[idx] = newNodeData;
                treeNode._parents = [];
                
                return newNode; 
            },
            
            remove: function () {
                var treeNode = this;
                var parentData = treeNode.findParent()._node;
                                
                var idx = parentData.indexOf(treeNode._node);
                if (idx === -1) {
                    throw new Error('could not find parent for node "' + treeNode.print() + '", ' + treeNode.printParentsInfo());
                }
                
                parentData[idx] = [];
                treeNode._parents = [];
                
                return undefined; 
            },
            
            findUntil: function(type, until) {  
                var treeNode = this;
                //console.log('findPrevious(' + type + '), until: ' + until.printTree());
                
                var stop = false;
                var actions = {};
                actions.types = {};
                
                actions.types[until._node.type] = function (n) {
                    if (n._node === until._node) {
                        stop = true;
                        //console.log('stopped, met until node ' + n.printTree());
                        return false;
                    }
                    return true;
                };
                
                var goal = null;
                actions.types[type] = function (n) {
                    if (n._node === until._node) {
                        stop = true;
                        //console.log('stopped, met until node ' + n.printTree());
                        return false;
                    }
                        
                    if (!stop) {
                        goal = n;
                        //console.log('found possible goal ' + n.printTree());
                    }
                    return true;
                };
                
                treeNode.walk(actions);

                if (goal) {
                    return goal;
                }            
                return undefined;
            },
            
            findFirst: function (type) {
                var actions = {};
                actions.types = {};
                            
                var goal = null;
                actions.types[type] = function (n) {
                    if (!goal) {
                        goal = n;
                        return false;
                    }
                    return true;
                };
                
                this.walk(actions);

                if (goal) {
                    return goal;
                }            
                return undefined;
            },
            
            findPrevious: function (type) {
                // TODO: this is insanely slow, and could easily be much much faster
                // should scan backwards rather than forwards!
                
                var root = this.findRoot();
                
                return root.findUntil(type, this);
            },
            
            prependElement: function (rawNodeData) {
                if ((typeof this._node !== 'object') || (!this._node.hasOwnProperty('elements'))) {
                    throw new Error('prependElement can currently only be used on object elements');
                }
                
                this._node.elements.splice(0, 0, rawNodeData);
                
                return this;
            },
            
            appendElement: function (rawNodeData) {
                if ((typeof this._node !== 'object') || (!this._node.hasOwnProperty('elements'))) {
                    throw new Error('appendElement can currently only be used on object elements');
                }
                
                this._node.elements.push(rawNodeData);
                
                return this;
            }
        };
        
        var k;
        for (k in nodeMethods) {
            this[k] = nodeMethods[k];
        }
    }
    
    exports.Node = Node;
    
})();
