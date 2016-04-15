/**
 * DOM Property Operations
 */
export let DOMPropDirective = {
	attach: attachDOMProp,
	detach: detachDOMProp
}

export let DOMAttrDirective = {
	attach: attachDOMAttr,
	detach: detachDOMAttr
}

function attachDOMProp(elem, propName, propValue) {
	elem[propName] = propValue
}

function detachDOMProp(elem, propName) {
	elem[propName] = ''
}

function attachDOMAttr(elem, attrName, attrValue) {
	elem.setAttribute(attrName, attrValue + '')
}

function detachDOMAttr(elem, attrName) {
	elem.removeAttribute(attrName)
}