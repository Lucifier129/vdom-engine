# vdom-engine
virtual-dom engine that help everyone to build their own modern view library and user interfaces

# Installation

```shell
npm install vdom-engine
```

# Getting Start

```javascript
// vdom-engine export createElement method, works like React.createElement
// Make Babel to transform JSX by default
import React from 'vdom-engine'

let myDirective = {
	attach: (elem, propName, propValue) => {
		elem.setAttributeNS('http://www.w3.org/1999/xlink', propName, propValue)
	},
	detach: (elem, propName) => {
		elem.removeAttribute(propName)
	}
}

React.addDirective('attrns', myDirective)

let myVdom = (
	<div 
		prop-id="myId"
		attr-class="myclass"
		css-background="red"
		on-click={e => console.log(e.currentTarget.className)}
		hook-mount={node => console.log(node.id)}
		hook-update={node => console.log(node.id)}
		hook-unmount={node => console.log(node.id)}
		attrns-xlinkActuate="my directive value"
	>
	<p>Hello World</p>
	</div>
)

function DBMon(props) {
    return (
      <div prop-id="container">
        <table prop-className="table table-striped latest-data">
          <tbody>
            {
              props.databases.map(function(database) {
                return (
                  <tr
                    key={database.dbname}
                    >
                    <td prop-className="dbname">
                      {database.dbname}
                    </td>
                    <td prop-className="query-count">
                      <span prop-className={database.lastSample.countClassName}>
                        {database.lastSample.queries.length}
                      </span>
                    </td>
                      {
                        database.lastSample.topFiveQueries.map(function(query, index) {
                          return (
                            <td prop-className={ "Query " + query.elapsedClassName}>
                              {query.formatElapsed}
                              <div prop-className="popover left">
                                <div prop-className="popover-content">{query.query}</div>
                                <div prop-className="arrow"/>
                              </div>
                            </td>
                          );
                        })
                      }
                  </tr>
                );
              })
            }
          </tbody>
        </table>
      </div>
    );
}

var renderDBMon = function() {
  React.render(<DBMon databases={ENV.generateData().toArray()} />, document.getElementById('dbmon'));
  Monitoring.renderRate.ping();
  setTimeout(renderDBMon, ENV.timeout);
}

renderDBMon()

```