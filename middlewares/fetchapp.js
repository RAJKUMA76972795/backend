const jwt = require('jsonwebtoken');
require('dotenv').config();

const fetchapp = (req,res,next)=>{
    // get the user from the JWT token and add id to req object
    // console.log(req);
    const token = req.header("authTemple");
    // console.log(token);
    if(!token){
        res.status(401).send({error:"You are not allowed"});
    }

    try {
        
        const data = jwt.verify(token,process.env.JWT_SECRET);
        // console.log(data);
        req.app = data.app;
        
        next();
    } catch (error) {
        res.status(401).send({error:"You are not allowed"});
    }
}

module.exports = fetchapp;