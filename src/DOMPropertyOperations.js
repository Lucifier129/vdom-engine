/**
 * DOM Property Operations
 */
const PROP_RE = /^prop-(.+)/
const ATTR_RE = /^(attr|data|aria)-(.+)/
const ATTR_NS_RE = /^attrns-(.+)/ // attribute with namespace

export let DOMPropDirective = {
	test: PROP_RE,
	attach: attachDOMProp,
	detach: detachDOMProp,
	patch: patchDOMProp
}

export let DOMAttrDirective = {
	test: ATTR_RE,
	attach: attachDOMAttr,
	detach: detachDOMAttr,
	patch: patchDOMAttr
}

export let DOMAttrNSDirective = {
	test: ATTR_NS_RE,
	attach: attachDOMAttrNS,
	detach: detachDOMAttrNS,
	patch: patchDOMAttrNS
}

function attachDOMProp(elem, propKey, propValue) {
	let propName = getPropName(propKey)
	elem[propName] = propValue
}

function detachDOMProp(elem, propKey) {
	let propName = getPropName(propKey)
	elem[propName] = ''
}

function patchDOMProp(elem, propKey, propValue, oldPropValue) {
	if (propValue === oldPropValue) {
		return
	}
	let propName = getPropName(propKey)
	if (propValue == null) {
		elem[propName] = ''
	} else {
		elem[propName] = propValue
	}
}

function attachDOMAttr(elem, propKey, propValue) {
	let attrName = getAttrName(propKey)
	elem.setAttribute(attrName, propValue)
}

function detachDOMAttr(elem, propKey) {
	let attrName = getAttrName(propKey)
	elem.removeAttribute(attrName)
}

function patchDOMAttr(elem, propKey, propValue, oldPropValue) {
	if (propValue === oldPropValue) {
		return
	}
	let attrName = getAttrName(propKey)
	if (propValue == null) {
		elem.removeAttribute(attrName)
	} else {
		elem.setAttribute(attrName, propValue)
	}
}

function attachDOMAttrNS(elem, propKey, propValue, props) {
	let attrName = getAttrNSName(propKey)
	elem.setAttributeNS(props.namespace, attrName, propValue)
}

function detachDOMAttrNS(elem, propKey) {
	let attrName = getAttrNSName(propKey)
	elem.removeAttribute(attrName)
}

function patchDOMAttrNS(elem, propKey, propValue, oldPropValue, props) {
	if (propValue === oldPropValue) {
		return
	}
	let attrName = getAttrNSName(propKey)
	if (propValue == null) {
		elem.removeAttribute(attrName)
	} else {
		elem.setAttributeNS(props.namespace, attrName, propValue)
	}
}

function getPropName(propKey) {
	// 'prop-value'.match(PROP_RE) -> ["prop-value", "value"]
	return propKey.match(PROP_RE)[1]
}

function getAttrName(propKey) {
	// 'attr-id'.match(/^(attr|data|aria)-(.+)/) -> ["attr-id", "attr", "id"]
	// 'data-id'.match(/^(attr|data|aria)-(.+)/) -> ["data-id", "data", "id"]
	let result = propKey.match(ATTR_RE)
	// should return all propKey if it is data-* or aria-*
	return result[1] === 'attr' ? result[2] : result[0]
}

function getAttrNSName(propKey) {
	// 'attrns-test'.match(/^attrns-(.+)/) -> ["attrns-test", "test"]
	return propKey.match(ATTR_NS_RE)[1]
}