require ('dotenv').config()
const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const helmet = require('helmet')
const { NODE_ENV } = require('./config')
const winston = require('winston');
const uuid = require('uuid/v4');

const bookmarksRouter = require('./bookmarks/bookmarks-router')

const app = express()
const morganOption = (NODE_ENV === 'production')
    ? 'tiny'
    : 'common';

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'info.log'})
    ]
});

if (NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

app.use(morgan(morganOption))
app.use(cors())
app.use(helmet())
app.use(express.json());

app.use(function errorHandler(error, req, res, next) {
    let response
        if (NODE_ENV === 'production') {
         response = { error: { message: 'server error' } }
       } else {
         console.error(error)
         response = { message: error.message, error }
       }
       res.status(500).json(response)
     })

app.use(function validateBearerToken(req, res, next) {
        const apiToken = process.env.API_TOKEN
        const authToken = req.get('Authorization')
        
        if (!authToken || authToken.split(' ')[1] !== apiToken) {
            logger.error(`Unauthorized request to path: ${req.path}`);
            return res.status(401).json({error: 'Unauthorized request' })
        }
        //move to the next middleware
        next()
    })   

app.use('/api/', bookmarksRouter)

module.exports = app


