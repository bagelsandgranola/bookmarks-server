const { expect } = require('chai')
const knex = require('knex')
const app = require('../src/app')
const { makeBookmarksArray } = require('./bookmarks.fixtures')

describe.only('Bookmark Endpoints', function() {
    let db 

    before('make knex instance', () => {
        db = knex({
            client: 'pg',
            connection: process.env.TEST_DB_URL,
        })
        app.set('db', db)
    })
    

after('disconnect from db', () => db.destroy())

beforeEach('clean the table', () => db('bookmarks').truncate())


afterEach('cleanup', () => db('bookmarks').truncate())

context('Given there are bookmarks in the database', () => {
    const testBookmarks = makeBookmarksArray()

    beforeEach('insert articles', () => {
        return db
            .into('bookmarks')
            .insert(testBookmarks)
    })

    it('GET /bookmarks responds with 200 and all the test bookmarks', () => {
        return supertest(app)
            .get('/bookmarks')
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .expect(200, testBookmarks)
    })

    it(`GET /bookmarks/:id resolves an article by id from 'bookmarks' table`, () => {
        const bookmarkId = 2
        const expectedBookmark = testBookmarks[bookmarkId -1]
        return supertest(app)
            .get(`/bookmarks/${bookmarkId}`)
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .expect(200, expectedBookmark)
    })
})

context('Given there are NO bookmarks in the database', () => {

    it('GET /bookmarks responds with 404 and error message', () => {
        return supertest(app)
            .get('/bookmarks')
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .expect(200, [])
    })

    it(`GET /bookmarks/:id resolves an article by id from 'bookmarks' table`, () => {
        const bookmarkId = 233
        return supertest(app)
            .get(`/bookmarks/${bookmarkId}`)
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .expect(404, { error: { message: `Bookmark Not Found`}})
    })
})
})