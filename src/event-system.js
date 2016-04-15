// event config
export const notBubbleEvents = {
    onmouseleave: 1,
    onmouseenter: 1,
    onload: 1,
    onunload: 1,
    onscroll: 1,
    onfocus: 1,
    onblur: 1,
    onrowexit: 1,
    onbeforeunload: 1,
    onstop: 1,
    ondragdrop: 1,
    ondragenter: 1,
    ondragexit: 1,
    ondraggesture: 1,
    ondragover: 1,
    oncontextmenu: 1
}

export const EVENT_RE = /^on-.+/i

export let eventDirective = {
	attach: attachEvent,
	detach: detachEvent
}

// Mobile Safari does not fire properly bubble click events on
// non-interactive elements, which means delegated click listeners do not
// fire. The workaround for this bug involves attaching an empty click
// listener on the target node.
let inMobile = 'ontouchstart' in document
let emptyFunction = () => {}
let ON_CLICK_KEY = 'onclick'

export function getEventName(key) {
	return key.replace(/^on-/, 'on').toLowerCase()
}

let eventTypes = {}
function attachEvent(elem, eventType, listener) {
	eventType = 'on' + eventType

	if (notBubbleEvents[eventType] === 1) {
		elem[eventType] = listener
		return
	}

	let eventStore = elem.eventStore || (elem.eventStore = {})
	eventStore[eventType] = listener

	if (!eventTypes[eventType]) {
		// onclick -> click
		document.addEventListener(eventType.substr(2), dispatchEvent, false)
		eventTypes[eventType] = true
	}

	if (inMobile && eventType === ON_CLICK_KEY) {
	    elem.addEventListener('click', emptyFunction, false)
	}

	let nodeName = elem.nodeName

	if (eventType === 'onchange' && (nodeName === 'INPUT' || nodeName === 'TEXTAREA')) {
		attachEvent(elem, 'oninput', listener)
	}
}

function detachEvent(elem, eventType) {
	eventType = 'on' + eventType
	if (notBubbleEvents[eventType] === 1) {
		elem[eventType] = null
		return
	}

	let eventStore = elem.eventStore || (elem.eventStore = {})
	delete eventStore[eventType]

	if (inMobile && eventType === ON_CLICK_KEY) {
	    elem.removeEventListener('click', emptyFunction, false)
	}

	let nodeName = elem.nodeName

	if (eventType === 'onchange' && (nodeName === 'INPUT' || nodeName === 'TEXTAREA')) {
		delete eventStore['oninput']
	}
}

function dispatchEvent(event) {
	let { target, type } = event
	let eventType = 'on' + type
	let syntheticEvent = null
	while (target) {
		let { eventStore } = target
		let listener = eventStore && eventStore[eventType]
		if (!listener) {
			target = target.parentNode
			continue
		}
		if (!syntheticEvent) {
			syntheticEvent = createSyntheticEvent(event)
		}
		syntheticEvent.currentTarget = target
		listener.call(target, syntheticEvent)
		if (syntheticEvent.$cancalBubble) {
			break
		}
		target = target.parentNode
	}
}

function createSyntheticEvent(nativeEvent) {
    let syntheticEvent = {}
    let cancalBubble = () => syntheticEvent.$cancalBubble = true
    syntheticEvent.nativeEvent = nativeEvent
    for (let key in nativeEvent) {
    	if (typeof nativeEvent[key] !== 'function') {
    		syntheticEvent[key] = nativeEvent[key]
    	} else if (key === 'stopPropagation' || key === 'stopImmediatePropagation') {
    		syntheticEvent[key] = cancalBubble
    	} else {
    		syntheticEvent[key] = nativeEvent[key].bind(nativeEvent)
    	}
    }
    return syntheticEvent
}