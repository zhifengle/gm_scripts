import React from 'react';
import ReactDOM from 'react-dom';
import browser from 'webextension-polyfill'
import './css/index.less';

import Nested from './nested-component';
import CheckList from './CheckList'

class Popup extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      activeTab: null,
      configs: null
    };
  }

  componentDidMount() {
    // Get the active tab and store it in component state.
    browser.tabs.query({active: true}).then(tabs => {
      this.setState({activeTab: tabs[0]});
    });
    browser.storage.local.get()
      .then(obj => {
        var configs = [];
        for (const prop in obj) {
          if (obj[prop].type === 'config') {
            configs.push(obj[prop])
          }
        }
        this.setState({
          configs
        });
      })
  }

  render() {
    const {activeTab, configs} = this.state;
    return (
      <div>
        <h1>设置</h1>
        <div className="setting-container">
          <ul>
            <CheckList pageId="search-subject" name="测试" />
            <li>
              <label htmlFor="bangumiDomain">
                <span>Bangumi域名</span>
                <select class="select-list" id="bangumiDomain">
                  <option value="bangumi.tv">bangumi.tv</option>
                  <option value="bgm.tv">bgm.tv</option>
                  <option value="chii.in">chii.in</option>
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
