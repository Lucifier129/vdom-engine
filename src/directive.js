// directive store
let directives = []

export function addDirective(directiveConfig) {
	directives.push(directiveConfig)
}

export function removeDirective(directiveConfig) {
	directives = directives.filter(item => item !== directiveConfig)
}

export function matchDirective(propKey) {
	for (let i = 0, len = directives.length; i < len; i++) {
	    let directive = directives[i]
	    let test = directive.test
	    let testType = typeof test
	    let isMatched = false

	    if (testType === 'string') {
	    	// in this case, test is a string check whether equal to propKey or not
	        if (propKey === test) {
	            isMatched = true
	        }
	    } else if (testType === 'function') {
	    	// in this case, test is a custrom test function that return boolean value
	        if (test(propKey)) {
	            isMatched = true
	        }
	    } else {
	        // in this case, test should be a regexp or obj which has test method and return boolean value
	        isMatched = test.test(propKey)
	    }

	    // return the directive by first match
	    if (isMatched) {
	    	return directive
	    }
	}
}