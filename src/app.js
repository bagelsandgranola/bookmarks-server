require ('dotenv').config()
const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const helmet = require('helmet')
const { NODE_ENV } = require('./config')
const winston = require('winston');
//const { bookmarks } = require('../src/store')
const uuid = require('uuid/v4');

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

const bookmarks = [{
    id: '8sdfbvbs65sd',
    title: 'Google',
    url: 'http://google.com',
    desc: 'An indie search engine startup',
    rating: 4
}];

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

//test
app.get('/', (req, res) => {
        res.send('hello world!')
});

//returns a list of bookmarks
app.get('/bookmarks', (req, res) => {
    res
        .json(bookmarks);
});

// returns a single bookmark with the given ID, 
//return 404 Not Found if the ID is not valid
app.get('/bookmarks/:id', (req, res) => {

    const { id } = req.params;
    const bookmark = bookmarks.find(b => b.id == id);

    //make sure we found a bookmark
    if (!bookmark) {
        logger.error(`Card with id ${id} not found.`)
        return res
            .status(404)
            .send('Card Not Found')
    }

    res
        .json(bookmark);

})

//POST /bookmarks accepts a JSON object representing a bookmark 
//and adds it to the list
app.post('/bookmarks', (req, res) => {

    const { title, url, desc, rating} = req.body;

    //validate 

    if (!title) {
        logger.error(`Title is required`);
        return res 
            .status(400)
            .send('Invalid data');
    }

    if (!url) {
        logger.error(`url is required`);
        return res 
            .status(400)
            .send('Invalid data');
    }

    if (!desc) {
        logger.error(`description is required`);
        return res 
            .status(400)
            .send('Invalid data');
    }

    if (!rating) {
        logger.error(`rating is required`);
        return res 
            .status(400)
            .send('Invalid data');
    }

    const id = uuid();

    const bookmark = {
        id,
        title,
        url,
        desc,
        rating
    };

    bookmarks.push(bookmark);
    logger.info(`Card with id ${id} created`);

    res
        .status(201)
        .location(`http://localhost:8000/bookmarks/${id}`)
        .json(bookmark)
})

//DELETE /bookmarks/:id deletes bookmark with a given id 
app.delete('/bookmarks/:id', (req, res) => {

    const { id } = req.params;

    const bookmarkIndex = bookmarks.findIndex(b => b.id == id);

    if (bookmarkIndex === -1) {
        logger.error(`Bookmark with id ${id} not found. `);
        return res
            .status(404)
            .send('Not Found');
    }

    bookmarks.splice(bookmarkIndex, 1);

    logger.info(`Bookmark with id ${id} deleted.`);
    res
        .status(204)
        .end();

})


module.exports = app


