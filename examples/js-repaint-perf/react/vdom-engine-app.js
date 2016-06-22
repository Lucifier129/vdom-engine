/** @jsx React.DOM */

function DBMon(props) {
    return (
      <div attr-id="container">
        <table attr-class="table table-striped latest-data">
          <tbody>
            {
              props.databases.map(function(database) {
                return (
                  <tr
                    key={database.dbname}
                    >
                    <td attr-class="dbname">
                      {database.dbname}
                    </td>
                    <td attr-class="query-count">
                      <span attr-class={database.lastSample.countClassName}>
                        {database.lastSample.queries.length}
                      </span>
                    </td>
                      {
                        database.lastSample.topFiveQueries.map(function(query, index) {
                          return (
                            <td attr-class={ "Query " + query.elapsedClassName}>
                              {query.formatElapsed}
                              <div attr-class="popover left">
                                <div attr-class="popover-content">{query.query}</div>
                                <div attr-class="arrow"/>
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

var shouldRenderToString = location.hash.indexOf('string') !== -1

var renderHTML = function() {
  var html = React.renderToString(<DBMon databases={ENV.generateData().toArray()} />)
  document.getElementById('dbmon').innerHTML = html
  Monitoring.renderRate.ping();
  setTimeout(renderHTML, ENV.timeout);
}

var renderDBMon = function() {
  React.render(<DBMon databases={ENV.generateData().toArray()} />, document.getElementById('dbmon'));
  Monitoring.renderRate.ping();
  setTimeout(renderDBMon, ENV.timeout);
  
}
console.time('mount')
shouldRenderToString ? renderHTML() : renderDBMon()
console.timeEnd('mount')









