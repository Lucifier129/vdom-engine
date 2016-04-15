// util

export { attachProps, patchProps } from './directive'

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
            targetList[targetList.length] = item
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

if (!Object.freeze) {
    Object.freeze = identity
}