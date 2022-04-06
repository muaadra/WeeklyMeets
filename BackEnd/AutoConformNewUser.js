//reference: This code is based on: Pre sign-up Lambda trigger
//https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-sign-up.html


// Copyright 2010-2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// 
// This file is licensed under the Apache License, Version 2.0 (the "License").
// You may not use this file except in compliance with the License. A copy of
// the License is located at
// 
// http://aws.amazon.com/apache2.0/
// 
// This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
// CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.


const AWS = require('aws-sdk');


exports.handler = (event, context, callback) => {

    // Confirm the user
    event.response.autoConfirmUser = true;

    // Set the email as verified if it is in the request
    if (event.request.userAttributes.hasOwnProperty("email")) {
        event.response.autoVerifyEmail = true;
    }



    addUserEmailToSES(event.request.userAttributes.email)

    // Return to Amazon Cognito
    callback(null, event);
};

function addUserEmailToSES(email) {


    //check which emails are verified
    var params = {
        EmailAddress: email
    };

    new AWS.SES().verifyEmailAddress(params).promise();
}