/** @jsx React.DOM */

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







