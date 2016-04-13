/** @jsx React.DOM */

function DBMon(props) {
    return (
      <div prop-id="container">
        <table attr-class="table table-striped latest-data">
          <tbody>
            {
              props.databases.map(function(database) {
                return (
                  <tr key={database.dbname}>
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

var renderDBMon = function() {
  React.render(<DBMon databases={ENV.generateData().toArray()} />, document.getElementById('dbmon'));
  Monitoring.renderRate.ping();
  setTimeout(renderDBMon, ENV.timeout);
}

renderDBMon()







