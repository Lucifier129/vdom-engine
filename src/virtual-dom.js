import {
    SVGNamespaceURI,
    VELEMENT,
    VCOMPONENT,
    VCOMMENT,
    HOOK_MOUNT,
    HOOK_UPDATE,
    HOOK_UNMOUNT
} from './constant'
import {
    EVENT_RE,
    getEventName,
    notBubbleEvents
} from './event-system'
import * as _ from './util'

function createVcomment(comment) {
    return {
        vtype: VCOMMENT,
        comment: comment
    }
}

export function initVnode(vnode, namespaceURI) {
    let { vtype } = vnode
    let node = null
    if (!vtype) {
        node = document.createTextNode('' + vnode)
    } else if (vtype === VELEMENT) {
        node = initVelem(vnode, namespaceURI)
    } else if (vtype === VCOMPONENT) {
        node = initVcomponent(vnode, namespaceURI)
    } else if (vtype === VCOMMENT) {
        node = document.createComment(vnode.comment)
    }
    return node
}

export function destroyVnode(vnode, node) {
    let { vtype } = vnode

    if (vtype === VELEMENT) {
        destroyVelem(vnode, node)
    } else if (vtype === VCOMPONENT) {
        destroyVcomponent(vnode, node)
    }
}

function updateVnode(vnode, newVnode, node) {
    let newNode = node
    let vtype = newVnode.vtype
    if (!vtype) { // textNode
        newNode.newText = newVnode + ''
        pendingTextUpdater[pendingTextUpdater.length] = newNode
    } else if (vtype === VELEMENT) {
        newNode = updateVelem(vnode, newVnode, newNode)
    } else if (vtype === VCOMPONENT) {
        newNode = updateVcomponent(vnode, newVnode, newNode)
    }
    return newNode
}


function initVelem(velem, namespaceURI) {
    let { type, props } = velem
    let node = null
    
    if (type === 'svg' || namespaceURI === SVGNamespaceURI) {
        namespaceURI = SVGNamespaceURI
        node = document.createElementNS(SVGNamespaceURI, type)
    } else {
        node = document.createElement(type)
    }

    initVchildren(node, props.children)
    _.attachProps(node, props)
    if (_.isFn(props[HOOK_MOUNT])) {
        pendingMountHook[pendingMountHook.length] = node
        node.onmount = props[HOOK_MOUNT]
    }

    return node
}

function initVchildren(node, vchildren) {
    let { namespaceURI } = node
    for (let i = 0, len = vchildren.length; i < len; i++) {
        let vchild = vchildren[i]
        let childNode = initVnode(vchildren[i], namespaceURI)
        childNode.vnode = vchild
        node.appendChild(childNode)
    }
}

function updateVelem(velem, newVelem, node) {
    let { props, type } = velem
    let newProps = newVelem.props
    let oldHtml = props['prop-innerHTML']
    let vchildren = props.children
    let newVchildren = newProps.children

    if (oldHtml == null && vchildren.length) {
        let patches = diffVchildren(node, vchildren, newVchildren)
        updateVchildren(node, newVchildren, patches)
        // collect pending props
        node.props = props
        node.newProps = newProps
        pendingPropsUpdater[pendingPropsUpdater.length] = node
    } else {
        // should patch props first, make sure innerHTML was cleared 
        _.patchProps(node, props, newProps)
        initVchildren(node, newVchildren)
    }

    if (_.isFn(props[HOOK_UPDATE])) {
        props[HOOK_UPDATE].call(null, node)
    }

    return node
}

function updateVchildren(node, newVchildren, patches) {
    let newVchildrenLen = newVchildren.length
    let { childNodes, namespaceURI } = node

    for (let i = 0; i < newVchildrenLen; i++) {
        let newVnode = newVchildren[i]
        let patchNode = patches[i]
        let newChildNode = null
        if (patchNode) {
            let vnode = patchNode.vnode
            newChildNode = patchNode
            patchNode.vnode = null
            if (newVnode !== vnode) {
                newChildNode = updateVnode(vnode, newVnode, patchNode)
            }
            let currentNode = childNodes[i]
            if (currentNode !== newChildNode) {
                node.insertBefore(newChildNode, currentNode || null)
            }
        } else {
            newChildNode = initVnode(newVnode, namespaceURI)
            node.insertBefore(newChildNode, childNodes[i] || null)
        }
        newChildNode.vnode = newVnode
    }
}

function diffVchildren(node, vchildren, newVchildren) {
    let { childNodes } = node
    let vchildrenLen = vchildren.length
    let newVchildrenLen = newVchildren.length

    // signal of whether vhild has been matched or not
    let matches = Array(vchildrenLen)
    let patches = Array(newVchildrenLen)
    checkEqual(vchildren, newVchildren, childNodes, patches, matches)
    checkSimilar(vchildren, newVchildren, childNodes, patches, matches)
    return patches
}

function checkEqual(vchildren, newVchildren, childNodes, patches, matches) {
    let vchildrenLen = vchildren.length
    let newVchildrenLen = newVchildren.length
    // check equal
    for (let i = 0; i < vchildrenLen; i++) {
        let vnode = vchildren[i]
        for (let j = 0; j < newVchildrenLen; j++) {
            if (patches[j]) {
                continue
            }
            let newVnode = newVchildren[j]
            if (vnode === newVnode) {
                patches[j] = childNodes[i]
                matches[i] = true
                break
            }
        }
    }
}

function checkSimilar(vchildren, newVchildren, childNodes, patches, matches) {
    let vchildrenLen = vchildren.length
    let newVchildrenLen = newVchildren.length
    let shouldRemove = null

    // check similar
    for (let i = 0; i < vchildrenLen; i++) {
        if (matches[i]) {
            continue
        }
        let childNode = childNodes[i]
        let vnode = vchildren[i]
        let { type, key } = vnode
        let isMatch = false
        
        for (let j = 0; j < newVchildrenLen; j++) {
            if (patches[j]) {
                continue
            }
            let newVnode = newVchildren[j]
            if (newVnode.type === type && newVnode.key === key) {
                patches[j] = childNode
                isMatch = true
                break
            }
        }

        if (!isMatch) {
            if (!shouldRemove) {
                shouldRemove = []
            }
            shouldRemove[shouldRemove.length] = childNode
            destroyVnode(vnode, childNode)
        }
    }

    if (shouldRemove) {
        for (let i = 0, len = shouldRemove.length; i < len; i++) {
            let childNode = shouldRemove[i]
            childNode.parentNode.removeChild(childNode)
        }
    }
}


function destroyVelem(velem, node) {
    let { props } = velem
    let vchildren = props.children
    let childNodes = node.childNodes

    for (let i = 0, len = vchildren.length; i < len; i++) {
        destroyVnode(vchildren[i], childNodes[i])
    }

    if (_.isFn(props[HOOK_UNMOUNT])) {
        props[HOOK_UNMOUNT].call(null, node)
    }

    node.eventStore = null
    for (let key in props) {
        if (EVENT_RE.test(key)) {
            key = getEventName(key)
            if (notBubbleEvents[key] === true) {
                node[key] = null
            }
        }
    }
}

function initVcomponent(vcomponent, namespaceURI) {
    let vnode = renderVcomponent(vcomponent)
    let node = initVnode(vnode, namespaceURI)
    node.cache = node.cache || {}
    node.cache[vcomponent.id] = vnode
    return node
}
function updateVcomponent(vcomponent, newVcomponent, node) {
    let id = vcomponent.id
    let vnode = node.cache[id]
    delete node.cache[id]
    let newVnode = renderVcomponent(newVcomponent)
    let newNode = compareTwoVnodes(vnode, newVnode, node)
    newNode.cache = newNode.cache || {}
    newNode.cache[newVcomponent.id] = newVnode
    if (newNode !== node) {
        _.extend(newNode.cache, node.cache)
    }
    return newNode
}
function destroyVcomponent(vcomponent, node) {
    let id = vcomponent.id
    let vnode = node.cache[id]
    delete node.cache[id]
    destroyVnode(vnode, node)
}

function renderVcomponent(vcomponent) {
    let { type: factory, props } = vcomponent
    let vnode = factory(props)
    if (vnode && vnode.render) {
        vnode = vnode.render()
    }
    if (vnode === null || vnode === false) {
        vnode = createVcomment(`component placeholder: ${_.getUid()}`)
    } else if (!vnode || !vnode.vtype) {
        throw new Error(`@${factory.name}#render:You may have returned undefined, an array or some other invalid object`)
    }
    return vnode
}

let pendingMountHook = []
export let clearPendingMount = () => {
    let len = pendingMountHook.length
    if (!len) {
        return
    }
    let list = pendingMountHook
    let i = -1
    while (len--) {
        let node = list[++i]
        node.onmount.call(null, node)
        node.onmount = null
    }
    pendingMountHook.length = 0
}

let pendingTextUpdater = []
export let clearPendingTextUpdater = () => {
    let len = pendingTextUpdater.length
    if (!len) {
        return
    }
    let list = pendingTextUpdater
    let i = -1
    while (len--) {
        let node = list[++i]
        // node.nodeValue = node.newText
        node.replaceData(0, node.length, node.newText)
    }
    pendingTextUpdater.length = 0
}

let pendingPropsUpdater = []
export let clearPendingPropsUpdater = () => {
    let len = pendingPropsUpdater.length
    if (!len) {
        return
    }
    let list = pendingPropsUpdater
    let i = -1
    while (len--) {
        let node = list[++i]
        _.patchProps(node, node.props, node.newProps)
        node.props = node.newProps = null
    }
    pendingPropsUpdater.length = 0
}

export function compareTwoVnodes(vnode, newVnode, node) {
    let newNode = node

    if (newVnode == null) { // remove
        destroyVnode(vnode, node)
        node.parentNode.removeChild(node)
    } else if (vnode.type !== newVnode.type || newVnode.key !== vnode.key) {  // replace
        destroyVnode(vnode, node)
        newNode = initVnode(newVnode, node.namespaceURI)
        node.parentNode.replaceChild(newNode, node)
    } else if (vnode !== newVnode) { 
        // same type and same key -> update
        let vtype = vnode.vtype
        if (vtype === VELEMENT) {
            newNode = updateVelem(vnode, newVnode, node)
        } else if (vtype === VCOMPONENT) {
            newNode = updateVcomponent(vnode, newVnode, node)
        }
    }
    
    return newNode
}