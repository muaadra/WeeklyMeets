import React, { useState } from 'react';
import MyTimeSheets from './MyTimeSheets';
import UsersList from './UsersList';

/**
 * This component represents the right side section when the user is signed in.
 * it shows the "My timesheets" list and the "timesheet memebers" list
 * @author Muaad Alrawhani
 */


function Dashboard(props) {
    const [toggleTsTab, setToggleTsTab] = useState(true);
    return (
        <div className='right-side' >
            {/* link to timesheet */}
            <div className='timesheet-link highlight-A'>
                <div>Link:</div>
                <input id='timesheet-link-Txt' className='text-input' onClick={e => e.target.select()}
                    readOnly value={props.appState.timesheetIdOnView == null ? "..." :
                        (window.location.origin + "/timesheet?ts=" + props.appState.timesheetIdOnView)} />
            </div>

            {/* toggling between "my timesheets" and "timesheet members" lists */}
            <div id='members-myts-container'>
                <div className='tab-container'>
                    <button className={toggleTsTab ? "tab" : "tab-off"} onClick={() => setToggleTsTab(!toggleTsTab)}>
                        Members
                    </button>
                    <button className={!toggleTsTab ? "tab" : "tab-off"} onClick={() => setToggleTsTab(!toggleTsTab)}>
                        Timesheets
                    </button>
                </div>
                {toggleTsTab ?
                    <div>
                        <UsersList appState={props.appState} />
                    </div> :
                    <div>
                        <MyTimeSheets appState={props.appState} app={props.app} />
                    </div>
                }
                <button id='new-sheet-bttn' onClick={() => props.app.createNewTimesheet()} className="button blue">New Timesheet</button>
            </div>

        </div>
    );

}

export default Dashboard;