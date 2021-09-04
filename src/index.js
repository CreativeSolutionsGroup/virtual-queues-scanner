import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import "semantic-ui-css/semantic.min.css";
import Scanner from './components/Scanner'

class App extends React.Component {
  render() {
    return (
      <div className="App" >
        <Scanner />
      </div>
    )
  }
}

// ========================================

ReactDOM.render(<App />, document.getElementById("root"));
