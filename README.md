# vdom-engine
virtual-dom engine that help everyone to build their own modern view library and user interfaces

React is awesome, but also too huge to be a view library, its way of handle props to dom is very limit and hard to extend by user. Sometimes we need a smaller and extensible virtual-dom library.

# Installation

```shell
npm install vdom-engine
```

# Getting Start

vdom-engine is a react-like library, but only support `virtual-dom` and `stateless functional component`, these make it smaller and faster. Its api are the subset of React's api with a few different points.

## Handle props

Unlike react, vdom-engine use `directive-style` to handle its props, now it has five build-in directives, `attr|prop|on|css|hook`. The `prop in props` which did not match any directive would be ignored.

```javascript
import React from 'vdom-engine'
const vdom = (
  <div
    attr-class="my-class"
    prop-id="myId"
    on-click={handleClick}
    css-width={100}
    otherProp="will be ignore"
  />
)

React.render(vdom, document.body) // always return undefined

// use native dom api to get the dom created by vdom-engine
let target = documnent.body.firstElementChild
target.nodeName // div
target.getAttribute('class') // my-class
target.id // myId
target.style.width // 100px
target.removeEventListener('click', handleClick, false) // remove the event
```

## Handle directives

You can use the api `addDirective` to add a new directive, and use `removeDirective` to remove one of them.

```javascript
import React from 'vdom-engine'

/**
* when in initialize, vdom-engine use directive.attach to map propValue to dom
* when in update
* if  newValue is undefined or null, call directive.detach
* else if newValue is not equal to preValue, call directive.attatch with newValue
* propName in each method is 
*/

// now jsx support a namespace attribute of http://www.w3.org/1999/xlink
React.addDirective('attrns', {
  // how to use: attrns-propName={propValue}
  attach: (elem, propName, propValue) => {
    elem.setAttributeNS('http://www.w3.org/1999/xlink', propName, propValue)
  },
  detach: (elem, propName) => {
    elem.removeAttribute(propName)
  }
})

let vdom = <div attrns-test="test attrns" />

// remove the directive
// React.removeDirective('attrns')
```
## Handle component

vdom-engine support stateless functional component, the same as React.

```javascript
import React from 'vdom-engine'
let MyComponent = (props) => {
  return (
    <div {...props}>{ props.children }</div>
  )
}
React.render(
  <MyComponent prop-id="myId">test children</MyComponent>,
  document.body
)
```
## Handle life-cycle methods

Unlike React, vdom-engine do not support stateful component(`React.Component` or `React.createClass`), but every native-tag of virtual-dom has its life-cycle, sush as `div`, `span`, `p`, etc.

Use the directive 'hook-lifyCycle' like below:

```javascript
import React from 'vdom-engine'

React.render(
  <div
    hook-willMount={onWillMount}
    hook-didMount={onDidMount}
    hook-willUpdate={onWillUpdate}
    hook-didUpdate={onDidUpdate}
  >some text</div>,
  document.body
)

// call onWillMount
// call onDidMount

React.render(
  <div
    hook-willMount={onWillMount}
    hook-didMount={onDidMount}
    hook-willUpdate={onWillUpdate}
    hook-didUpdate={onDidUpdate}
  >update text</div>,
  document.body
)

// call onWillUpdate
// call onDidUpdate
```

## Handle shouldComponentUpdate

Please follow the [React-basic Memoization Section](https://github.com/reactjs/react-basic#memoization)

## Handle context

Unlike React, context is out of `Component#getChildContext`, it pass by `React.render` from top to bottom, just like `props`.

```javascript
import React from 'vdom-engine'
// just add context argument explicitly
let MyComponent = (props, context) => {
  return <div>props: {JSON.stringify(props)}, context: {JSON.stringify(context)}</div>
}

let myContext = {
  a: 1,
  b: 2,
  c: 3
}

React.render(<MyComponent />, document.body, myContext, () => {
  console.log('callback')
})

```

# Examples

- [js-repaint-perf](http://lucifier129.github.io/vdom-engine/examples/js-repaint-perf)
- [counter](http://lucifier129.github.io/vdom-engine/examples/counter-vanilla)

# License
MIT