const express = require('express')
const BookmarksService = require('./bookmarks-service')
const logger = require('../logger')
const bookmarksRouter = express.Router()
const jsonParser = express.json()
const xss = require('xss')

const serializeBookmark = bookmark => ({
    id: bookmark.id,
    title: xss(bookmark.title),
    url: bookmark.url,
    description: xss(bookmark.description),
    rating: bookmark.rating
})

bookmarksRouter
    .route('/bookmarks')
    .get((req, res, next) => {
    const knexInstance = req.app.get('db')
    BookmarksService.getBookmarks(knexInstance)
        .then(bookmarks => {
            res.json(bookmarks.map(serializeBookmark))
        })
        .catch(next)
    })
    .post(jsonParser, (req, res, next) => {
        const { title, url, description, rating} = req.body;

    //validate 

    if (!title) {
        logger.error(`Title is required`);
        return res 
            .status(400)
            .send({
                error: {message: `'title' is required`}
            })
    }

    if (!url) {
        logger.error(`url is required`);
        return res 
            .status(400)
            .send({
                error: {message: `'url' is required`}
            })
    }

    if (!rating) {
        logger.error(`rating is required`);
        return res 
            .status(400)
            .send({
                error: {message: `'rating' is required`}
            })
    }

    const ratingNum = Number(rating)

    if (ratingNum < 0 || ratingNum > 5) {
        logger.error(`Invalid rating '${rating} supplied`)
        return res
            .status(400)
            .send({
                error: { message: `rating must be a number between 0 and 5`}
            })
    }

    const newBookmark = {
        title,
        url,
        description,
        rating
    };

    BookmarksService.insertBookmark(
        req.app.get('db'),
        newBookmark
    )
        .then(bookmark => {
            res
                .status(201)
                .location(`/bookmarks/${bookmark.id}`)
                .json(serializeBookmark(bookmark))
        })
        .catch(next)
})

bookmarksRouter
    .route('/bookmarks/:bookmark_id')
    .all((req, res, next) => {
    const knexInstance = req.app.get('db')
    const { bookmark_id } = req.params;

    BookmarksService.getById(knexInstance, bookmark_id)
        .then(bookmark => {
            //make sure we found a bookmark
            if (!bookmark) {
                return res
                    .status(404)
                    .json({
                        error: { message: `Bookmark Not Found`}
                    })
            }
            res.bookmark = bookmark
            next()
        })
        .catch(next)
    })
    .get((req, res, next) => {
        res.json(serializeBookmark(res.bookmark))
    })
    .delete((req, res, next) => {
        const knexInstance = req.app.get('db')
        const { bookmark_id } = req.params
        BookmarksService.deleteBookmark(knexInstance, bookmark_id)
        .then(numRowsAffected => {
            res.status(204).end()
        })
        .catch(next)
        
    })


module.exports = bookmarksRouter