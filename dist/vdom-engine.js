/*!
 * vdom-engine.js v0.1.6
 * (c) 2016 Jade Gu
 * Released under the MIT License.
 */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  global.Vengine = factory();
}(this, function () { 'use strict';

  var directives = {};
  var DIRECTIVE_SPEC = /^([^-]+)-(.+)$/;

  function addDirective(name, configs) {
      directives[name] = configs;
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
          if (propKey !== 'children' && props[propKey] != null) {
              attachProp(elem, propKey, props[propKey]);
          }
      }
  }

  function patchProps(elem, props, newProps) {
      for (var propKey in props) {
          if (propKey === 'children') {
              continue;
          }
          var newValue = newProps[propKey];
          if (newValue !== props[propKey]) {
              if (newValue == null) {
                  detachProp(elem, propKey);
              } else {
                  attachProp(elem, propKey, newValue);
              }
          }
      }
      for (var propKey in newProps) {
          if (propKey === 'children') {
              continue;
          }
          if (!(propKey in props)) {
              attachProp(elem, propKey, newProps[propKey]);
          }
      }
  }

  var SVGNamespaceURI = 'http://www.w3.org/2000/svg';
  var COMPONENT_ID = 'liteid';
  var VELEMENT = 1;
  var VSTATELESS = 2;
  var VCOMMENT$1 = 3;
  var HTML_KEY = 'prop-innerHTML';
  var HOOK_WILL_MOUNT = 'hook-willMount';
  var HOOK_DID_MOUNT = 'hook-didMount';
  var HOOK_WILL_UPDATE = 'hook-willUpdate';
  var HOOK_DID_UPDATE = 'hook-didUpdate';
  var HOOK_WILL_UNMOUNT = 'hook-willUnmount';

  var emptyList = [];

  function isFn(obj) {
      return typeof obj === 'function';
  }

  var isArr = Array.isArray;

  function noop() {}

  function identity(obj) {
      return obj;
  }

  function pipe(fn1, fn2) {
      return function () {
          fn1.apply(this, arguments);
          return fn2.apply(this, arguments);
      };
  }

  function flatEach(list, iteratee, a) {
      var len = list.length;
      var i = -1;

      while (len--) {
          var item = list[++i];
          if (isArr(item)) {
              flatEach(item, iteratee, a);
          } else {
              iteratee(item, a);
          }
      }
  }

  function addItem(list, item) {
      list[list.length] = item;
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

  function renderVstateless(vstateless, context) {
      var factory = vstateless.type;
      var props = vstateless.props;

      var vnode = factory(props, context);
      if (vnode && vnode.render) {
          vnode = vnode.render();
      }
      if (vnode === null || vnode === false) {
          vnode = {
              vtype: VCOMMENT,
              uid: _.getUid()
          };
      } else if (!vnode || !vnode.vtype) {
          throw new Error('@' + factory.name + '#render:You may have returned undefined, an array or some other invalid object');
      }
      return vnode;
  }

  if (!Object.freeze) {
      Object.freeze = identity;
  }

  function createElement(type, props) /* ...children */{
  	var finalProps = {};
  	var key = null;
  	if (props != null) {
  		for (var propKey in props) {
  			if (propKey === 'key') {
  				if (props.key !== undefined) {
  					key = '' + props.key;
  				}
  			} else {
  				finalProps[propKey] = props[propKey];
  			}
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
  	var finalChildren = emptyList;

  	if (argsLen > 2) {
  		finalChildren = [];
  		for (var i = 2; i < argsLen; i++) {
  			var child = arguments[i];
  			if (isArr(child)) {
  				flatEach(child, collectChild, finalChildren);
  			} else {
  				collectChild(child, finalChildren);
  			}
  		}
  	}

  	finalProps.children = finalChildren;

  	var vtype = null;
  	if (typeof type === 'string') {
  		vtype = VELEMENT;
  	} else if (typeof type === 'function') {
  		vtype = VSTATELESS;
  	} else {
  		throw new Error('unexpect type [ ' + type + ' ]');
  	}

  	var vnode = {
  		vtype: vtype,
  		type: type,
  		props: finalProps,
  		key: key
  	};
  	if (vtype === VSTATELESS) {
  		vnode.uid = getUid();
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

  function collectChild(child, children) {
  	if (child != null && typeof child !== 'boolean') {
  		children[children.length] = child.vtype ? child : '' + child;
  	}
  }

  var Share = {
  	h: createElement,
  	createElement: createElement,
  	createFactory: createFactory,
  	isValidElement: isValidElement,
  	addDirective: addDirective,
  	removeDirective: removeDirective
  };

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

  function setStyleValue(elemStyle, styleName, styleValue) {

      if (!_.isUnitlessNumber[styleName] && _.RE_NUMBER.test(styleValue)) {
          styleValue += 'px';
      } else if (styleValue == null || typeof styleValue === 'boolean') {
          styleValue = '';
      }

      if (styleName === 'float') {
          styleName = 'cssFloat';
      }

      elemStyle[styleName] = styleValue;
  }

  // event config
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

  function detachEvents(node, props) {
  	node.eventStore = null;
  	for (var key in props) {
  		// key start with 'on-'
  		if (key.indexOf('on-') === 0) {
  			key = getEventName(key);
  			if (notBubbleEvents[key]) {
  				node[key] = null;
  			}
  		}
  	}
  }

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
  	syntheticEvent.persist = noop;
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

  function initVnode(vnode, context, namespaceURI) {
      var vtype = vnode.vtype;

      var node = null;
      if (!vtype) {
          // init text
          node = document.createTextNode(vnode);
      } else if (vtype === VELEMENT) {
          // init element
          node = initVelem(vnode, context, namespaceURI);
      } else if (vtype === VSTATELESS) {
          // init stateless component
          node = initVstateless(vnode, context, namespaceURI);
      } else if (vtype === VCOMMENT$1) {
          // init comment
          node = document.createComment('react-empty: ' + vnode.uid);
      }
      return node;
  }

  function updateVnode(vnode, newVnode, node, context) {
      var vtype = vnode.vtype;

      if (vtype === VSTATELESS) {
          return updateVstateless(vnode, newVnode, node, context);
      }

      // ignore VCOMMENT and other vtypes
      if (vtype !== VELEMENT) {
          return node;
      }

      if (vnode.props[HTML_KEY] != null) {
          updateVelem(vnode, newVnode, node, context);
          initVchildren(newVnode, node, context);
      } else {
          updateVChildren(vnode, newVnode, node, context);
          updateVelem(vnode, newVnode, node, context);
      }
      return node;
  }

  function updateVChildren(vnode, newVnode, node, context) {
      var patches = {
          removes: [],
          updates: [],
          creates: []
      };
      // console.time('time')
      diffVchildren(patches, vnode, newVnode, node, context);

      flatEach(patches.removes, applyDestroy);

      flatEach(patches.updates, applyUpdate);

      flatEach(patches.creates, applyCreate);
      // console.timeEnd('time')
  }

  function applyUpdate(data) {
      if (!data) {
          return;
      }
      var node = data.node;

      // update
      if (data.shouldUpdate) {
          var vnode = data.vnode;
          var newVnode = data.newVnode;
          var context = data.context;

          if (!vnode.vtype) {
              node.nodeValue = newVnode;
          } else if (vnode.vtype === VELEMENT) {
              updateVelem(vnode, newVnode, node, context);
          } else if (vnode.vtype === VSTATELESS) {
              node = updateVstateless(vnode, newVnode, node, context);
          }
      }

      // re-order
      if (data.index !== data.fromIndex) {
          var existNode = node.parentNode.childNodes[index];
          if (existNode !== node) {
              node.parentNode.insertBefore(node, existNode);
          }
      }
  }

  function applyDestroy(data) {
      destroyVnode(data.vnode, data.node);
      data.node.parentNode.removeChild(data.node);
  }

  function applyCreate(data) {
      var parentNode = data.parentNode;
      var existNode = parentNode.childNodes[data.index];
      var node = initVnode(data.vnode, data.context, parentNode.namespaceURI);
      parentNode.insertBefore(node, existNode);
  }

  /**
   * Only vnode which has props.children need to call destroy function
   * to check whether subTree has component that need to call lify-cycle method and release cache.
   */

  function destroyVnode(vnode, node) {
      var vtype = vnode.vtype;

      if (vtype === VELEMENT) {
          // destroy element
          destroyVelem(vnode, node);
      } else if (vtype === VSTATELESS) {
          // destroy stateless component
          destroyVstateless(vnode, node);
      }
  }

  function initVelem(velem, context, namespaceURI) {
      var type = velem.type;
      var props = velem.props;

      var node = null;

      if (type === 'svg' || namespaceURI === SVGNamespaceURI) {
          node = document.createElementNS(SVGNamespaceURI, type);
          namespaceURI = SVGNamespaceURI;
      } else {
          node = document.createElement(type);
      }

      initVchildren(node, props.children, context);
      attachProps(node, props);

      if (props[HOOK_WILL_MOUNT]) {
          props[HOOK_WILL_MOUNT].call(null, node, props);
      }

      if (props[HOOK_DID_MOUNT]) {
          addItem(pendingHooks, {
              type: HOOK_DID_MOUNT,
              node: node,
              props: props
          });
      }

      return node;
  }

  function initVchildren(node, vchildren, context) {
      var namespaceURI = node.namespaceURI;

      for (var i = 0, len = vchildren.length; i < len; i++) {
          node.appendChild(initVnode(vchildren[i], context, namespaceURI));
      }
  }

  function diffVchildren(patches, vnode, newVnode, node, context) {
      var childNodes = node.childNodes;

      var vchildren = vnode.props.children;
      var newVchildren = newVnode.props.children;
      var vchildrenLen = vchildren.length;
      var newVchildrenLen = newVchildren.length;

      if (vchildrenLen === 0) {
          if (newVchildrenLen === 0) {
              return;
          }
          for (var i = 0; i < newVchildrenLen; i++) {
              addItem(patches.creates, {
                  vnode: newVchildren[i],
                  parentNode: node,
                  context: context,
                  index: i
              });
          }
          return;
      } else if (newVchildrenLen === 0) {
          for (var i = 0; i < vchildrenLen; i++) {
              addItem(patches.removes, {
                  vnode: vchildren[i],
                  node: childNodes[i]
              });
          }
          return;
      }

      var matches = {};
      var updates = Array(newVchildrenLen);
      var removes = null;
      var creates = null;

      // isEqual
      for (var i = 0; i < vchildrenLen; i++) {
          var _vnode = vchildren[i];
          for (var j = 0; j < newVchildrenLen; j++) {
              if (updates[j]) {
                  continue;
              }
              var _newVnode = newVchildren[j];
              if (_vnode === _newVnode) {
                  var shouldUpdate = false;
                  if (context) {
                      if (_vnode.vtype === VSTATELESS) {
                          /**
                           * stateless component: (props, context) => <div />
                           * if context argument is specified and context is exist, should re-render
                           */
                          if (_vnode.type.length > 1) {
                              shouldUpdate = true;
                          }
                      }
                  }
                  updates[j] = {
                      shouldUpdate: shouldUpdate,
                      vnode: _vnode,
                      newVnode: _newVnode,
                      node: childNodes[i],
                      context: context,
                      index: j,
                      fromIndex: i
                  };
                  matches[i] = true;
                  break;
              }
          }
      }

      // isSimilar
      for (var i = 0; i < vchildrenLen; i++) {
          if (matches[i]) {
              continue;
          }
          var _vnode2 = vchildren[i];
          var shouldRemove = true;
          for (var j = 0; j < newVchildrenLen; j++) {
              if (updates[j]) {
                  continue;
              }
              var _newVnode2 = newVchildren[j];
              if (_newVnode2.type === _vnode2.type && _newVnode2.key === _vnode2.key) {
                  updates[j] = {
                      shouldUpdate: true,
                      vnode: _vnode2,
                      newVnode: _newVnode2,
                      node: childNodes[i],
                      context: context,
                      index: j,
                      fromIndex: i
                  };
                  shouldRemove = false;
                  break;
              }
          }
          if (shouldRemove) {
              if (!removes) {
                  removes = [];
              }
              addItem(removes, {
                  vnode: _vnode2,
                  node: childNodes[i]
              });
          }
      }

      for (var i = 0; i < newVchildrenLen; i++) {
          var item = updates[i];
          if (!item) {
              if (!creates) {
                  creates = [];
              }
              addItem(creates, {
                  vnode: newVchildren[i],
                  parentNode: node,
                  context: context,
                  index: i
              });
          } else if (item.vnode.vtype === VELEMENT) {
              diffVchildren(patches, item.vnode, item.newVnode, item.node, item.context);
          }
      }

      if (removes) {
          addItem(patches.removes, removes);
      }
      if (creates) {
          addItem(patches.creates, creates);
      }
      addItem(patches.updates, updates);
  }

  function updateVelem(velem, newVelem, node) {
      var newProps = newVelem.props;
      if (newProps[HOOK_WILL_UPDATE]) {
          newProps[HOOK_WILL_UPDATE].call(null, node, newProps);
      }
      patchProps(node, velem.props, newProps);
      if (newProps[HOOK_DID_UPDATE]) {
          newProps[HOOK_DID_UPDATE].call(null, node, newProps);
      }
      return node;
  }

  function destroyVelem(velem, node) {
      var props = velem.props;

      var vchildren = props.children;
      var childNodes = node.childNodes;

      for (var i = 0, len = vchildren.length; i < len; i++) {
          destroyVnode(vchildren[i], childNodes[i]);
      }

      if (isFn(props[HOOK_WILL_UNMOUNT])) {
          props[HOOK_WILL_UNMOUNT].call(null, node, props);
      }

      detachEvents(node, props);
  }

  function initVstateless(vstateless, context, namespaceURI) {
      var vnode = renderVstateless(vstateless, context);
      var node = initVnode(vnode, context, namespaceURI);
      node.cache = node.cache || {};
      node.cache[vstateless.uid] = vnode;
      return node;
  }

  function updateVstateless(vstateless, newVstateless, node, context) {
      var uid = vstateless.uid;
      var vnode = node.cache[uid];
      delete node.cache[uid];
      var newVnode = renderVstateless(newVstateless, context);
      var newNode = compareTwoVnodes(vnode, newVnode, node, context);
      newNode.cache = newNode.cache || {};
      newNode.cache[newVstateless.uid] = newVnode;
      if (newNode !== node) {
          extend(newNode.cache, node.cache);
      }
      return newNode;
  }

  function destroyVstateless(vstateless, node) {
      var uid = vstateless.uid;
      var vnode = node.cache[uid];
      delete node.cache[uid];
      destroyVnode(vnode, node);
  }

  var pendingHooks = [];
  var clearPendingMount = function clearPendingMount() {
      var len = pendingHooks.length;
      if (!len) {
          return;
      }
      var list = pendingHooks;
      var i = -1;
      while (len--) {
          var item = list[++i];
          item.props[item.type].call(null, item.node, item.props);
      }
      pendingHooks.length = 0;
  };

  function compareTwoVnodes(vnode, newVnode, node, context) {
      var newNode = node;
      if (newVnode == null) {
          // remove
          destroyVnode(vnode, node);
          node.parentNode.removeChild(node);
      } else if (vnode.type !== newVnode.type || vnode.key !== newVnode.key) {
          // replace
          destroyVnode(vnode, node);
          newNode = initVnode(newVnode, context, node.namespaceURI);
          node.parentNode.replaceChild(newNode, node);
      } else if (vnode !== newVnode || context) {
          // same type and same key -> update
          newNode = updateVnode(vnode, newVnode, node, context);
      }
      return newNode;
  }

  var pendingRendering = {};
  var vnodeStore = {};

  function render(vnode, container, context, callback) {
  	if (!vnode.vtype) {
  		throw new Error('cannot render ' + vnode + ' to container');
  	}

  	addDirective('attr', DOMAttrDirective);
  	addDirective('prop', DOMPropDirective);
  	addDirective('on', eventDirective);
  	addDirective('css', styleDirective);

  	var id = container[COMPONENT_ID] || (container[COMPONENT_ID] = getUid());
  	var argsCache = pendingRendering[id];

  	if (isFn(context)) {
  		callback = context;
  		context = undefined;
  	}

  	// component lify cycle method maybe call root rendering
  	// should bundle them and render by only one time
  	if (argsCache) {
  		if (argsCache === true) {
  			pendingRendering[id] = {
  				vnode: vnode,
  				context: context,
  				callback: callback
  			};
  		} else {
  			argsCache.vnode = vnode;
  			argsCache.context = context;
  			if (callback) {
  				argsCache.callback = argsCache.callback ? pipe(argsCache.callback, callback) : callback;
  			}
  		}
  		return;
  	}

  	pendingRendering[id] = true;
  	if (vnodeStore.hasOwnProperty(id)) {
  		compareTwoVnodes(vnodeStore[id], vnode, container.firstChild, context);
  	} else {
  		var rootNode = initVnode(vnode, context, container.namespaceURI);
  		var childNode = null;
  		while (childNode = container.lastChild) {
  			container.removeChild(childNode);
  		}
  		container.appendChild(rootNode);
  	}
  	vnodeStore[id] = vnode;
  	clearPendingMount();

  	argsCache = pendingRendering[id];
  	pendingRendering[id] = null;

  	if (typeof argsCache === 'object') {
  		render(argsCache.vnode, container, argsCache.context, argsCache.callback);
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
  		delete pendingRendering[id];
  		return true;
  	}
  	return false;
  }

  var Client = {
  	render: render,
  	destroy: destroy
  };

  var DOMAttrStringify = {
      attach: renderDOMAttr
  };

  var StyleStringify = {
      attach: renderDOMStyle
  };

  function renderDOMAttr(elem, attrKey, attrValue) {
      addItem(elem.attrs, attrKey + '="' + attrValue + '"');
  }

  function renderDOMStyle(elem, styleKey, styleValue) {
      if (!isUnitlessNumber[styleName] && RE_NUMBER.test(styleValue)) {
          styleValue += 'px';
      } else if (styleValue == null || typeof styleValue === 'boolean') {
          styleValue = '';
      }
      if (styleValue) {
          addItem(elem.style, styleKey + ':' + styleValue + ';');
      }
  }

  function renderToString(vnode, context) {
      addDirective('attr', DOMAttrStringify);
      addDirective('css', StyleStringify);
      return renderVnodeToString(vnode, context);
  }

  function renderVnodeToString(vnode, context) {
      var vtype = vnode.vtype;

      var node = '';
      if (!vtype) {
          node = vnode;
      } else if (vtype === VELEMENT) {
          node = renderVelemToString(vnode, context);
      } else if (vtype === VSTATELESS) {
          node = renderVstatelessToString(vnode, context);
      }
      return node;
  }

  var selfClosingTags = {
      area: 1,
      base: 1,
      br: 1,
      col: 1,
      command: 1,
      embed: 1,
      hr: 1,
      img: 1,
      input: 1,
      keygen: 1,
      link: 1,
      meta: 1,
      param: 1,
      source: 1,
      track: 1,
      wbr: 1
  };

  function renderVelemToString(velem, context) {
      var elem = {
          tagName: velem.type,
          children: velem.props.children,
          attrs: [],
          style: []
      };
      attachProps(elem, velem.props);
      return renderElem(elem);
  }

  function renderElem(elem, context) {
      var tagName = elem.tagName;
      var attrs = elem.attrs;
      var style = elem.style;
      var children = elem.children;

      var domAttrString = getDOMAttrString(elem);
      var isSelfClosingTag = selfClosingTags[tagName];
      return isSelfClosingTag ? '<' + tagName + domAttrString + ' />' : '<' + tagName + domAttrString + '>' + renderVchildrenToString(children, context) + '</' + tagName + '>';
  }

  function renderVchildrenToString(vchildren, context) {
      var children = [];
      for (var i = 0, len = vchildren.length; i < len; i++) {
          addItem(children, renderVnodeToString(vchildren[i], context));
      }
      return children.join('');
  }

  function renderVstatelessToString(vstateless, context) {
      var vnode = renderVstateless(vstateless, context);
      var node = renderVnodeToString(vnode, context);
      return node;
  }

  function getDOMAttrString(elem) {
      var attrs = elem.attrs;
      var style = elem.style;

      if (style.length) {
          addItem(attrs, 'style="' + style.join('') + '"');
      }
      if (attrs.length) {
          return ' ' + attrs.join(' ');
      }
      return '';
  }

  var Server = {
  	renderToString: renderToString
  };

  var VdomEngine = {};
  extend(VdomEngine, Share);
  extend(VdomEngine, Client);
  extend(VdomEngine, Server);

  return VdomEngine;

}));