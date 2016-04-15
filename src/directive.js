// directive store
let directives = {}
let DIRECTIVE_SPEC = /^([^-]+)-(.+)$/

export function addDirective(name, methods) {
	directives[name] = methods
}

export function removeDirective(name) {
	delete directives[name]
}

let currentName = null
function matchDirective(propKey) {
	let matches = propKey.match(DIRECTIVE_SPEC)
	if (matches) {
		currentName = matches[2]
        return directives[matches[1]]
	}
}

function attachProp(elem, propKey, propValue) {
    let directive = matchDirective(propKey)
    if (directive) {
        directive.attach(elem, currentName, propValue)
    }
}

function detachProp(elem, propKey) {
	let directive = matchDirective(propKey)
    if (directive) {
        directive.detach(elem, currentName)
    }
}

export function attachProps(elem, props) {
    for (let propKey in props) {
        if (props[propKey] != null) {
        	attachProp(elem, propKey, props[propKey])
        }
    }
}

export function patchProps(elem, props, newProps) {
    let keyMap = {}
    let directive = null
    for (let propKey in props) {
        keyMap[propKey] = true
        patchProp(elem, propKey, newProps[propKey], props[propKey])
    }
    for (let propKey in newProps) {
        if (keyMap[propKey] !== true) {
            patchProp(elem, propKey, newProps[propKey], props[propKey])
        }
    }
}

function patchProp(elem, propKey, propValue, oldPropValue) {
	if (propValue == oldPropValue) {
		return
	}
	if (propValue == null) {
		detachProp(elem, propKey)
	} else {
		attachProp(elem, propKey, propValue)
	}
}