import React from 'react';
import ReactDOM from 'react-dom';
import browser from 'webextension-polyfill'
import './css/index.less';

import Nested from './nested-component';
import CheckList from './CheckList'

class Popup extends React.Component {
  constructor(props) {
    super(props);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.state = {
      configs: null,
      currentConfig: null,
      searchSubject: true
    };
  }

  handleInputChange(e) {
    if (e.target.id === "search-subject") {
      browser.storage.local.set({
        searchSubject: e.target.checked
      });
      this.setState({
        searchSubject: e.target.checked
      })
    }
  }
  handleSelectChange(e) {
    browser.storage.local.set({
      currentConfig: e.target.value
    });
    this.setState({
      currentConfig: e.target.value
    })
  }

  componentDidMount() {
    browser.tabs.query({active: true}).then(tabs => {
      this.setState({activeTab: tabs[0]});
    });
    browser.storage.local.get()
      .then(obj => {
        var configs = {};
        for (const prop in obj) {
          if (obj[prop].type === 'config') {
            configs[prop] = obj[prop];
          }
        }
        this.setState({
          configs,
          currentConfig: obj.currentConfig,
          searchSubject: obj.searchSubject
        });
      })
  }

  render() {
    const {activeTab, configs} = this.state;
    let options = null;
    if (this.state.configs) {
      let c = { ...this.state.configs };
      options = Object.keys(c).map((key) => {
        return (<option
          value={key}
          key={key}>
          {c[key].description}
          </option>
      )
      })
    }
    return (
      <div>
        <h1>设置</h1>
        <div className="setting-container">
          <ul>
            <CheckList
              onChange={(e) => this.handleInputChange(e)}
              pageId="search-subject"
              name="检测条目是否存在"
              checked={this.state.searchSubject}
            />
            <li>
              <label htmlFor="model-config">
                <span>选择配置</span>
                <select
                  class="select-list"
                  id="model-config"
                  value={this.state.currentConfig}
                  onChange={this.handleSelectChange}
                >
                  {options}
                </select>
              </label>
            </li>
          </ul>
        </div>
      </div>
    );
  }
}

ReactDOM.render(<Popup/>, document.getElementById('app'));
