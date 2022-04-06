const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient({
    region: 'us-east-1'
});
const crypto = require('crypto');

/*
 * writes user's data to dynamodb
 * 
 * Reference: this code is based on functions on the AWS developer guide: Getting Started with Node.js and DynamoDB
 * https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GettingStarted.NodeJs.html
 * @author Muaad Alrawhani
 */


exports.handler = async (event, context) => {

    //the id token in JWT is *already* verified using the API Gatway authorizer
    //*before* calling this function. So we get the token from the header "Authorization" 
    //because its the token that verified the user and decode it to get the user info
    //user info are not sent directly, but only there token, which is first verified then
    //the user info is extracted
    let userJwt = event.Authorization;
    let userInfo = jwt.decode(userJwt);

    //***getting user's data
    if (event.body.getMyTimesheetsList == true) {
        let res = await getMyTsList(event, userInfo);
        //res.sendNotifications = false;
        return res;
    }


    //***processing timesheets***
    let validation = dataValidation(event);
    if (validation.status < 0) {
        return validation;
    }

    //create new timesheet on db
    //the return is timesheet id and a message, see createNewTtimeSheet()
    //TS == Timesheet
    //check if new timesheet. create one if needed
    let timesheetId = event.body.timesheetId;
    let writeResult_TS;

    //creating a new timesheet
    if (timesheetId == null && !event.body.deleteTs) {
        writeResult_TS = await createNewtimeSheet(event, userInfo, timesheetId);
        timesheetId = writeResult_TS.timesheetId;
        if (timesheetId == null) { //return writeResulr => error write to timesheets table
            return writeResult_TS;
        }
    } else {
        if (event.body.deleteTs) { //delete user from ts
            writeResult_TS = await deleteUserFromTimesheet(event, userInfo, timesheetId);
        } else {
            //update an existing timesheet with user's availability
            writeResult_TS = await updatetimeSheet(event, userInfo, timesheetId);
        }

        timesheetId = writeResult_TS.timesheetId;
        if (timesheetId == null) { //return writeResulr => error write to timesheets table
            return writeResult_TS;
        }

    }

    //if writes/update to timesheets was success, then add timesheet id to user-info table
    let writeResultUserInfo;
    if (event.body.deleteTs) {//delete ts from user profile
        writeResultUserInfo = await deleteTimesheetFromUser(event, userInfo, timesheetId);
    } else {//add ts to user profile
        writeResultUserInfo = await addTimesheetToUser(event, userInfo, timesheetId);
    }

    writeResultUserInfo["tsData"] = writeResult_TS.message;

    if (event.body.notify) {
        let emailContent = await getEmailContent(event, userInfo, writeResultUserInfo["tsData"], timesheetId);
        if (emailContent.Destination.length > 0) { //if there are verified recepients
            writeResultUserInfo.sendNotifications = emailContent;
        }
    }

    //the return is timesheet id, all user's timesheets and a message
    return writeResultUserInfo;

};

//create new timesheet
async function createNewtimeSheet(event, userInfo, timesheetId) {
    //create Timeshee tId
    timesheetId = Date.now() + "_" + userInfo.email;
    timesheetId = crypto.createHash('md5').update(timesheetId).digest('hex');

    //timesheet structure and params
    let userId = userInfo["cognito:username"];
    const timesheetsTableParams = {
        TableName: 'timesheets',
        Item: {
            id: timesheetId,
            timesheetName: event.body.timesheetName,
            tsUsers: {
                [userId]: {
                    userName: userInfo.name,
                    email: userInfo.email
                }
            },
            usersAvailability: {
                [userId]: event.body.availability
            }
        },
        ReturnValues: 'ALL_OLD'
    };

    //write timesheet to timesheets table
    let writeResult = {
        timesheetId: null,
        message: ""
    };

    await ddb.put(timesheetsTableParams).promise().then(function (data) {
        writeResult.timesheetId = timesheetId;
        writeResult.message = data;
    }).catch(function (err) {
        writeResult.message = err;
    });

    return writeResult;
}


//add a refrence of the timesheet to the user-info table
async function addTimesheetToUser(event, userInfo, timesheetId) {
    //writing data to user-info table
    const userInfoTableParams = {
        TableName: 'users-info',
        Key: {
            "id": userInfo["cognito:username"]
        },
        UpdateExpression: "SET timesheets.#tsId = :tsDetails",
        ExpressionAttributeNames: { "#tsId": timesheetId },
        ExpressionAttributeValues: {
            ':tsDetails': {
                "name": event.body.timesheetName,
                "timeStamp": Date.now()
            }
        },

        ReturnValues: 'ALL_NEW',
    };

    let writeResult = {
        timesheetId: null,
        message: ""
    };

    await ddb.update(userInfoTableParams).promise().then(function (data) {
        writeResult.timesheetId = timesheetId;
        writeResult.message = data;
    }).catch(function (err) {
        if (err.code == "ValidationException") {
            writeResult = createUserInfoForNewUser(event, userInfo, timesheetId);
        }
    });

    return writeResult;
}



//this method is called when the user first time creating creating timesheets
//it sets up there info into the user-info table
async function createUserInfoForNewUser(event, userInfo, timesheetId) {
    //writing data to user-info table
    let tsName = event.body.timesheetName;
    let tsObj = {
        [timesheetId]: {
            "name": tsName,
            "timeStamp": Date.now()
        }
    }
    const userInfoTableParams = {
        TableName: 'users-info',
        Item: {
            id: userInfo["cognito:username"],
            timesheets: tsObj
        },
        ReturnValues: 'ALL_OLD',
    };

    let writeResult = {
        timesheetId: null,
        message: { //this structure to match return objects from dynamodb
            Attributes: {
                timesheets: tsObj
            }
        }
    };

    await ddb.put(userInfoTableParams).promise().then(function (data) {
        writeResult.timesheetId = timesheetId;
    }).catch(function (err) {
        writeResult.message = err;
    });

    return writeResult;
}

//this function gets all my timesheet (I have created or a member of)
async function getMyTsList(event, userInfo) {

    var params = {
        TableName: "users-info",
        Key: { "id": userInfo["cognito:username"] },
    };

    let writeResult = {
        message: ""
    };

    await ddb.get(params).promise().then(function (data) {
        writeResult.message = data.Item;
    }).catch(function (err) {
        writeResult.message = err;
    });

    return writeResult;
}

function dataValidation(event) {
    let timesheetName = event.body.timesheetName;
    let result = {
        status: -1,
        timesheetId: null,
        message: "",
    };
    if ((timesheetName == "" || timesheetName == null) && !event.body.deleteTs) {
        result.message = "timesheet name was not provided";
        return result;
    }

    result.status = 1;
    return result;
}


//delete a timesheet from the user profile
async function deleteTimesheetFromUser(event, userInfo, timesheetId) {
    //writing data to user-info table
    const userInfoTableParams = {
        TableName: 'users-info',
        Key: {
            "id": userInfo["cognito:username"]
        },
        UpdateExpression: "REMOVE timesheets.#tsId",
        ExpressionAttributeNames: { "#tsId": timesheetId },

        ReturnValues: 'ALL_NEW',
    };

    let writeResult = {
        timesheetId: null,
        message: ""
    };

    await ddb.update(userInfoTableParams).promise().then(function (data) {
        writeResult.timesheetId = timesheetId;
        writeResult.message = data;
    }).catch(function (err) {
        writeResult.message = err;
    });

    return writeResult;
}

//delete the user from the timesheet
async function deleteUserFromTimesheet(event, userInfo, timesheetId) {

    const timesheetTableParams = {
        TableName: 'timesheets',
        Key: {
            "id": timesheetId
        },
        UpdateExpression: "REMOVE usersAvailability.#userId, tsUsers.#userId",
        ExpressionAttributeNames: { "#userId": userInfo["cognito:username"] },

        ReturnValues: 'ALL_NEW',
    };

    let writeResult = {
        timesheetId: null,
        message: ""
    };

    await ddb.update(timesheetTableParams).promise().then(function (data) {
        writeResult.timesheetId = timesheetId;
        writeResult.message = data;
    }).catch(function (err) {
        writeResult.message = err;
    });

    return writeResult;
}


//update data in timesheet
async function updatetimeSheet(event, userInfo, timesheetId) {

    const timesheetTableParams = {
        TableName: 'timesheets',
        Key: {
            "id": timesheetId
        },
        UpdateExpression: "SET usersAvailability.#userId = :availability, tsUsers.#userId = :userInfoObj",
        ExpressionAttributeNames: { "#userId": userInfo["cognito:username"] },
        ExpressionAttributeValues: {
            ":availability": event.body.availability,
            ":userInfoObj": {
                userName: userInfo.name,
                email: userInfo.email
            }
        },

        ReturnValues: 'ALL_NEW',
    };

    let writeResult = {
        timesheetId: null,
        message: ""
    };

    await ddb.update(timesheetTableParams).promise().then(function (data) {
        writeResult.timesheetId = timesheetId;
        writeResult.message = data;
    }).catch(function (err) {
        writeResult.message = err;
    });

    return writeResult;
}

//get the email content to be send as a notification to the users
async function getEmailContent(event, userInfo, writeResultUserInfo, timesheetId) {

    let emails = [];

    if (writeResultUserInfo.Attributes && writeResultUserInfo.Attributes.tsUsers) {//if there are other users
        //get all users emails in the timesheet
        for (const key in writeResultUserInfo.Attributes.tsUsers) {
            emails.push(writeResultUserInfo.Attributes.tsUsers[key].email.toLowerCase());
        }
    } else {
        emails = [userInfo.email.toLowerCase()]
    }


    //check which emails are verified
    var params = {
        Identities: emails
    };

    let verifiedEmails = []
    await new AWS.SES().getIdentityVerificationAttributes(params).promise().then(
        function (data) {
            for (const key in data["VerificationAttributes"]) {
                if (data["VerificationAttributes"][key]["VerificationStatus"] === "Success") {
                    verifiedEmails.push(key.toLowerCase());
                }
            }
        }).catch(
            function (err) {
                console.log(err);
            });


    return {
        "Destination": verifiedEmails
        ,
        "Message": `<p>Hello,</p> <p><strong>${userInfo.name}</strong> made changes to the timeesheet <strong> ${event.body.timesheetName}.</strong></p>
                    <a href='http://meetingsbucket.s3-website-us-east-1.amazonaws.com/timesheet?ts=${timesheetId}' + >Click here to go to the timesheet</a> <p>Thank you,
                    <br> Sweet Cloud</p>`,
        "Subject": "Timesheet was Updated"
    }
}
