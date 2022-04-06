import React from 'react';
import Timesheet from './Timesheet';
import { CognitoUserPool } from 'amazon-cognito-identity-js';
//import "bootstrap/dist/css/bootstrap.min.css"
import Header from "./Components/Header";
import SignForm from "./Components/SignForm";
import "./Styles/index.css";
import UserPool from "./UserPool"
import Dashboard from './Components/Dashboard';

/**
 * This component represents the entire web app. all other componenets are children
 * of this component
 * 
 * important functions:
 * handleUserStatus()
 * saveTimesheet()
 * createNewTimesheet()
 * retrieveCurrentUserIdToken()
 * 
 * @author Muaad Alrawhani
 */

class App extends React.Component {

    userInfo = {
        userName: "",
        email: "",
        userId: "",
    }//this current user info

    timesheetComp = React.createRef(); //refrence to the timesheet component

    constructor(props) {
        super(props);
        this.state = new stateObj();
    }

    /**
     * This function handles the user state (signe-in or signed-out) and changes the 
     * web app view depending on this state. so if signed in, then the user 
     * will be able to see componenets such as "my timesheet" links
     */
    handleUserStatus = () => {
        let idToken = this.retrieveCurrentUserIdToken();
        if (idToken) {//user is signed in
            this.userInfo = {
                userName: idToken.payload.name,
                email: idToken.payload.email,
                userId: idToken.payload["cognito:username"]
            }

            this.setState({
                user: UserPool.getCurrentUser(),
                timesheedViewMode: (this.state.timesheetIdOnView != null ? "signedIn" : null), //so timesheet doest refresh when ther is data on sheet
                timesheetUsers: this.state.timesheetUsers ? this.state.timesheetUsers : { [idToken.payload["cognito:username"]]: { "userName": idToken.payload.name } }
            }, () => {
                this.timesheetComp.current.updateTsView();
            })


            //get user's list of timesheets
            this.getMyTimeSheets();

        } else {
            this.userInfo.userName = "";
            this.userInfo.email = "";

            this.setState({
                user: null,
                myTimeSheets: {},
                timesheedViewMode: "signedOut"
            }, () => {
                this.timesheetComp.current.getTimesheetData();
            })
        }


    }

    componentDidMount() {
        this.handleUserStatus();
    }

    /**
     * called from the calander/timesheet component, when the timesheet data
     * is refreshed. it updates the link/URL on view, the timesheet name
     * and the timesheet members/users 
     */
    showTsDataOnView(tsData) {
        this.setState({
            timesheetIdOnView: tsData.message.id,
            timesheetNameOnView: tsData.message.timesheetName,
            timesheetUsers: tsData.message.tsUsers
        })
    }

    /**
     * called when the user clicks on the delete button on a timesheet from "My timesheets list"
     */
    deleteMeFromTS(tsData) {
        if (window.confirm(`Delete ${tsData.name}?`)) {
            let timesheetData = {
                timesheetId: tsData.id,
                timesheetName: document.getElementById("tsName").value,
                availability: {},
                deleteTs: tsData.id
            }

            const requestOptions = {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": this.retrieveCurrentUserIdToken().getJwtToken(),
                },
                body: JSON.stringify(timesheetData)
            };

            fetch("https://rbb7u7jqd2.execute-api.us-east-1.amazonaws.com/Test/statemachineexecution", requestOptions)
                .then(response => response.json())
                .then(data => {
                    let response = JSON.parse(data.output);
                    let timesheetId = response.Payload.timesheetId;
                    if (timesheetId != null && timesheetId != "") {
                        let userTsheets = response.Payload.message.Attributes.timesheets;
                        this.setState({
                            myTimeSheets: userTsheets,
                        }, () => {
                            if (timesheetData.deleteTs == this.state.timesheetIdOnView) {
                                this.createNewTimesheet();
                            }
                        });


                    }
                    this.timesheetComp.current.showLoading(false);
                });
        }
    }

    /**
     * when save button is clicked. sends data to backend
     */
    saveTimesheet(userAvailability) {
        let timesheetData = {
            timesheetId: this.state.timesheetIdOnView,
            timesheetName: document.getElementById("tsName").value,
            availability: userAvailability,
            notify: document.getElementById("Notify").checked
        }

        if (!this.state.user) {
            alert("You must sign in to save your timesheet");
            return;
        } else if (timesheetData.timesheetName == "") {
            alert("please enter a name for the timesheet");
            return;
        }

        const requestOptions = {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "Authorization": this.retrieveCurrentUserIdToken().getJwtToken(),
            },
            body: JSON.stringify(timesheetData)
        };

        this.timesheetComp.current.showLoading(true, "Saving...");
        fetch("https://rbb7u7jqd2.execute-api.us-east-1.amazonaws.com/Test/statemachineexecution", requestOptions)
            .then(response => response.json())
            .then(data => {
                let response = JSON.parse(data.output);
                let timesheetId = response.Payload.timesheetId;
                //get timesheet users
                let tsUsers = this.state.timesheetUsers;
                let tsName = this.state.timesheetNameOnView;
                if (Object.keys(response.Payload.tsData).length > 0
                    && response.Payload.tsData.Attributes) {
                    tsUsers = response.Payload.tsData.Attributes.tsUsers;
                } else if (tsUsers == null) {
                    tsUsers = { [this.userInfo.userId]: { "userName": this.userInfo.userName } }
                    tsName = timesheetData.timesheetName;
                }

                if (timesheetId != null && timesheetId != "") {
                    let userTsheets = response.Payload.message.Attributes.timesheets;
                    //show new sheet on URL bar and push it to history, so when refresh, the user 
                    //retrieve the info to this sheet based on URL parameters
                    window.history.pushState({ page: timesheetId }, timesheetId, "/timesheet?ts=" + timesheetId);
                    this.setState({
                        myTimeSheets: userTsheets,
                        timesheetIdOnView: timesheetId,
                        timesheetNameOnView: tsName,
                        timesheetUsers: tsUsers
                    });

                    //make the current selected slots the original. so any later changes are detected
                    this.timesheetComp.current.setCurrentSlotSelectionAsOriginal();

                } else {
                    console.error("no timesheet sent from db")
                }
                this.timesheetComp.current.showLoading(false);
            });

    }

    /**
     * for the create "new timesheet" button
     */
    createNewTimesheet() {
        let tsChanges = this.timesheetComp.current.checkIfChangesMadeToTimesheet();
        if (tsChanges) {
            if (window.confirm("You have unsaved changes. Would you like to continue creating a new timesheet?")) {
                window.location.href = window.location.origin;
            }
        } else {
            window.location.href = window.location.origin;
        }
    }


    /**
     * get "my timesheets" from backend
     */
    getMyTimeSheets() {
        const requestOptions = {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "Authorization": this.retrieveCurrentUserIdToken().getJwtToken(),
            },
            body: JSON.stringify({ getMyTimesheetsList: true })
        };


        fetch("https://rbb7u7jqd2.execute-api.us-east-1.amazonaws.com/Test/statemachineexecution", requestOptions)
            .then(response => response.json())
            .then(data => {
                let response = JSON.parse(data.output);
                if (response.Payload.message) {
                    this.setState({ myTimeSheets: response.Payload.message.timesheets });
                }

            });

    }

    /**
     * get the id token of this user
     * Refrence:amazon-cognito-identity-js
     *  https://www.npmjs.com/package/amazon-cognito-identity-js
     */
    retrieveCurrentUserIdToken() {
        const poolData = {
            UserPoolId: "us-east-1_UDFiu3Xe0",
            ClientId: "2eprasu5245jpp0o8rm4fthu56"
        }

        var userPool = new CognitoUserPool(poolData);
        var cognitoUser = userPool.getCurrentUser();
        let idToken = null;

        if (cognitoUser != null) {
            cognitoUser.getSession(function (err, _session) {
                if (err) {
                    console.log(err);
                } else {
                    idToken = _session.getIdToken();
                }
            });
        }

        return idToken;
    }


    render() {
        return (
            <div>
                <Header user={this.state.user} userInfo={this.userInfo} onSign={this.handleUserStatus} />
                <div id="main-content">
                    <div id="timesheet-container">
                        <Timesheet app={this} ref={this.timesheetComp} />
                    </div>
                    <div id="righ-side">
                        {this.state.user == null ? <SignForm onSign={this.handleUserStatus} /> :
                            <Dashboard appState={this.state} app={this} />}
                    </div>
                </div>
                <div id="footer">
                    <p>
                        Sweet Cloud
                    </p>
                </div>
            </div>
        );
    }
}

function stateObj() {
    this.user = null;
    this.timesheetIdOnView = null;
    this.timesheetNameOnView = null;
    this.myTimeSheets = {};
    this.timesheedViewMode = null;
    this.timesheetUsers = null;
}

export default App;
