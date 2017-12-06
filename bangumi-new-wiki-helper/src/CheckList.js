import React, {Component} from 'react';

class CheckList extends Component {
  render() {
    return (
      <li>
        <label htmlFor={this.props.pageId}>
          <span>{this.props.name}</span>
          <i className="checkbox-circle" />
        </label>
        <input name="pageId" id={this.props.pageId} type="checkbox"/>
      </li>
    );
  }
}
export default CheckList;
