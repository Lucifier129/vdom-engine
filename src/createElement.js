import { VELEMENT, VCOMPONENT } from './constant'
import * as _ from './util'

export function createElement(type, props, /* ...children */) {
	let finalProps = {}
	if (props != null) {
		for (let propKey in props) {
			finalProps[propKey] = props[propKey]
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
	        _.flattenMerge(child, finalChildren)
	    } else if (child != null && typeof child !== 'boolean') {
	        finalChildren[finalChildren.length] = child.vtype ? child : '' + child
	    }
	}

	finalProps.children = finalChildren

	let vnode = null
	let varType = typeof type
	if (varType === 'string') {
		vnode = {
			vtype: VELEMENT,
			type: type,
			props: finalProps
		}
	} else if (varType === 'function') {
		vnode = {
			id: _.getUid(),
			vtype: VCOMPONENT,
			type: type,
			props: finalProps
		}
	} else {
		throw new Error(`unexpect type [ ${type} ]`)
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