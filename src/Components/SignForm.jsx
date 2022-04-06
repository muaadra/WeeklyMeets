import React from "react";
import "../Styles/SignIn.css";
import UserPool from "../UserPool"
import { CognitoUserAttribute, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js';

/**
 * This component represents sign-in/up form.
 * 
 * Important functions:
 * handleSignUp()
 * handleSignIn()
 * handleForgotPassword()
 * 
 * Reference: this code is based on the documentation of the npm package:
 * amazon-cognito-identity-js
 * https://www.npmjs.com/package/amazon-cognito-identity-js
 * 
 * @author Muaad Alrawhani
 */

class SignForm extends React.Component {
  state = {
    signError: "",
    signInVisible: true,
    forgotPassword: 0
  };


  /**
  * helper method to handleSignInUp: when signup is clicked
  */
  handleSignUp(event) {
    event.preventDefault();

    //get userName, email, and password
    this.userName = event.target.userName.value;
    this.email = event.target.email.value;
    this.password = event.target.password.value;

    let userName = {
      Name: "name",
      Value: this.userName
    };

    let attributeUserName = new CognitoUserAttribute(userName);

    UserPool.signUp(this.email, this.password, [attributeUserName], null, (error, data) => {
      if (error) {
        this.setState({ signError: error.message });
      } else {
        this.handleSignIn(event);
      }
    });
  }

  /**
  * helper method to handleSignInUp: when signin is clicked
  */
  handleSignIn(event) {
    event.preventDefault();

    //get email and password
    this.email = event.target.email.value;
    this.password = event.target.password.value;

    let authenticationDetails = new AuthenticationDetails({
      Username: this.email,
      Password: this.password
    });

    let userData = new CognitoUser({
      Username: this.email,
      Pool: UserPool
    });

    userData.authenticateUser(authenticationDetails, {
      onSuccess: (result) => {
        console.log("Signed In");
        this.props.onSign();
      },
      onFailure: (error) => {
        this.setState({ signError: error.message });
      }
    });
  }

  /**
  * when the forgot button is clicked
  */
  handleForgotPassword(e) {
    e.preventDefault();

    let email = document.getElementById("forgot-email").value;
    if (email == "") {
      alert("Please provide your email address");
      return;
    }

    let userData = new CognitoUser({
      Username: email,
      Pool: UserPool
    });

    //first send verification code email from user
    if (this.state.forgotPassword == 1) {
      //send verification code
      this.setState({ forgotPassword: 2 });

      userData.forgotPassword({
        onSuccess: (data) => {
          alert("Please check your email. A verification code was sent to your email.");
        },
        onFailure: (err) => {
          alert(err);
        },
      })
    } else if (this.state.forgotPassword == 2) { //second send code and new password to reset the old pass 

      let confirmationCode = document.getElementById("passCode").value;
      let newPass = document.getElementById("newPassword").value;

      userData.confirmPassword(confirmationCode, newPass, {
        onFailure(err) {
          alert(err);
        },
        onSuccess() {
          this.setState({ forgotPassword: 0 });
          alert("Your password was successfully reset!");
        },
      });

    }
  }


  /**
 * toggle between sign-in or sign-up view
 */
  toggleSignInUp(e) {
    e.preventDefault();
    this.setState((prevStat) => ({
      signInVisible: (e.target.name == "sign-in" ? true : false),
      signError: "",
      forgotPassword: 0
    }));
  }

  /**
   * when submit button is clicked
   */
  handleSignInUp(event) {
    if (this.state.signInVisible) {
      this.handleSignIn(event);
    } else {
      this.handleSignUp(event);
    }
  }

  render() {
    return (
      <div id="sign-in-form">
        {/* Sign In/Up button */}
        <div id="sign-in-up-buttons">
          <button name="sign-in" onClick={(e) => this.toggleSignInUp(e)} className={!this.state.signInVisible ?
            "button grey" : "button green"} >
            Sign In
          </button>
          <button name="sign-up" onClick={(e) => this.toggleSignInUp(e)} className={this.state.signInVisible ?
            "button grey" : "button green"}>
            Sign Up
          </button>
        </div>

        {/* Sign In/Up form */}
        {this.state.forgotPassword == 0 ?
          <form onSubmit={(e) => this.handleSignInUp(e)}>
            <hr />
            <h2>{!this.state.signInVisible ? "Sign Up" : "Sign In"}</h2>

            {/* the username field - to be toggled */}
            {!this.state.signInVisible ? (
              <div>
                <label htmlFor="userName" className="form-label">
                  User name
                </label>
                <input id="userName" type="text"></input>
              </div>
            ) : null}
            <div>
              <label htmlFor="email" className="form-label">
                Email address
              </label>
              <input
                id="email" type="email"></input>
            </div>
            <div className="mb-3">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input id="password" type="password"></input>
            </div>
            {this.state.signError != "" ? (
              <div className="alert">{this.state.signError}</div>
            ) : null}

            <button type="submit" className="button blue">
              Submit
            </button>
          </form>
          : null}

        {/* Forgot Password */}
        {this.state.forgotPassword != 0 ?
          <form onSubmit={(e) => this.handleForgotPassword(e)}>
            <hr />
            <h2>Forgot Password</h2>

            {/* the username field - to be toggled */}
            {!this.state.signInVisible ? (
              <div>
                <label htmlFor="userName" className="form-label">
                  User name
                </label>
                <input id="userName" type="text"></input>
              </div>
            ) : null}
            <label>
              Email address
              <input id="forgot-email" type="email"></input>
            </label>
            {this.state.forgotPassword == 2 ?
              <label>
                Code sent to your email
                <input id="passCode" type="text"></input>
              </label> : null}
            {this.state.forgotPassword == 2 ?
              <label>
                New Password
                <input id="newPassword" type="password"></input>
              </label> : null}
            <button type="submit" className="button blue">
              {this.state.forgotPassword == 1 ? "Send Verification Code" : "Submit"}
            </button>
          </form>
          : null}
        <button onClick={() => this.setState(prevState => ({ forgotPassword: (prevState.forgotPassword == 0 ? 1 : 0) }))}>
          Forgot password</button>
      </div>
    );
  }
}

export default SignForm;
