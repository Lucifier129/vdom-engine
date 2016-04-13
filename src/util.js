// util

import { matchDirective } from './directive'

export function isFn(obj) {
    return typeof obj === 'function'
}

export let isArr = Array.isArray

export function noop() {}
export function identity(obj) {
    return obj
}
export function pipe(fn1, fn2) {
    return function() {
        fn1.apply(this, arguments)
        return fn2.apply(this, arguments)
    }
}

export function flattenMerge(sourceList, targetList) {
    let len = sourceList.length
    let i = -1

    while (len--) {
        let item = sourceList[++i]
        if (isArr(item)) {
            flattenChildren(item, targetList)
        } else if (item != null && typeof item !== 'boolean') {
            targetList[targetList.length] = item.vtype ? item : '' + item
        }
    }
}


export function extend(to, from) {
    if (!from) {
        return to
    }
    var keys = Object.keys(from)
    var i = keys.length
    while (i--) {
        to[keys[i]] = from[keys[i]]
    }
    return to
}


let uid = 0
export function getUid() {
    return ++uid
}

export function attachProps(elem, props) {
    for (let propKey in props) {
        attachProp(elem, propKey, props[propKey], props)
    }
}

export function patchProps(elem, props, newProps) {
    let keyMap = {}
    let directive = null
    for (let propKey in props) {
        keyMap[propKey] = true
        directive = matchDirective(propKey)
        if (directive) {
            directive.patch(elem, propKey, newProps[propKey], props[propKey], newProps, props)
        }
    }
    for (let propKey in newProps) {
        if (keyMap[propKey] !== true) {
            directive = matchDirective(propKey)
            if (directive) {
                directive.patch(elem, propKey, newProps[propKey], props[propKey], newProps, props)
            }
        }
    }
}


function attachProp(elem, propKey, propValue, props) {
    if (propValue == null) {
        return detachProp(elem, propKey, props)
    }
    let directive = matchDirective(propKey)
    if (directive) {
        directive.attach(elem, propKey, propValue, props)
    }
}

function detachProp(elem, propKey, props) {
    let directive = matchDirective(propKey)
    if (directive) {
        directive.detach(elem, propKey, props)
    }
}

if (!Object.freeze) {
    Object.freeze = identity
}