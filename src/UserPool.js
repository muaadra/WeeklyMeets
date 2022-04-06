import { CognitoUserPool } from "amazon-cognito-identity-js"
const poolData = {
    UserPoolId: "us-east-1_UDFiu3Xe0",
    ClientId: "2eprasu5245jpp0o8rm4fthu56"
}

export default new CognitoUserPool(poolData);