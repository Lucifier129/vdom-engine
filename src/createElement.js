import { VELEMENT, VSTATELESS } from './constant'
import * as _ from './util'

export function createElement(type, props, /* ...children */) {
	let finalProps = {}
	let key = null
	if (props != null) {
		for (let propKey in props) {
			if (propKey === 'key') {
				if (props.key !== undefined) {
					key = '' + props.key
				}
			} else {
				finalProps[propKey] = props[propKey]
			}
		}
	}

	let defaultProps = type.defaultProps
	if (defaultProps) {
		for (let propKey in defaultProps) {
			if (finalProps[propKey] === undefined) {
				finalProps[propKey] = defaultProps[propKey]
			}
		}
	}

	let argsLen = arguments.length
	let finalChildren = []

	for (let i = 2; i < argsLen; i++) {
	    let child = arguments[i]
	    if (_.isArr(child)) {
	        _.flatEach(child, collectChild, finalChildren)
	    } else {
	    	collectChild(child, finalChildren)
	    }
	}

	finalProps.children = finalChildren

	let vtype = null
	if (typeof type === 'string') {
		vtype = VELEMENT
	} else if (typeof type === 'function') {
		vtype = VSTATELESS
	} else {
		throw new Error(`unexpect type [ ${type} ]`)
	}

	let vnode = {
        vtype: vtype,
        type: type,
        props: finalProps,
        key: key,
    }
    if (vtype === VSTATELESS) {
        vnode.uid = _.getUid()
    }

	return vnode
}

export function isValidElement(obj) {
	return obj != null && !!obj.vtype
}

export function createFactory(type) {
	let factory = (...args) => createElement(type, ...args)
	factory.type = type
	return factory
}

function collectChild(child, children) {
    if (child != null && typeof child !== 'boolean') {
        children[children.length] = child.vtype ? child : '' + child
    }
}