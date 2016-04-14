/**
 * DOM Property Operations
 */
export let DOMPropDirective = {
	attach: attachDOMProp,
	detach: detachDOMProp,
	patch: patchDOMProp
}

export let DOMAttrDirective = {
	attach: attachDOMAttr,
	detach: detachDOMAttr,
	patch: patchDOMAttr
}

function attachDOMProp(elem, propName, propValue) {
	elem[propName] = propValue
}

function detachDOMProp(elem, propName) {
	elem[propName] = ''
}

function patchDOMProp(elem, propName, propValue, oldPropValue) {
	if (propValue === oldPropValue) {
		return
	}
	if (propValue == null) {
		elem[propName] = ''
	} else {
		elem[propName] = propValue
	}
}

function attachDOMAttr(elem, attrName, propValue) {
	elem.setAttribute(attrName, propValue)
}

function detachDOMAttr(elem, attrName) {
	elem.removeAttribute(attrName)
}

function patchDOMAttr(elem, attrName, propValue, oldPropValue) {
	if (propValue === oldPropValue) {
		return
	}
	if (propValue == null) {
		elem.removeAttribute(attrName)
	} else {
		elem.setAttribute(attrName, propValue)
	}
}