/*!
 * vdom-engine.js v0.1.2
 * (c) 2016 Jade Gu
 * Released under the MIT License.
 */
'use strict';

var directives = {};
var DIRECTIVE_SPEC = /^([^-]+)-(.+)$/;

function addDirective(name, methods) {
    directives[name] = methods;
}

function removeDirective(name) {
    delete directives[name];
}

var currentName = null;
function matchDirective(propKey) {
    var matches = propKey.match(DIRECTIVE_SPEC);
    if (matches) {
        currentName = matches[2];
        return directives[matches[1]];
    }
}

function attachProp(elem, propKey, propValue) {
    var directive = matchDirective(propKey);
    if (directive) {
        directive.attach(elem, currentName, propValue);
    }
}

function detachProp(elem, propKey) {
    var directive = matchDirective(propKey);
    if (directive) {
        directive.detach(elem, currentName);
    }
}

function attachProps(elem, props) {
    for (var propKey in props) {
        if (props[propKey] != null) {
            attachProp(elem, propKey, props[propKey]);
        }
    }
}

function patchProps(elem, props, newProps) {
    var keyMap = {};
    var directive = null;
    for (var propKey in props) {
        keyMap[propKey] = true;
        patchProp(elem, propKey, newProps[propKey], props[propKey]);
    }
    for (var propKey in newProps) {
        if (keyMap[propKey] !== true) {
            patchProp(elem, propKey, newProps[propKey], props[propKey]);
        }
    }
}

function patchProp(elem, propKey, propValue, oldPropValue) {
    if (propValue == oldPropValue) {
        return;
    }
    if (propValue == null) {
        detachProp(elem, propKey);
    } else {
        attachProp(elem, propKey, propValue);
    }
}

var DOMPropDirective = {
	attach: attachDOMProp,
	detach: detachDOMProp
};

var DOMAttrDirective = {
	attach: attachDOMAttr,
	detach: detachDOMAttr
};

function attachDOMProp(elem, propName, propValue) {
	elem[propName] = propValue;
}

function detachDOMProp(elem, propName) {
	elem[propName] = '';
}

function attachDOMAttr(elem, attrName, attrValue) {
	elem.setAttribute(attrName, attrValue + '');
}

function detachDOMAttr(elem, attrName) {
	elem.removeAttribute(attrName);
}

var notBubbleEvents = {
	onmouseleave: 1,
	onmouseenter: 1,
	onload: 1,
	onunload: 1,
	onscroll: 1,
	onfocus: 1,
	onblur: 1,
	onrowexit: 1,
	onbeforeunload: 1,
	onstop: 1,
	ondragdrop: 1,
	ondragenter: 1,
	ondragexit: 1,
	ondraggesture: 1,
	ondragover: 1,
	oncontextmenu: 1
};

var EVENT_RE = /^on-.+/i;

var eventDirective = {
	attach: attachEvent,
	detach: detachEvent
};

// Mobile Safari does not fire properly bubble click events on
// non-interactive elements, which means delegated click listeners do not
// fire. The workaround for this bug involves attaching an empty click
// listener on the target node.
var inMobile = ('ontouchstart' in document);
var emptyFunction = function emptyFunction() {};
var ON_CLICK_KEY = 'onclick';

function getEventName(key) {
	return key.replace(/^on-/, 'on').toLowerCase();
}

var eventTypes = {};
function attachEvent(elem, eventType, listener) {
	eventType = 'on' + eventType;

	if (notBubbleEvents[eventType] === 1) {
		elem[eventType] = listener;
		return;
	}

	var eventStore = elem.eventStore || (elem.eventStore = {});
	eventStore[eventType] = listener;

	if (!eventTypes[eventType]) {
		// onclick -> click
		document.addEventListener(eventType.substr(2), dispatchEvent, false);
		eventTypes[eventType] = true;
	}

	if (inMobile && eventType === ON_CLICK_KEY) {
		elem.addEventListener('click', emptyFunction, false);
	}

	var nodeName = elem.nodeName;

	if (eventType === 'onchange' && (nodeName === 'INPUT' || nodeName === 'TEXTAREA')) {
		attachEvent(elem, 'oninput', listener);
	}
}

function detachEvent(elem, eventType) {
	eventType = 'on' + eventType;
	if (notBubbleEvents[eventType] === 1) {
		elem[eventType] = null;
		return;
	}

	var eventStore = elem.eventStore || (elem.eventStore = {});
	delete eventStore[eventType];

	if (inMobile && eventType === ON_CLICK_KEY) {
		elem.removeEventListener('click', emptyFunction, false);
	}

	var nodeName = elem.nodeName;

	if (eventType === 'onchange' && (nodeName === 'INPUT' || nodeName === 'TEXTAREA')) {
		delete eventStore['oninput'];
	}
}

function dispatchEvent(event) {
	var target = event.target;
	var type = event.type;

	var eventType = 'on' + type;
	var syntheticEvent = null;
	while (target) {
		var _target = target;
		var eventStore = _target.eventStore;

		var listener = eventStore && eventStore[eventType];
		if (!listener) {
			target = target.parentNode;
			continue;
		}
		if (!syntheticEvent) {
			syntheticEvent = createSyntheticEvent(event);
		}
		syntheticEvent.currentTarget = target;
		listener.call(target, syntheticEvent);
		if (syntheticEvent.$cancalBubble) {
			break;
		}
		target = target.parentNode;
	}
}

function createSyntheticEvent(nativeEvent) {
	var syntheticEvent = {};
	var cancalBubble = function cancalBubble() {
		return syntheticEvent.$cancalBubble = true;
	};
	syntheticEvent.nativeEvent = nativeEvent;
	for (var key in nativeEvent) {
		if (typeof nativeEvent[key] !== 'function') {
			syntheticEvent[key] = nativeEvent[key];
		} else if (key === 'stopPropagation' || key === 'stopImmediatePropagation') {
			syntheticEvent[key] = cancalBubble;
		} else {
			syntheticEvent[key] = nativeEvent[key].bind(nativeEvent);
		}
	}
	return syntheticEvent;
}

var styleDirective = {
    attach: attachStyle,
    detach: detachStyle
};

function attachStyle(elem, styleName, styleValue) {
    setStyleValue(elem.style, styleName, styleValue);
}

function detachStyle(elem, styleName) {
    elem.style[styleName] = '';
}

/**
 * CSS properties which accept numbers but are not in units of "px".
 */
var isUnitlessNumber = {
    animationIterationCount: 1,
    borderImageOutset: 1,
    borderImageSlice: 1,
    borderImageWidth: 1,
    boxFlex: 1,
    boxFlexGroup: 1,
    boxOrdinalGroup: 1,
    columnCount: 1,
    flex: 1,
    flexGrow: 1,
    flexPositive: 1,
    flexShrink: 1,
    flexNegative: 1,
    flexOrder: 1,
    gridRow: 1,
    gridColumn: 1,
    fontWeight: 1,
    lineClamp: 1,
    lineHeight: 1,
    opacity: 1,
    order: 1,
    orphans: 1,
    tabSize: 1,
    widows: 1,
    zIndex: 1,
    zoom: 1,

    // SVG-related properties
    fillOpacity: 1,
    floodOpacity: 1,
    stopOpacity: 1,
    strokeDasharray: 1,
    strokeDashoffset: 1,
    strokeMiterlimit: 1,
    strokeOpacity: 1,
    strokeWidth: 1
};

function prefixKey(prefix, key) {
    return prefix + key.charAt(0).toUpperCase() + key.substring(1);
}

var prefixes = ['Webkit', 'ms', 'Moz', 'O'];

Object.keys(isUnitlessNumber).forEach(function (prop) {
    prefixes.forEach(function (prefix) {
        isUnitlessNumber[prefixKey(prefix, prop)] = 1;
    });
});

var RE_NUMBER = /^-?\d+(\.\d+)?$/;
function setStyleValue(elemStyle, styleName, styleValue) {

    if (!isUnitlessNumber[styleName] && RE_NUMBER.test(styleValue)) {
        elemStyle[styleName] = styleValue + 'px';
        return;
    }

    if (styleName === 'float') {
        styleName = 'cssFloat';
    }

    if (styleValue == null || typeof styleValue === 'boolean') {
        styleValue = '';
    }

    elemStyle[styleName] = styleValue;
}

var isArr = Array.isArray;

function identity(obj) {
    return obj;
}

function pipe(fn1, fn2) {
    return function () {
        fn1.apply(this, arguments);
        return fn2.apply(this, arguments);
    };
}

function flattenMerge(sourceList, targetList) {
    var len = sourceList.length;
    var i = -1;
    while (len--) {
        var item = sourceList[++i];
        if (isArr(item)) {
            flattenChildren(item, targetList);
        } else if (item != null && typeof item !== 'boolean') {
            targetList[targetList.length] = item;
        }
    }
}

function extend(to, from) {
    if (!from) {
        return to;
    }
    var keys = Object.keys(from);
    var i = keys.length;
    while (i--) {
        to[keys[i]] = from[keys[i]];
    }
    return to;
}

var uid = 0;

function getUid() {
    return ++uid;
}

if (!Object.freeze) {
    Object.freeze = identity;
}

var SVGNamespaceURI = 'http://www.w3.org/2000/svg';
var COMPONENT_ID = 'liteid';
var VELEMENT = 1;
var VCOMPONENT = 2;
var VCOMMENT = 3;

function createVcomment(comment) {
    return {
        vtype: VCOMMENT,
        comment: comment
    };
}

function initVnode(vnode, namespaceURI) {
    var vtype = vnode.vtype;

    var node = null;
    if (!vtype) {
        node = document.createTextNode('' + vnode);
    } else if (vtype === VELEMENT) {
        node = initVelem(vnode, namespaceURI);
    } else if (vtype === VCOMPONENT) {
        node = initVcomponent(vnode, namespaceURI);
    } else if (vtype === VCOMMENT) {
        node = document.createComment(vnode.comment);
    }
    return node;
}

function destroyVnode(vnode, node) {
    var vtype = vnode.vtype;

    if (vtype === VELEMENT) {
        destroyVelem(vnode, node);
    } else if (vtype === VCOMPONENT) {
        destroyVcomponent(vnode, node);
    }
}

function updateVnode(vnode, newVnode, node) {
    var newNode = node;
    var vtype = newVnode.vtype;
    if (!vtype) {
        // textNode
        newNode.newText = newVnode + '';
        pendingTextUpdater[pendingTextUpdater.length] = newNode;
    } else if (vtype === VELEMENT) {
        newNode = updateVelem(vnode, newVnode, newNode);
    } else if (vtype === VCOMPONENT) {
        newNode = updateVcomponent(vnode, newVnode, newNode);
    }
    return newNode;
}

function initVelem(velem, namespaceURI) {
    var type = velem.type;
    var props = velem.props;

    var node = null;

    if (type === 'svg' || namespaceURI === SVGNamespaceURI) {
        namespaceURI = SVGNamespaceURI;
        node = document.createElementNS(SVGNamespaceURI, type);
    } else {
        node = document.createElement(type);
    }

    initVchildren(node, props.children);
    attachProps(node, props);

    return node;
}

function initVchildren(node, vchildren) {
    var namespaceURI = node.namespaceURI;

    for (var i = 0, len = vchildren.length; i < len; i++) {
        var vchild = vchildren[i];
        var childNode = initVnode(vchildren[i], namespaceURI);
        childNode.vnode = vchild;
        node.appendChild(childNode);
    }
}

function updateVelem(velem, newVelem, node) {
    var props = velem.props;
    var type = velem.type;

    var newProps = newVelem.props;
    var oldHtml = props['prop-innerHTML'];
    var vchildren = props.children;
    var newVchildren = newProps.children;

    if (oldHtml == null && vchildren.length) {
        var patches = diffVchildren(node, vchildren, newVchildren);
        updateVchildren(node, newVchildren, patches);
        // collect pending props
        node.props = props;
        node.newProps = newProps;
        pendingPropsUpdater[pendingPropsUpdater.length] = node;
    } else {
        // should patch props first, make sure innerHTML was cleared
        patchProps(node, props, newProps);
        initVchildren(node, newVchildren);
    }

    return node;
}

function updateVchildren(node, newVchildren, patches) {
    var newVchildrenLen = newVchildren.length;
    var childNodes = node.childNodes;
    var namespaceURI = node.namespaceURI;

    for (var i = 0; i < newVchildrenLen; i++) {
        var newVnode = newVchildren[i];
        var patchNode = patches[i];
        var newChildNode = null;
        if (patchNode) {
            var vnode = patchNode.vnode;
            newChildNode = patchNode;
            patchNode.vnode = null;
            if (newVnode !== vnode) {
                newChildNode = updateVnode(vnode, newVnode, patchNode);
            }
            var currentNode = childNodes[i];
            if (currentNode !== newChildNode) {
                node.insertBefore(newChildNode, currentNode || null);
            }
        } else {
            newChildNode = initVnode(newVnode, namespaceURI);
            node.insertBefore(newChildNode, childNodes[i] || null);
        }
        newChildNode.vnode = newVnode;
    }
}

function diffVchildren(node, vchildren, newVchildren) {
    var childNodes = node.childNodes;

    var vchildrenLen = vchildren.length;
    var newVchildrenLen = newVchildren.length;

    // signal of whether vhild has been matched or not
    var matches = Array(vchildrenLen);
    var patches = Array(newVchildrenLen);
    checkEqual(vchildren, newVchildren, childNodes, patches, matches);
    checkSimilar(vchildren, newVchildren, childNodes, patches, matches);
    return patches;
}

function checkEqual(vchildren, newVchildren, childNodes, patches, matches) {
    var vchildrenLen = vchildren.length;
    var newVchildrenLen = newVchildren.length;
    // check equal
    for (var i = 0; i < vchildrenLen; i++) {
        var vnode = vchildren[i];
        for (var j = 0; j < newVchildrenLen; j++) {
            if (patches[j]) {
                continue;
            }
            var newVnode = newVchildren[j];
            if (vnode === newVnode) {
                patches[j] = childNodes[i];
                matches[i] = true;
                break;
            }
        }
    }
}

function checkSimilar(vchildren, newVchildren, childNodes, patches, matches) {
    var vchildrenLen = vchildren.length;
    var newVchildrenLen = newVchildren.length;
    var shouldRemove = null;

    // check similar
    for (var i = 0; i < vchildrenLen; i++) {
        if (matches[i]) {
            continue;
        }
        var childNode = childNodes[i];
        var vnode = vchildren[i];
        var type = vnode.type;
        var key = vnode.key;

        var isMatch = false;

        for (var j = 0; j < newVchildrenLen; j++) {
            if (patches[j]) {
                continue;
            }
            var newVnode = newVchildren[j];
            if (newVnode.type === type && newVnode.key === key) {
                patches[j] = childNode;
                isMatch = true;
                break;
            }
        }

        if (!isMatch) {
            if (!shouldRemove) {
                shouldRemove = [];
            }
            shouldRemove[shouldRemove.length] = childNode;
            destroyVnode(vnode, childNode);
        }
    }

    if (shouldRemove) {
        for (var i = 0, len = shouldRemove.length; i < len; i++) {
            var childNode = shouldRemove[i];
            childNode.parentNode.removeChild(childNode);
        }
    }
}

function destroyVelem(velem, node) {
    var props = velem.props;

    var vchildren = props.children;
    var childNodes = node.childNodes;

    for (var i = 0, len = vchildren.length; i < len; i++) {
        destroyVnode(vchildren[i], childNodes[i]);
    }

    node.eventStore = null;
    for (var key in props) {
        if (EVENT_RE.test(key)) {
            key = getEventName(key);
            if (notBubbleEvents[key] === true) {
                node[key] = null;
            }
        }
    }
}

function initVcomponent(vcomponent, namespaceURI) {
    var vnode = renderVcomponent(vcomponent);
    var node = initVnode(vnode, namespaceURI);
    node.cache = node.cache || {};
    node.cache[vcomponent.id] = vnode;
    return node;
}
function updateVcomponent(vcomponent, newVcomponent, node) {
    var id = vcomponent.id;
    var vnode = node.cache[id];
    delete node.cache[id];
    var newVnode = renderVcomponent(newVcomponent);
    var newNode = compareTwoVnodes(vnode, newVnode, node);
    newNode.cache = newNode.cache || {};
    newNode.cache[newVcomponent.id] = newVnode;
    if (newNode !== node) {
        extend(newNode.cache, node.cache);
    }
    return newNode;
}
function destroyVcomponent(vcomponent, node) {
    var id = vcomponent.id;
    var vnode = node.cache[id];
    delete node.cache[id];
    destroyVnode(vnode, node);
}

function renderVcomponent(vcomponent) {
    var factory = vcomponent.type;
    var props = vcomponent.props;

    var vnode = factory(props);
    if (vnode && vnode.render) {
        vnode = vnode.render();
    }
    if (vnode === null || vnode === false) {
        vnode = createVcomment('component placeholder: ' + getUid());
    } else if (!vnode || !vnode.vtype) {
        throw new Error('@' + factory.name + '#render:You may have returned undefined, an array or some other invalid object');
    }
    return vnode;
}

var pendingTextUpdater = [];
var clearPendingTextUpdater = function clearPendingTextUpdater() {
    var len = pendingTextUpdater.length;
    if (!len) {
        return;
    }
    var list = pendingTextUpdater;
    var i = -1;
    while (len--) {
        var node = list[++i];
        // node.nodeValue = node.newText
        node.replaceData(0, node.length, node.newText);
    }
    pendingTextUpdater.length = 0;
};

var pendingPropsUpdater = [];
var clearPendingPropsUpdater = function clearPendingPropsUpdater() {
    var len = pendingPropsUpdater.length;
    if (!len) {
        return;
    }
    var list = pendingPropsUpdater;
    var i = -1;
    while (len--) {
        var node = list[++i];
        patchProps(node, node.props, node.newProps);
        node.props = node.newProps = null;
    }
    pendingPropsUpdater.length = 0;
};

function compareTwoVnodes(vnode, newVnode, node) {
    var newNode = node;

    if (newVnode == null) {
        // remove
        destroyVnode(vnode, node);
        node.parentNode.removeChild(node);
    } else if (vnode.type !== newVnode.type || newVnode.key !== vnode.key) {
        // replace
        destroyVnode(vnode, node);
        newNode = initVnode(newVnode, node.namespaceURI);
        node.parentNode.replaceChild(newNode, node);
    } else if (vnode !== newVnode) {
        // same type and same key -> update
        var vtype = vnode.vtype;
        if (vtype === VELEMENT) {
            newNode = updateVelem(vnode, newVnode, node);
        } else if (vtype === VCOMPONENT) {
            newNode = updateVcomponent(vnode, newVnode, node);
        }
    }

    return newNode;
}

var pendingRendering = {};
var vnodeStore = {};

function render(vnode, container, callback) {
	if (!vnode.vtype) {
		throw new Error('cannot render ' + vnode + ' to container');
	}
	var id = container[COMPONENT_ID] || (container[COMPONENT_ID] = getUid());
	var argsCache = pendingRendering[id];

	// component lify cycle method maybe call root rendering
	// should bundle them and render by only one time
	if (argsCache) {
		if (argsCache === true) {
			pendingRendering[id] = {
				vnode: vnode,
				callback: callback
			};
		} else {
			argsCache.vnode = vnode;
			if (callback) {
				argsCache.callback = argsCache.callback ? pipe(argsCache.callback, callback) : callback;
			}
		}
		return;
	}

	pendingRendering[id] = true;
	var oldVnode = null;
	var rootNode = null;
	if (oldVnode = vnodeStore[id]) {
		rootNode = compareTwoVnodes(oldVnode, vnode, container.firstChild);
	} else {
		rootNode = initVnode(vnode, container.namespaceURI);
		var childNode = null;
		while (childNode = container.lastChild) {
			container.removeChild(childNode);
		}
		container.appendChild(rootNode);
	}
	vnodeStore[id] = vnode;

	clearPendingTextUpdater();
	clearPendingPropsUpdater();

	argsCache = pendingRendering[id];
	delete pendingRendering[id];

	if (isArr(argsCache)) {
		renderTreeIntoContainer(argsCache[0], container, argsCache[1]);
	}

	if (callback) {
		callback();
	}
}

function destroy(container) {
	if (!container.nodeName) {
		throw new Error('expect node');
	}
	var id = container[COMPONENT_ID];
	var vnode = null;
	if (vnode = vnodeStore[id]) {
		destroyVnode(vnode, container.firstChild);
		container.removeChild(container.firstChild);
		delete vnodeStore[id];
		return true;
	}
	return false;
}

function createElement(type, props) /* ...children */{
	var finalProps = {};
	if (props != null) {
		for (var propKey in props) {
			finalProps[propKey] = props[propKey];
		}
	}

	var defaultProps = type.defaultProps;
	if (defaultProps) {
		for (var propKey in defaultProps) {
			if (finalProps[propKey] === undefined) {
				finalProps[propKey] = defaultProps[propKey];
			}
		}
	}

	var argsLen = arguments.length;
	var finalChildren = [];

	for (var i = 2; i < argsLen; i++) {
		var child = arguments[i];
		if (isArr(child)) {
			flattenMerge(child, finalChildren);
		} else if (child != null && typeof child !== 'boolean') {
			finalChildren[finalChildren.length] = child;
		}
	}

	finalProps.children = finalChildren;

	var vnode = null;
	var varType = typeof type;
	if (varType === 'string') {
		vnode = {
			vtype: VELEMENT,
			type: type,
			props: finalProps
		};
	} else if (varType === 'function') {
		vnode = {
			id: getUid(),
			vtype: VCOMPONENT,
			type: type,
			props: finalProps
		};
	} else {
		throw new Error('unexpect type [ ' + type + ' ]');
	}

	return vnode;
}

function isValidElement(obj) {
	return obj != null && !!obj.vtype;
}

function createFactory(type) {
	var factory = function factory() {
		for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
			args[_key] = arguments[_key];
		}

		return createElement.apply(undefined, [type].concat(args));
	};
	factory.type = type;
	return factory;
}

addDirective('attr', DOMAttrDirective);
addDirective('prop', DOMPropDirective);
addDirective('on', eventDirective);
addDirective('css', styleDirective);

var Vengine = {
	createElement: createElement,
	createFactory: createFactory,
	isValidElement: isValidElement,
	addDirective: addDirective,
	removeDirective: removeDirective,
	render: render,
	destroy: destroy
};

module.exports = Vengine;