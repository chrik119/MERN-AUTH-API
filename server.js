const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();

//Connect to Database
mongoose.connect(process.env.DATABASE, {
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    useCreateIndex: true
})
.then(() => console.log("DB CONNECTED"))
.catch((err) => console.log("DB CONNECTION ERROR: ", err));

//Import Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');

//App Middlewares ** ABOVE ROUTES **
app.use(morgan('dev'));    //displays server request logs in console
app.use(bodyParser.json());
//app.use(cors());           //allows all origins / can restrict which domains can access api
if(process.env.NODE_ENV = 'development'){
    app.use(cors({origin: `http://localhost:3000`}));
}

//Middleware
app.use('/api', authRoutes);
app.use('/api', userRoutes);


const port = process.env.PORT || 8000;
app.listen(port, () => {
    console.log(`API is Running on Port ${port} - ${process.env.NODE_ENV}`);
});