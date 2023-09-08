const jwt = require('jsonwebtoken');
require('dotenv').config();

const fetchall = (req, res, next) => {
    // get the user from the JWT token and add id to req object
    const usertoken = req.header("authUser");
    // get the app from the JWT token and add id to req object
    const apptoken = req.header("authTemple")
    

    if (!usertoken && !apptoken) {
        res.status(401).send({ error: "Please authenticate using a valid token" });
    }

    try {
        if (usertoken) {
            const data = jwt.verify(usertoken, process.env.JWT_SECRET);
            req.user = data.user;
        }
        if (apptoken) {
            const data = jwt.verify(apptoken, process.env.JWT_SECRET);
            req.app = data.app;
        }
       

        next();
    } catch (error) {
        res.status(401).send({ error: "Please authenticate using a valid user token" });
    }
}

module.exports = fetchall;