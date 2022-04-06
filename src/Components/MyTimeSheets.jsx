import React from 'react';
import deleteBttn from '../Images/Delete.svg';

/**
 * Signed in users can view a list of all timesheets they have created.
 * So this component represents the "My timesheets" list that shows the user's previously 
 * created timesheets
 * @author Muaad Alrawhani
 */

class MyTimeSheets extends React.Component {
    state = {} // the state of this component

    /**
     * This function navigates the user to the requested timesheet URL
     * @param timesheetId the is of the timesheet
     */
    goToTimesheet(timesheetId) {
        window.location.href = window.location.origin + "/timesheet?ts=" + timesheetId;
    }

    /**
     * This function navigates the user to the requested timesheet URL when the user
     * clicks on an item in the "My timesheets" list
     */
    getTsItem() {
        //gettimg my timesheets and sorting them
        let ts = this.props.appState.myTimeSheets;
        let result = Object.keys(ts).map((key) => [key, ts[key]]);

        //sort the timesheets objects by date created
        let items = result.sort(function (a, b) {
            return b[1].timeStamp - a[1].timeStamp;
        });

        //create the list html elements
        let listItems = [];
        items.forEach(item => {
            listItems.push(
                <div key={item[0]} className='mytimesheets-links'>
                    <button id='ts-link-bttn' onClick={() => { this.goToTimesheet(item[0]) }}>{item[1].name}
                    </button>
                    <button id='delete-bttn' onClick={() => this.props.app.deleteMeFromTS({ id: item[0], name: item[1].name })}>
                        <img src={deleteBttn}></img>
                    </button>

                </div>);
        });
        return listItems;
    }

    render() {
        return (
            <div id='mytimesheet-container'>
                <div className='tabbed-list' >
                    {this.getTsItem()}
                </div>
            </div>
        );
    }
}

export default MyTimeSheets;