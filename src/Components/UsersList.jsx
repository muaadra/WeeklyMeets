import React from 'react';
import { tsData } from '../Timesheet';

/**
 * This component represents the pop-up window that contains the list 
 * showing all users on on a timeslot
 * @author Muaad Alrawhani
 */

class UsersList extends React.Component {

    state = {
        pushPopUp: false, //if the pop-up window below of visible screen, push it up
        pushRight: false //if the pop-up window left of visible screen, push it to the right
    }

    /**
     * get all users on a timeslot and create an html elements list 
     */
    getUserItem() {
        //gettimg my timesheets and sorting them
        let users;
        if (this.props.popUp) {
            users = this.props.slotUsers;
        } else {
            users = this.props.appState.timesheetUsers;
        }

        //create hml list
        if (!users) return;
        let listItems = [];
        for (let id in users) {
            listItems.push(<div className='users-list-item' key={id}>
                <div id="user-dot" style={this.userStyle(this.props.popUp ? users[id].user : id)}></div>
                {(this.props.appState.user && (this.props.popUp ? users[id].user : id) == this.props.appState.user.username) ?
                    users[id].userName + (" (You)") : users[id].userName}
            </div>);
        }

        return listItems;
    }

    /**
     * each user have a dot with a diffrent color 
     */
    userStyle(id) {
        let style = { "backgroundColor": "#000" };
        if (tsData && tsData.tsUsers[id]) { //for other members (not the current user)
            style.backgroundColor = tsData.tsUsers[id].color;
        }
        //for this user, show a square, not a dot
        if ((tsData && !tsData.tsUsers[id]) || (this.props.appState.user && id == this.props.appState.user.username)) {
            style.backgroundColor = "#b6ff94";
            style.borderRadius = 0;
        }
        return style;
    }

    /**
     * check if the popup window is off the screen (e.g., user can't see portion of it) 
     * then push it to right or up
     */
    checkIfPopupOffScreen() {
        let elem = document.getElementById("users-popup");
        if (elem) {
            let bounds = elem.getBoundingClientRect();
            let pushPopUp = false;
            let pushRight = false;
            if (bounds.bottom > window.innerHeight) {
                pushPopUp = true;
            }

            if (bounds.left < 0) {
                pushRight = true;
            }

            this.setState({ pushPopUp, pushRight });
        }
    }

    componentDidMount() {
        if (this.props.popUp)
            this.checkIfPopupOffScreen();
    }

    /**
     * change the style of the pop-up window depending on whether it is 
     * pushed up or pushed to right
     */
    getClass() {
        let classN = "";
        if (this.props.popUp) {
            classN += "users-popup";
        }
        if (this.state.pushPopUp) {
            classN += " users-popup-high"
        }
        if (this.state.pushRight) {
            classN += " users-popup-right"
        }
        return classN;
    }

    render() {
        return (
            <div id={this.props.popUp ? "users-popup" : "userlist-container"}
                className={this.getClass()}>
                <div className='tabbed-list'>
                    {this.getUserItem()}
                </div>
            </div>

        );
    }
}

export default UsersList;