/*
This lambda retrives a timesheet from a DynamoDB table based on the on 
the a timesheet id passed on the URL as a query string
*/


const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient({
    region: 'us-east-1'
});

exports.handler = async (event) => {

    let timesheetId = event.queryStringParameters["ts"]; //get the timesheet id

    //validate the id
    if (timesheetId == "" || timesheetId.length < 32) {
        return { timesheetId: null, message: "invalid timesheet id" }
    }


    //the return/response object
    let writeResult = {
        timesheetId: null,
        message: ""
    };

    //prepare db query
    var params = {
        TableName: 'timesheets',
        Key: {
            "id": timesheetId
        },
    };

    //get the timesheet from d
    await ddb.get(params).promise().then(function (data) {
        writeResult.timesheetId = data.Item.id;
        writeResult.message = data.Item;
    }).catch(function (err) {
        writeResult.message = err;
    });

    return writeResult;

};
