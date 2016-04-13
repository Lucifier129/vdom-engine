import {
    SVGNamespaceURI,
    VELEMENT,
    VCOMPONENT,
    VCOMMENT
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
        node = document.createTextNode(vnode)
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


function initVelem(velem, namespaceURI) {
    let { type, props } = velem
    let node = null
    
    if (type === 'svg' || namespaceURI === SVGNamespaceURI) {
        node = document.createElementNS(SVGNamespaceURI, type)
        namespaceURI = SVGNamespaceURI
    } else {
        node = document.createElement(type)
    }

    let { children } = props
    let vchildren = node.vchildren = []

    if (_.isArr(children)) {
        _.flattenChildren(children, collectChild, vchildren)
    } else {
        collectChild(children, vchildren)
    }

    for (let i = 0, len = vchildren.length; i < len; i++) {
        node.appendChild(initVnode(vchildren[i], namespaceURI))
    }

    _.attachProps(node, props)

    return node
}

function collectChild(child, children) {
    if (child != null && typeof child !== 'boolean') {
        children[children.length] = child.vtype ? child : '' + child
    }
}

function updateVelem(velem, newVelem, node) {
    let { props, type } = velem
    let newProps = newVelem.props
    let oldHtml = props['prop-innerHTML']
    let newChildren = newProps.children
    let { vchildren, childNodes, namespaceURI } = node
    let vchildrenLen = vchildren.length
    let newVchildren = node.vchildren = []

    if (_.isArr(newChildren)) {
        _.flattenChildren(newChildren, collectChild, newVchildren)
    } else {
        collectChild(newChildren, newVchildren)
    }

    let newVchildrenLen = newVchildren.length

    if (oldHtml == null && vchildrenLen) {
        let shouldRemove = null
        let patches = Array(newVchildrenLen)

        for (let i = 0; i < vchildrenLen; i++) {
            let vnode = vchildren[i]
            for (let j = 0; j < newVchildrenLen; j++) {
                if (patches[j]) {
                    continue
                }
                let newVnode = newVchildren[j]
                if (vnode === newVnode) {
                    patches[j] = {
                        vnode: vnode,
                        node: childNodes[i]
                    }
                    vchildren[i] = null
                    break
                }
            }
        }

        outer: for (let i = 0; i < vchildrenLen; i++) {
            let vnode = vchildren[i]
            if (vnode === null) {
                continue
            }
            let { type } = vnode
            let key = vnode.key
            let childNode = childNodes[i]

            for (let j = 0; j < newVchildrenLen; j++) {
                if (patches[j]) {
                    continue
                }
                let newVnode = newVchildren[j]
                if (newVnode.type === type && newVnode.key === key) {
                    patches[j] = {
                        vnode: vnode,
                        node: childNode
                    }
                    continue outer
                }
            }

            if (!shouldRemove) {
                shouldRemove = []
            }
            shouldRemove[shouldRemove.length] = childNode
            destroyVnode(vnode, childNode)
        }

        if (shouldRemove) {
            for (let i = 0, len = shouldRemove.length; i < len; i++) {
                node.removeChild(shouldRemove[i])
            }
        }
        
        for (let i = 0; i < newVchildrenLen; i++) {
            let newVnode = newVchildren[i]
            let patchItem = patches[i]
            if (patchItem) {
                let vnode = patchItem.vnode
                let newChildNode = patchItem.node
                if (newVnode !== vnode) {
                    let vtype = newVnode.vtype
                    if (!vtype) { // textNode
                        newChildNode.newText = newVnode
                        pendingTextUpdater[pendingTextUpdater.length] = newChildNode
                    } else if (vtype === VELEMENT) {
                        newChildNode = updateVelem(vnode, newVnode, newChildNode)
                    } else if (vtype === VCOMPONENT) {
                        newChildNode = updateVcomponent(vnode, newVnode, newChildNode)
                    }
                }
                let currentNode = childNodes[i]
                if (currentNode !== newChildNode) {
                    node.insertBefore(newChildNode, currentNode || null)
                }
            } else {
                let newChildNode = initVnode(newVnode, namespaceURI)
                node.insertBefore(newChildNode, childNodes[i] || null)
            }
        }
        node.props = props
        node.newProps = newProps
        pendingPropsUpdater[pendingPropsUpdater.length] = node
    } else {
        // should patch props first, make sure innerHTML was cleared 
        _.patchProps(node, props, newProps)
        for (let i = 0; i < newVchildrenLen; i++) {
            node.appendChild(initVnode(newVchildren[i], namespaceURI))
        }
    }

    return node
}

function destroyVelem(velem, node) {
    let { props } = velem
    let { vchildren, childNodes } = node

    for (let i = 0, len = vchildren.length; i < len; i++) {
        destroyVnode(vchildren[i], childNodes[i])
    }

    node.eventStore = node.vchildren = null
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

export function batchUpdateDOM() {
    clearPendingPropsUpdater()
    clearPendingTextUpdater()
}

let pendingTextUpdater = []
let clearPendingTextUpdater = () => {
    let len = pendingTextUpdater.length
    if (!len) {
        return
    }
    let list = pendingTextUpdater
    pendingTextUpdater = []
    for (let i = 0; i < len; i++) {
        let node = list[i]
        node.nodeValue = node.newText
    }
}

let pendingPropsUpdater = []
let clearPendingPropsUpdater = () => {
    let len = pendingPropsUpdater.length
    if (!len) {
        return
    }
    let list = pendingPropsUpdater
    pendingPropsUpdater = []
    for (let i = 0; i < len; i++) {
        let node = list[i]
        _.patchProps(node, node.props, node.newProps)
        node.props = node.newProps = null
    }
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