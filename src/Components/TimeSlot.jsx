import React from 'react';
import UsersList from './UsersList';
import moreIcon from '../Images/More.svg';

/**
 * This component represents a timeslot on the timesheet, each timesolt could either be
 * on or off representing the user's availability on a timeslot. Other users' availability
 * could also show on the timeslot as colored dots
 *
 * @author Muaad Alrawhani
 */


class TimeSlot extends React.Component {

    selected = this.props.myInfo.selected;
    state = {
        popUp: false //the popup window showing other users on this timeslot
    }

    /**
     * called when the user clicks on the timeslot or mouse enters a timeslot
     *  while the mouse button is down. This function toggles the timeslot on/off
     *  @param clickedOn true if called when onMouseDown false if onMouseEnter
     */
    selectDeselect = (e, clickedOn) => {
        if (clickedOn) {
            e.preventDefault();

            //when user clicks on a slot, they can only select slots on this day until mouse is up 
            //so set the day of this slot tb the selection day
            this.props.setSelectionDay(this.props.myInfo.day);
        }

        //if you (clicked on time slot or mouse is down on it) and the timeslot is not selected
        if ((document.mouseIsDown || clickedOn)) {
            if (this.props.getSelectionDay()[0] === this.props.myInfo.day[0]) {
                this.props.myInfo.selected = !this.props.selected;
                this.props.calendar.updateSlotRangeHighlight(clickedOn, this.props.myInfo)
            }
        }
    }

    /**
     * show the popup window that shows other users sharing this timeslot
     *  @param show set true to show the popup, otherwise false
     */
    showUsersOnSlot(show) {
        this.setState({ popUp: show });
    }

    myInfo = {}; //this timeslot info
    /**
     * creates the list of users that will show on the popup window
     */
    showOtherUsers() {
        let arr = [];
        this.myInfo = this.props.myInfo;

        //**uncomment to show yourseld as one of the users when selecting/highliting a time slot */
        // if (this.props.selected && this.props.app.state.user) {
        //     this.myInfo = JSON.parse(JSON.stringify(this.props.myInfo));
        //     this.myInfo.others.push({
        //         color: null,
        //         userName: this.props.app.userInfo.userName,
        //         user: this.props.app.userInfo.userId
        //     })
        // }

        if (this.myInfo.others.length > 0) {
            //the number on members on ts
            let userCount = this.myInfo.others.length;

            //show how many users on this slot. when mouse is over, show list of users
            arr.push(<div key={-1} className='avbl-users-numbr' onMouseOver={() => this.showUsersOnSlot(true)}
                onMouseLeave={() => this.showUsersOnSlot(false)}>{userCount}</div>)

            //color dots for the members of ts
            let maxUserDotsPerSlot = 5;
            userCount = (userCount > maxUserDotsPerSlot ? maxUserDotsPerSlot : userCount); //max 5 dots per slot, add moreicon for > 5

            for (let i = 0; i < userCount; i++) {
                if (this.myInfo.others[i].color != null)
                    arr.push(<div key={i} className='users-in-slot' style={{ "backgroundColor": this.myInfo.others[i].color }}></div>);
            }

            //show dots icon (more) if more than 5 users on slot
            if (this.myInfo.others.length > maxUserDotsPerSlot) {
                arr.push(<img key={userCount} src={moreIcon} alt="more users" onMouseOver={() => this.showUsersOnSlot(true)}
                    onMouseLeave={() => this.showUsersOnSlot(false)} />)
            }
        }

        return arr;
    }

    /**
     * to change the look (css) of this timeslot depending whether it is selected or not
     */
    getSlotClass() {
        //console.log(this.state.selected);
        let classN = "slot";
        if (this.props.selected) {
            classN += " slot-selected";
        }
        if (this.props.myInfo.index % 4 == 0) {
            classN += " slot-bttm-border";
        }
        return classN;
    }

    render() {
        return <div
            id={this.props.id}
            onMouseDown={(e) => this.selectDeselect(e, true)}
            onMouseEnter={(e) => this.selectDeselect(e, false)}
            onMouseUp={() => this.props.calendar.updateSelectedTimeSlots()}
            className={this.getSlotClass()} draggable="false">
            {this.state.popUp ? <UsersList slotUsers={this.myInfo.others}
                popUp={true} appState={this.props.calendar.props.app.state} /> : null}
            <div className='avbl-user-p'>{this.showOtherUsers()}</div>
        </div>;

    }
}

export default TimeSlot;