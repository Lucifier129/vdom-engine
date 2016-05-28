import { detachEvents } from './event-system'
import * as _ from './util'
import {
    SVGNamespaceURI,
    VELEMENT,
    VSTATELESS,
    VCOMMENT,
    HTML_KEY,
    HOOK_WILL_MOUNT,
    HOOK_DID_MOUNT,
    HOOK_WILL_UPDATE,
    HOOK_DID_UPDATE,
    HOOK_WILL_UNMOUNT
} from './constant'

export function initVnode(vnode, context, namespaceURI) {
    let { vtype } = vnode
    let node = null
    if (!vtype) { // init text
        node = document.createTextNode(vnode)
    } else if (vtype === VELEMENT) { // init element
        node = initVelem(vnode, context, namespaceURI)
    } else if (vtype === VSTATELESS) { // init stateless component
        node = initVstateless(vnode, context, namespaceURI)
    } else if (vtype === VCOMMENT) { // init comment
        node = document.createComment(`react-empty: ${ vnode.uid }`)
    }
    return node
}

function updateVnode(vnode, newVnode, node, context) {
    let { vtype } = vnode

    if (vtype === VSTATELESS) {
        return updateVstateless(vnode, newVnode, node, context)
    }

    // ignore VCOMMENT and other vtypes
    if (vtype !== VELEMENT) {
        return node
    }

    if (vnode.props[HTML_KEY] != null) {
        updateVelem(vnode, newVnode, node, context)
        initVchildren(newVnode, node, context)
    } else {
        updateVChildren(vnode, newVnode, node, context)
        updateVelem(vnode, newVnode, node, context)
    }
    return node
}

function updateVChildren(vnode, newVnode, node, context) {
    let patches = {
            removes: [],
            updates: [],
            creates: [],
        }
    // console.time('patch')
    diffVchildren(patches, vnode, newVnode, node, context)
    _.flatEach(patches.removes, applyDestroy)
    _.flatEach(patches.updates, applyUpdate)
    _.flatEach(patches.creates, applyCreate)
    // console.timeEnd('patch')
}


function applyUpdate(data) {
    if (!data) {
        return
    }
    let node = data.node

    // update
    if (data.shouldUpdate) {
        let { vnode, newVnode, context } = data
        if (!vnode.vtype) {
            node.nodeValue = newVnode
        } else if (vnode.vtype === VELEMENT) {
            updateVelem(vnode, newVnode, node, context)
        } else if (vnode.vtype === VSTATELESS) {
            node = updateVstateless(vnode, newVnode, node, context)
        }
    }

    // re-order
    if (data.index !== data.fromIndex) {
        let existNode = node.parentNode.childNodes[index]
        if (existNode !== node) {
            node.parentNode.insertBefore(node, existNode)
        }
    }
}

function applyDestroy(data) {
    destroyVnode(data.vnode, data.node)
    data.node.parentNode.removeChild(data.node)
}

function applyCreate(data) {
    let parentNode = data.parentNode
    let existNode = parentNode.childNodes[data.index]
    let node = initVnode(data.vnode, data.context, parentNode.namespaceURI)
    parentNode.insertBefore(node, existNode)
}


/**
 * Only vnode which has props.children need to call destroy function
 * to check whether subTree has component that need to call lify-cycle method and release cache.
 */
export function destroyVnode(vnode, node) {
    let { vtype } = vnode
    if (vtype === VELEMENT) { // destroy element
        destroyVelem(vnode, node)
    } else if (vtype === VSTATELESS) { // destroy stateless component
        destroyVstateless(vnode, node)
    }
}

function initVelem(velem, context, namespaceURI) {
    let { type, props } = velem
    let node = null

    if (type === 'svg' || namespaceURI === SVGNamespaceURI) {
        node = document.createElementNS(SVGNamespaceURI, type)
        namespaceURI = SVGNamespaceURI
    } else {
        node = document.createElement(type)
    }

    initVchildren(node, props.children, context)
    _.attachProps(node, props)

    if (props[HOOK_WILL_MOUNT]) {
        props[HOOK_WILL_MOUNT].call(null, node, props)
    }

    if (props[HOOK_DID_MOUNT]) {
        _.addItem(pendingHooks, {
            type: HOOK_DID_MOUNT,
            node: node,
            props: props,
        })
    }

    return node
}

function initVchildren(node, vchildren, context) {
    let { namespaceURI } = node
    for (let i = 0, len = vchildren.length; i < len; i++) {
        node.appendChild(initVnode(vchildren[i], context, namespaceURI))
    }
}

function diffVchildren(patches, vnode, newVnode, node, context) {
    let { childNodes } = node
    let vchildren = vnode.props.children
    let newVchildren = newVnode.props.children
    let vchildrenLen = vchildren.length
    let newVchildrenLen = newVchildren.length

    if (vchildrenLen === 0) {
        if (newVchildrenLen === 0) {
            return
        }
        for (let i = 0; i < newVchildrenLen; i++) {
            _.addItem(patches.creates, {
                vnode: newVchildren[i],
                parentNode: node,
                context: context,
                index: i,
            })
        }
        return
    } else if (newVchildrenLen === 0) {
        for (let i = 0; i < vchildrenLen; i++) {
            _.addItem(patches.removes, {
                vnode: vchildren[i],
                node: childNodes[i],
            })
        }
        return
    }

    let matches = {}
    let updates = Array(newVchildrenLen)
    let removes = null
    let creates = null

    // isEqual
    for (let i = 0; i < vchildrenLen; i++) {
        let vnode = vchildren[i]
        for (let j = 0; j < newVchildrenLen; j++) {
            if (updates[j]) {
                continue
            }
            let newVnode = newVchildren[j]
            if (vnode === newVnode) {
                let shouldUpdate = false
                if (context) {
                    if (vnode.vtype === VSTATELESS) {
                        /**
                         * stateless component: (props, context) => <div />
                         * if context argument is specified and context is exist, should re-render
                         */
                        if (vnode.type.length > 1) {
                            shouldUpdate = true
                        }
                    }
                }
                updates[j] = {
                    shouldUpdate: shouldUpdate,
                    vnode: vnode,
                    newVnode: newVnode,
                    node: childNodes[i],
                    context: context,
                    index: j,
                    fromIndex: i,
                }
                matches[i] = true
                break
            }
        }
    }

    // isSimilar
    for (let i = 0; i < vchildrenLen; i++) {
        if (matches[i]) {
            continue
        }
        let vnode = vchildren[i]
        let shouldRemove = true
        for (let j = 0; j < newVchildrenLen; j++) {
            if (updates[j]) {
                continue
            }
            let newVnode = newVchildren[j]
            if (
                newVnode.type === vnode.type &&
                newVnode.key === vnode.key
            ) {
                updates[j] = {
                    shouldUpdate: true,
                    vnode: vnode,
                    newVnode: newVnode,
                    node: childNodes[i],
                    context: context,
                    index: j,
                    fromIndex: i,
                }
                shouldRemove = false
                break
            }
        }
        if (shouldRemove) {
            if (!removes) {
                removes = []
            }
            _.addItem(removes, {
                vnode: vnode,
                node: childNodes[i]
            })
        }
    }

    for (let i = 0; i < newVchildrenLen; i++) {
        let item = updates[i]
        if (!item) {
            if (!creates) {
                creates = []
            }
            _.addItem(creates, {
                vnode: newVchildren[i],
                parentNode: node,
                context: context,
                index: i,
            })
        } else if (item.vnode.vtype === VELEMENT) {
            diffVchildren(patches, item.vnode, item.newVnode, item.node, item.context)
        }
    }
    
    if (removes) {
        _.addItem(patches.removes, removes)
    }
    if (creates) {
        _.addItem(patches.creates, creates)
    }
    _.addItem(patches.updates, updates)
}

function updateVelem(velem, newVelem, node) {
    let newProps = newVelem.props
    if (newProps[HOOK_WILL_UPDATE]) {
        newProps[HOOK_WILL_UPDATE].call(null, node, newProps)
    }
    _.patchProps(node, velem.props, newProps)
    if (newProps[HOOK_DID_UPDATE]) {
        newProps[HOOK_DID_UPDATE].call(null, node, newProps)
    }
    return node
}

function destroyVelem(velem, node) {
    let { props } = velem
    let vchildren = props.children
    let childNodes = node.childNodes

    for (let i = 0, len = vchildren.length; i < len; i++) {
        destroyVnode(vchildren[i], childNodes[i])
    }

    if (_.isFn(props[HOOK_WILL_UNMOUNT])) {
        props[HOOK_WILL_UNMOUNT].call(null, node, props)
    }

    detachEvents(node, props)
}

function initVstateless(vstateless, context, namespaceURI) {
    let vnode = renderVstateless(vstateless, context)
    let node = initVnode(vnode, context, namespaceURI)
    node.cache = node.cache || {}
    node.cache[vstateless.uid] = vnode
    return node
}

function updateVstateless(vstateless, newVstateless, node, context) {
    let uid = vstateless.uid
    let vnode = node.cache[uid]
    delete node.cache[uid]
    let newVnode = renderVstateless(newVstateless, context)
    let newNode = compareTwoVnodes(vnode, newVnode, node, context)
    newNode.cache = newNode.cache || {}
    newNode.cache[newVstateless.uid] = newVnode
    if (newNode !== node) {
        _.extend(newNode.cache, node.cache)
    }
    return newNode
}

function destroyVstateless(vstateless, node) {
    let uid = vstateless.uid
    let vnode = node.cache[uid]
    delete node.cache[uid]
    destroyVnode(vnode, node)
}

function renderVstateless(vstateless, context) {
    let { type: factory, props } = vstateless
    let vnode = factory(props, context)
    if (vnode && vnode.render) {
        vnode = vnode.render()
    }
    if (vnode === null || vnode === false) {
        vnode = {
            vtype: VCOMMENT,
            uid: _.getUid(),
        }
    } else if (!vnode || !vnode.vtype) {
        throw new Error(`@${factory.name}#render:You may have returned undefined, an array or some other invalid object`)
    }
    return vnode
}


let pendingHooks = []
export let clearPendingMount = () => {
    let len = pendingHooks.length
    if (!len) {
        return
    }
    let list = pendingHooks
    let i = -1
    while (len--) {
        let item = list[++i]
        item.props[item.type].call(null, item.node, item.props)
    }
    pendingHooks.length = 0
}

export function compareTwoVnodes(vnode, newVnode, node, context) {
    let newNode = node
    if (newVnode == null) {
        // remove
        destroyVnode(vnode, node)
        node.parentNode.removeChild(node)
    } else if (vnode.type !== newVnode.type || vnode.key !== newVnode.key) {
        // replace
        destroyVnode(vnode, node)
        newNode = initVnode(newVnode, context, node.namespaceURI)
        node.parentNode.replaceChild(newNode, node)
    } else if (vnode !== newVnode || context) {
        // same type and same key -> update
        newNode = updateVnode(vnode, newVnode, node, context)
    }
    return newNode
}