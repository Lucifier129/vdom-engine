// directive store
import { isArr } from './util'

let directives = {}
let DIRECTIVE_SPEC = /^(.+)-(.+)/

export function addDirective(name, methods) {
	directives[name] = methods
}

export function removeDirective(name) {
	delete directives[name]
}

export function matchDirective(propKey) {
	if (propKey === 'style') {
		return directives.style
	}
	let matches = propKey.match(DIRECTIVE_SPEC)
	if (matches) {
		let directive = directives[matches[1]]
		if (directive) {
			directive.key = matches[2]
			return directive
		}
	}
}