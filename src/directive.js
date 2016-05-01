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
    for (let propKey in props) {
        if (newProps.hasOwnProperty(propKey)) {
            if (newProps[propKey] !== props[propKey]) {
                if (newProps[propKey] == null) {
                    detachProp(elem, propKey)
                } else {
                    attachProp(elem, propKey, newProps[propKey])
                }
            }
        } else {
            detachProp(elem, propKey)
        }
    }
    for (let propKey in newProps) {
        if (!props.hasOwnProperty(propKey)) {
            attachProp(elem, propKey, newProps[propKey])
        }
    }
}