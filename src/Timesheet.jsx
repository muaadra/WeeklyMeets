import React from "react";
import "./Styles/Calendar.css";
import TimeSlot from "./Components/TimeSlot";
import cloudIcon from './Images/CloudUpload.svg';

/**
 * This component represents the timesheet
 * important functions:
 * getTimesheetData()
 * createSelectionSlots()
 * addOtherstoTimeSheet()
 * updateSlotRangeHighlight()
 * 
 * @author Muaad Alrawhani
 */


class Timesheet extends React.Component {
  days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  dayBeingScheduled = {}; //the day currently being selected by the user
  calendarSlots = {};
  timeCol = [];
  originalSelectedSlots = {}//downloaded slos or after saving. used to detect changes in ts 
  usersAvailability = {};

  timeInterval = [8, 17];
  currenUserId = "";
  loadingIcon = require("./Images/Loading.gif");

  /**
   * intialize the timesheet. create the time column and timesheet slots
   */
  constructor(props) {
    super(props);

    this.state = {
      timeCol: [],
      calendarSlots: {},
      signedIn: false,
      SelectedTimeSlots: SelectedTimeSlots,
      Loading: false,
      shouldSave: false,
    };

    //create the time column
    this.state.timeCol = this.createTimeColumn();
    this.timeCol = this.state.timeCol;

    //create the time slots
    this.state.calendarSlots = this.createSelectionSlots();
    this.calendarSlots = this.state.calendarSlots;
    this.addOtherstoTimeSheet(this.calendarSlots); //add other members to the timeslot
    this.setCurrentSlotSelectionAsOriginal(); //makes copy of all timeslots to keep track of changes
  }


  /**
   * show the availability of other on the timesheet
   */
  addOtherstoTimeSheet(calendarSlots) {
    //assign colors
    if (tsData) {
      let colorCount = 0;
      for (const user in tsData.tsUsers) {
        tsData.tsUsers[user].color = "#" + colorPallet[colorCount++];
      }
    } else {
      return;
    }

    //add other users to sheet
    for (const [user, week] of Object.entries(this.usersAvailability)) {
      for (const [day, timeSlots] of Object.entries(week)) {
        for (let j = 0; j < timeSlots.length; j++) {
          //add users to ts
          let slotIndex = timeSlots[j] - this.timeInterval[0] * 4;
          if (calendarSlots[day][slotIndex] != null) {
            calendarSlots[day][slotIndex].others.push({
              user,
              color: tsData ? tsData.tsUsers[user].color : "#FFF",
              userName: tsData.tsUsers[user].userName,
            });
          }
        }
      }
    }
  }

  /**
   * find the earliest and the latest active timeslot on the timesheet
   * so the timesheet interval can be adjusted to show these timeslots
   */
  getminMaxHoursonTimesheet() {
    this.minMaxTime = [Infinity, 0];
    for (let user in this.usersAvailability) {
      for (let day in this.usersAvailability[user]) {
        for (let j = 0; j < this.usersAvailability[user][day].length; j++) {
          //find min max interval on ts
          let val = this.usersAvailability[user][day][j];
          if (val < this.minMaxTime[0]) this.minMaxTime[0] = val;
          if (val > this.minMaxTime[1]) this.minMaxTime[1] = val;

        }
      }
    }
  }

  /**
   * check if there has been any changes to the timesheet, if yes make the "save"
   * button green. this is also used to warn the user before leaving an unsaved timesheet
   */
  checkIfChangesMadeToTimesheet() {
    let found = false;
    for (let day of this.days) {
      if (SelectedTimeSlots[day].length != this.originalSelectedSlots[day].length) {
        found = true;
        break;
      }
      for (let i = 0; i < this.originalSelectedSlots[day].length; i++) {
        if (!SelectedTimeSlots[day].includes(this.originalSelectedSlots[day][i])) {
          found = true;
          break;
        }
      }
    }
    this.setState({ shouldSave: found }); //there is no change in ts
    return found;
  }

  componentDidMount() {
    this.isCompMounted = true;
    this.getTimesheetData();
  }

  /**
   * retrieve timesheet from backend and show on screen
   */
  getTimesheetData() {

    //getting a timesheet is based on URL
    let timesheedtId = window.location.href.split(
      window.location.origin + window.location.pathname + "?ts="
    );

    if (timesheedtId.length > 1 && timesheedtId[1].length == 32) {
      let getTsURL =
        "https://0ix7wmhxze.execute-api.us-east-1.amazonaws.com/timesheet?ts=" +
        timesheedtId[1];

      //fetch timesheet
      this.fetchTimesheetDataAndShowInfoOnView(getTsURL);
    } else if (timesheedtId[1]) {
      //if there is ts id but not correct length
      alert("error in timesheet link make sure you have the correct link");
    }
  }

  /**
  * a helper method that fetches the time sheet based on its id
  */
  fetchTimesheetDataAndShowInfoOnView(getTsURL) {
    this.showLoading(true, "Loading...");

    fetch(getTsURL)
      .then((response) => response.json())
      .then((data) => {
        this.showLoading(false);
        if (data.timesheetId != null && data.timesheetId.length == 32) {
          this.usersAvailability = data.message.usersAvailability;
          tsData = data.message;
          //change timesheet time frame
          this.getminMaxHoursonTimesheet();
          let from = Math.trunc(this.minMaxTime[0] / 4);
          let to = Math.ceil(Math.trunc(this.minMaxTime[1] / 4) + 1);
          this.changeTimeInterval(
            from < this.timeInterval[0] ? from : this.timeInterval[0],
            to > this.timeInterval[1] ? to : this.timeInterval[1]
          );

          //get current user timeslots
          this.toggleMyTimeslotsViewToSignInOrUp();

          //show data on timesheet
          this.refreshTimesheet();
          this.props.app.showTsDataOnView(data);
        } else {
          alert("error in timesheet Id " + JSON.stringify(data.message));
        }
      });
  }

  /**
  * when the user signes out the timeslot view changes to show a dot representing the 
  * availabilty of the user instead of a higlighted slot  
  */
  toggleMyTimeslotsViewToSignInOrUp() {
    //if
    let userInfo = this.props.app.state.user;
    let userid = userInfo != null ? userInfo.username : null;
    if (userid != null) {
      this.currenUserId = userid;
      let currentUserTimesSlots = this.usersAvailability[userid];
      if (currentUserTimesSlots && Object.keys(currentUserTimesSlots > 0)) {
        createNewTimeSlots();
        SelectedTimeSlots = this.usersAvailability[userid];
        //making a copy for later detecting changes in timesheet
        this.setCurrentSlotSelectionAsOriginal();//makes copy of all timeslots to keep track of changes

        delete this.usersAvailability[userid];
        this.setState({ SelectedTimeSlots });
      }
    } else {
      //this.usersAvailability[this.props.app.userInfo.userId] = SelectedTimeSlots;
      createNewTimeSlots();
      this.setState({ SelectedTimeSlots });
    }
  }

  /**
  * make a copy of all timeslots. this is used to detect if there has been change to 
  * the time sheet  
  */
  setCurrentSlotSelectionAsOriginal() {
    this.originalSelectedSlots = JSON.parse(JSON.stringify(SelectedTimeSlots));
    if (this.isCompMounted) this.setState({ shouldSave: false }); //nothing to save yet
  }

  /**
  * create the time column in the timesheet
  */
  createTimeColumn() {
    let timeCol = [];
    let dayDiv = " AM";
    let interv = this.timeInterval[1] - this.timeInterval[0];
    let offset = this.timeInterval[0];
    for (let i = 0; i < interv * 2; i++) {
      let className = "time-elem";

      let time = offset + i / 2;
      if (time >= 12) {
        dayDiv = " PM";
      }

      time = time % 12;
      if (time == 0) {
        time = 12;
      }

      if (time != Math.floor(time)) {
        time = Math.floor(time) + ":30 " + dayDiv;
        className += " time-elem-30 time-top-border";
      } else {
        time = time + ":00 " + dayDiv;
        className += " time-bttm-border slot-bttm-border";
      }

      timeCol.push(
        <div key={i + this.timeInterval[0]} className={className}>
          <div>{time}</div>
        </div>
      );
    }
    return timeCol;
  }


  /**
  * create the timeslots of the timesheet
  */
  createSelectionSlots() {
    let timeSlots = [];
    this.days.forEach((day) => {
      const arr = [];
      for (
        let i = this.timeInterval[0] * 4;
        i < this.timeInterval[1] * 4;
        i++
      ) {
        //each slot is 15min => 96 slot per day
        arr.push({
          day: [day],
          index: i,
          selected: SelectedTimeSlots[day].includes(i),
          others: [], //other memebrs on this slot
        });
      }
      timeSlots[day] = arr;
    });

    return timeSlots;
  }

  /**
  * to flag the day being currently selected on the timesheet.
  * used so thet the user cannot highlight multiple days at once on the timesheet
  */
  setSelectionDay(selectedDay) {
    this.dayBeingScheduled = selectedDay;
  }

  /**
  * get the day currently being selected
  */
  getSelectionDay() {
    return this.dayBeingScheduled;
  }

  /**
  * called when the user changes the time interval of the timesheet
  */
  changeTimeInterval = (from, to) => {
    if (from) {
      this.timeInterval[0] = from;
      document.getElementById("time-from").value = from;
      this.timeInterval[1] = to;
      document.getElementById("time-to").value = to % 12;
    } else {
      this.timeInterval[0] = Number(document.getElementById("time-from").value);
      this.timeInterval[1] = Number(document.getElementById("time-to").value) + 12;
      if (this.timeInterval[0] == 12) {
        this.timeInterval[0] = 0;
      }
    }

    this.refreshTimesheet();
  };

  /**
  * recreates the timesheet 
  */
  refreshTimesheet() {
    let timeCol = this.createTimeColumn();
    let timeSlots = this.createSelectionSlots();
    this.addOtherstoTimeSheet(timeSlots);

    this.setState({ timeCol, calendarSlots: timeSlots });
  }

  /**
   * show the "loading" message
   */
  loadingMessage = "Loading...";
  showLoading(show, mssg) {
    this.loadingMessage = mssg;
    this.setState({ Loading: show });
  }

  /**
   * when mouse is up after a slection, get the selected timeslots arrays
   */
  updateSelectedTimeSlots() {
    this.checkIfChangesMadeToTimesheet();
    this.slotSlectionRange = [-1, -1];
  }

  highlightSelection = false;
  slotSlectionRange = [-1, -1];
  /**
   * handles the selection of a range of timeslots. 
   */
  updateSlotRangeHighlight(firstClick, slotInf) {
    if (firstClick) {
      this.slotSlectionRange[0] = slotInf.index;
      this.highlightSelection = slotInf.selected;
    }

    if (this.slotSlectionRange[1] == -1) {
      this.slotSlectionRange[1] = this.slotSlectionRange[0];
    } else {
      this.slotSlectionRange[1] = slotInf.index;
    }

    let tempRange = this.state.SelectedTimeSlots[this.getSelectionDay()[0]];
    let highest = Math.max(
      this.slotSlectionRange[0],
      this.slotSlectionRange[1]
    );
    let lowest = Math.min(this.slotSlectionRange[0], this.slotSlectionRange[1]);

    for (let i = lowest; i <= highest; i++) {
      if (this.highlightSelection) {
        if (!tempRange.includes(i)) {
          tempRange.push(i);
        }
      } else {
        let index = tempRange.indexOf(i);
        if (index > -1) {
          tempRange.splice(index, 1);
        }
      }
    }

    let SelectedTimeSlots = this.state.SelectedTimeSlots;
    SelectedTimeSlots[this.getSelectionDay()[0]] = tempRange;

    this.setState({ SelectedTimeSlots });
  }


  /**
   * to update timesheet view
   * the view of timeslots changes based on whether they are signed in (higlighted)
   * or signed out (timeslot is viewed like other users)
   */
  updateTsView() {
    if (this.props.app.state.timesheetIdOnView != null) {
      this.toggleMyTimeslotsViewToSignInOrUp();
      this.refreshTimesheet();
    }
  }

  render() {
    return (
      <div>
        <div id="timesheet-header">
          <div className="tsName">
            <input id="tsName" className="text-input"
              type="text" placeholder="Enter Timesheet Title here..."
              defaultValue={
                this.props.app.state.timesheetNameOnView == null ? "" : this.props.app.state.timesheetNameOnView}
              readOnly={this.props.app.state.timesheetIdOnView ? true : false} />

            <div id='savebttn'>
              <button onClick={() => this.props.app.saveTimesheet(SelectedTimeSlots)}
                className={(this.state.shouldSave) ? "button green" : "button grey"}
                disabled={this.state.Loading}> Save
                <img src={cloudIcon}></img></button>

              <label id="notify-cont" title="Notify others of changes to the timesheet">
                <input type="checkbox" id="Notify" /> Send Notifications
              </label>
            </div>

          </div>
          <div id="time-interval">
            <label>
              From
              <select
                id="time-from"
                onChange={() => this.changeTimeInterval()}
                defaultValue={this.timeInterval[0]}
              >
                {[...Array(12).keys()].map((i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
              AM
            </label>

            <label>
              To
              <select
                id="time-to"
                onChange={() => this.changeTimeInterval()}
                defaultValue={this.timeInterval[1] % 12}
              >
                {[...Array(12).keys()].map((i) => (
                  <option key={i + 1 + "t"} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
              PM
            </label>
          </div>


        </div>

        <div id="calander-container-p">
          <div className="calander-container">
            <div className="slot-heading">Time</div>
            <div className="slot-heading">Su</div>
            <div className="slot-heading">Mo</div>
            <div className="slot-heading">
              Tu
              {this.state.Loading ? (
                <div className="loading-bar">
                  <img src={this.loadingIcon} alt="Loading icon" />
                  {this.loadingMessage}
                </div>
              ) : null}
            </div>
            <div className="slot-heading">We</div>
            <div className="slot-heading">Th</div>
            <div className="slot-heading">Fr</div>
            <div className="slot-heading">Sa</div>

            <div id="time" className="time-col">
              {this.state.timeCol}
            </div>

            {this.days.map((day) => (
              <div key={day} id={day} className="day-col">
                {this.state.calendarSlots[day].map((slot) => (
                  <TimeSlot
                    key={slot.index + slot.day} id={slot.index + slot.day}
                    selected={this.state.SelectedTimeSlots[slot.day].includes(slot.index)}
                    myInfo={slot} setSelectionDay={(day) => this.setSelectionDay(day)}
                    getSelectionDay={() => this.getSelectionDay()}
                    calendar={this} app={this.props.app}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

      </div>
    );
  }
}

//the current user higlighted/selected time slots
let SelectedTimeSlots;
createNewTimeSlots();

function createNewTimeSlots() {
  SelectedTimeSlots = {
    Sunday: [],
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
  };
}
let colorPallet = [
  "0a9396",
  "ee9b00",
  "99d98c",
  "1e6091",
  "a4133c",
  "006d77",
  "8338ec",
  "ffbe0b",
  "3a86ff",
  "d90429",
  "98c1d9",
  "403d39",
  "55a630",
  "571089",
];

let tsData;

document.mouseIsDown = false;
document.body.onmousedown = function () {
  document.mouseIsDown = true;
};

document.body.onmouseup = function () {
  document.mouseIsDown = false;
};
let usersOnSlot = document.createElement("div");

export { tsData };
export { colorPallet };
export { createNewTimeSlots };
export { SelectedTimeSlots };
export default Timesheet;
