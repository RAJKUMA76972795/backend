const jwt = require('jsonwebtoken');
require('dotenv').config();

const fetchuser = (req,res,next)=>{
    // get the user from the JWT token and add id to req object
    // console.log(req);
    const token = req.header("authUser");
    // console.log(token);
    if(!token){
        res.status(401).send({error:"Please authenticate using a valid user token"});
    }

    try {
        
        const data = jwt.verify(token,process.env.JWT_SECRET);
        // console.log(data);
        req.user = data.user;
        
        next();
    } catch (error) {
        res.status(401).send({error:"Please authenticate using a valid user token"});
    }
}

module.exports = fetchuser;