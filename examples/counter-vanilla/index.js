let Counter = ({ count, onIncr, onDecr, onOdd, onAsync }) => {
	return (
		<p>
			Clicked: <span>{ count }</span> times
			{' '}
	       	<button on-click={ onIncr }>+</button>
	       	{' '}
	        <button on-click={ onDecr }>-</button>
	        {' '}
	        <button on-click={ onOdd }>Increment if odd</button>
	        {' '}
	        <button on-click={ onAsync }>Increment async</button>
	        {' '}
	        <button on-dblclick={ onIncr }>Increment by dblclick</button>
	        {' '}
	        <button on-mousemove={ onDecr }>Decrement by mousemove</button>
	     </p>
	)
}

// Singleton redux-like store
let store = {
	state: {
		count: 0
	},
	listeners: [],
	getState() {
		return this.state
	},
	subscribe(fn) {
		this.listeners.push(fn)
	},
	notify() {
		this.listeners.forEach(fn => fn(this.state))
	},
	replaceState(prevState, nextState) {
		this.state = nextState
		if (nextState !== prevState) {
			this.notify()
		}
	},
	getNextState(reducer, ...args) {
		let { state, replaceState } = this
		let nextState = reducer(state, ...args)
		if (typeof nextState.then === 'function') {
			nextState.then(replaceState.bind(this, state))
		} else {
			this.replaceState(state, nextState)
		}
	},
	init(callback) {
		let { reducers, getNextState } = this
		this.actions = Object.keys(reducers).reduce((actions, key) => {
			let reducer = reducers[key].bind(reducers)
			actions[key] = getNextState.bind(this, reducer)
			return actions
		}, {})
		callback && callback()
	},
	reducers: {
		onIncr(state, ...args) {
			let { count } = state
			return Object.assign({}, state, {
				count: ++count
			})
		},
		onDecr(state, ...args) {
			let { count } = state
			return Object.assign({}, state, {
				count: --count
			})
		},
		onOdd(state, ...args) {
			let { count } = state
			if (count % 2 !== 0) {
				return this.onIncr(state, ...args)
			}
			return state
		},
		onAsync(state, ...args) {
			let increment = this.onIncr.bind(this, state, ...args)
			return new Promise((resolve, reject) => {
				setTimeout(resolve.bind(null, increment()), 1000)
			})
		}
	}
}

let renderView = () => {
	React.render(
		<Counter {...store.getState()} {...store.actions} />,
		document.getElementById('container')
	)
}

store.subscribe(renderView)
store.init(renderView)