// placeholder
import { createElement, createFactory, isValidElement } from './createElement'
import { addDirective, removeDirective } from './directive'
import { render, destroy } from './render'

import {
	DOMAttrDirective,
	DOMAttrNSDirective,
	DOMPropDirective
} from './DOMPropertyOperations'
import { styleDirective } from './CSSPropertyOperations'
import { eventDirective } from './event-system'

addDirective(DOMAttrDirective)
addDirective(DOMPropDirective)
addDirective(styleDirective)
addDirective(eventDirective)
addDirective(DOMAttrNSDirective)

const Vengine = {
	createElement,
	createFactory,
	isValidElement,
	addDirective,
	removeDirective,
	render,
	destroy
}

export default Vengine