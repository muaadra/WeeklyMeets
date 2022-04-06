import React from "react";
import UserPool from "../UserPool"
import moreIcon from '../Images/list.svg';

/**
 * This component represents the right side section of the website header. It contains
 * the signout button and the drop down menu for small/mobile screens  
 * @author Muaad Alrawhani
 */
function HeaderRightSection(props) {

  /**
   * Called when the sigout button is called 
  */
  function handleSignOut() {
    //https://www.npmjs.com/package/amazon-cognito-identity-js
    UserPool.getCurrentUser().signOut();
    props.onSign();
  }

  /**
   * show/hide the right side section when the list icon is clicked 
  */
  function toggleMenu() {
    if (document.getElementById("righ-side").style.display == "none" ||
      document.getElementById("righ-side").style.display == "") {
      document.getElementById("righ-side").style.display = "block";
      if (props.user != null)
        document.getElementById("signOutBttn").style.display = "block";
    } else {
      document.getElementById("righ-side").style.display = "";
      if (props.user != null)
        document.getElementById("signOutBttn").style.display = "none";
    }

  }

  return (
    <div id="profile">
      {props.user != null ? (
        <div id="signOut-cont">
          <div id="welcome">Welcome {props.userInfo.userName}!</div>
          <button id="signOutBttn" className="button button-small grey" onClick={handleSignOut}>Sign Out</button>
        </div>
      ) : null}

      {/* <button onClick={this.handleDeleteAccount}>Delete Account</button> */}
      <div id="burgerMenu-cont">
        <img id="burgerMenu" src={moreIcon} onClick={toggleMenu} />
      </div>
    </div>
  );
}

export default HeaderRightSection;
