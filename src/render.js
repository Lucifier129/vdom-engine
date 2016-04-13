import * as _ from './util'
import { COMPONENT_ID } from './constant'
import {
	initVnode,
	destroyVnode,
	compareTwoVnodes,
	batchUpdateDOM,
	clearPendingTextUpdater,
	clearPendingPropsUpdater
} from './virtual-dom'

let pendingRendering = {}
let vnodeStore = {}
export function render(vnode, container, callback) {
	if (!vnode.vtype) {
		throw new Error(`cannot render ${ vnode } to container`)
	}
	let id = container[COMPONENT_ID] || (container[COMPONENT_ID] = _.getUid())
	let argsCache = pendingRendering[id]

	// component lify cycle method maybe call root rendering
	// should bundle them and render by only one time
	if (argsCache) {
		if (argsCache === true) {
			pendingRendering[id] = argsCache = [vnode, callback]
		} else {
			argsCache[0] = vnode
			if (callback) {
				argsCache[1] = argsCache[1] ? _.pipe(argsCache[1], callback) : callback
			}
		}
		return
	}

	pendingRendering[id] = true
	let oldVnode = null
	let rootNode = null
	if (oldVnode = vnodeStore[id]) {
		rootNode = compareTwoVnodes(oldVnode, vnode, container.firstChild)
	} else {
		rootNode = initVnode(vnode, container.namespaceURI)
		var childNode = null
		while (childNode = container.lastChild) {
			container.removeChild(childNode)
		}
		container.appendChild(rootNode)
	}
	vnodeStore[id] = vnode

    clearPendingTextUpdater()
    clearPendingPropsUpdater()

	argsCache = pendingRendering[id]
	delete pendingRendering[id]

	if (_.isArr(argsCache)) {
		renderTreeIntoContainer(argsCache[0], container, argsCache[1])
	}

	if (callback) {
		callback()
	}
}

export function destroy(container) {
	if (!container.nodeName) {
		throw new Error('expect node')
	}
	let id = container[COMPONENT_ID]
	let vnode = null
	if (vnode = vnodeStore[id]) {
		destroyVnode(vnode, container.firstChild)
		container.removeChild(container.firstChild)
		delete vnodeStore[id]
		return true
	}
	return false
}