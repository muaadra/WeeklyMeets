import React from "react";
import HeaderRightSection from "./HeaderRightSection";

/**
 * This component represents header of the web app. It contains the profile buttons
 * of the user
 * @author Muaad Alrawhani
 */

class Header extends React.Component {
  render() {
    return (
      <nav id="header">
        <div id="title">
          <h1>Timesheets</h1>
        </div>
        <HeaderRightSection user={this.props.user} userInfo={this.props.userInfo} onSign={this.props.onSign} />
      </nav>
    );
  }
}

export default Header;
