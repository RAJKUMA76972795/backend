const connectToMongo = require("./db");
var cors = require("cors");
// var bodyParser = require('body-parser')


connectToMongo();

const express = require('express')
const app = express()
const port = process.env.PORT ||5000;
// app.use(bodyParser.urlencoded({ extended: false }))  // for form-encode
app.use(cors());
// to use request.body we need to use below middileware
app.use(express.json());

// app.use("/static",express.static("images") )
app.use("/static",express.static("static") )
// available routes
app.use("/api/user",require('./routes/user'));
app.use("/api/blog",require('./routes/blog'));
app.use("/api/welcome",require('./routes/welcome'));
app.use("/api/temple",require('./routes/temple'));
app.use("/api/support",require('./routes/support'));
app.use("/api/direction",require('./routes/direction'));
app.use("/api/hotel",require('./routes/hotel'));
app.use("/api/puja",require('./routes/puja'));
app.use("/api/blueprint",require('./routes/bluePrint'));
app.use("/api/nearby",require('./routes/nearby'));
app.use("/api/dailyfeed",require('./routes/dailyFeed'));
app.use("/api/store",require('./routes/store'));
app.use("/api/committee",require('./routes/committee'));
app.use("/api/timing",require('./routes/timing'));
app.use("/api/additionalinfo",require('./routes/additionalInfo'));
app.use("/api/updateversion",require('./routes/updateVersion'));
app.use("/api/pushtopic",require('./routes/pushTopic'));
app.use("/api/post",require('./routes/post'));
app.use("/api/postmoderator",require('./routes/postModerator'));





app.listen(port, () => {
    console.log(`mandhiram listening on port http://localhost:${port}`)
  })