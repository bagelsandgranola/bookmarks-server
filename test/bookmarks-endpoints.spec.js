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

    it('DELETE /bookmarks/:bookmark_id responds with 204 and removes the article', () => {
        const idToRemove = 2
        const expectedBookmarks = testBookmarks.filter(bookmark => bookmark.id !== idToRemove)
        return supertest(app)
            .delete(`/bookmarks/${idToRemove}`)
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .expect(204)
            .then(() => 
                supertest(app)
                    .get(`/bookmarks`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(expectedBookmarks)
            )
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

    it(`POST /bookmarks creates an bookmark, responding with 201 and new bookmark`, () => {
        const newBookmark = {
            title: 'test new bookmark',
            url: 'http://google.com',
            description: 'test description',
            rating: 4
        }
        return supertest(app)
            .post('/bookmarks')
            .send(newBookmark)
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .expect(201)
            .expect(res => {
                expect(res.body.title).to.eql(newBookmark.title)
                expect(res.body.url).to.eql(newBookmark.url)
                expect(res.body.description).to.eql(newBookmark.description)
                expect(res.body.rating).to.eql(newBookmark.rating)
                expect(res.body).to.have.property('id')
                expect(res.headers.location).to.eql(`/bookmarks/${res.body.id}`)
            })
            .then(postRes => 
                supertest(app)
                    .get(`/bookmarks/${postRes.body.id}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(postRes.body)
            )
    })

    it('DELETE /bookmarks/:bookmark_id responds with 404 if article does not exist', () => {
        const idToRemove = 2
        return supertest(app)
            .delete(`/bookmarks/${idToRemove}`)
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .expect(404, { error: { message: 'Bookmark Not Found' }})
    })

    describe('missing data when POSTing to /bookmarks', () => {
        it(`responds with 400 missing 'url' if not supplied`, () => {
            const newBookmark = {
                title: 'test new bookmark',
            // url: 'http://google.com',
                description: 'test description',
                rating: 4
            }
            return supertest(app)
                .post('/bookmarks')
                .send(newBookmark)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(400, {
                    error: {message: `'url' is required`}
                })
        })

        it(`responds with 400 missing 'title' if not supplied`, () => {
            const newBookmark = {
                // title: 'test new bookmark',
                url: 'http://google.com',
                description: 'test description',
                rating: 4
            }
            return supertest(app)
                .post('/bookmarks')
                .send(newBookmark)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(400, {
                    error: {message: `'title' is required`}
                })
        })

        it(`responds with 400 invalid rating if not between 0-5`, () => {
            const newBookmark = {
                title: 'test new bookmark',
                url: 'http://google.com',
                description: 'test description',
                rating: 100
            }
            return supertest(app)
                .post('/bookmarks')
                .send(newBookmark)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(400, {
                    error: {message: `rating must be a number between 0 and 5`}
                })
        })
    })
})

context(`Given an XSS attack article`, () => {
    const maliciousBookmark = {
        id: 911,
        title: 'Naughty <script>alert("xss");</script>',
        url: 'http://google.com',
        description: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`,
        rating: 4
    }

    beforeEach('insert malicious article', () => {
        return db
            .into('bookmarks')
            .insert([maliciousBookmark])
    })

    it('removes XSS attack content', () => {
        return supertest(app)
            .get(`/bookmarks/${maliciousBookmark.id}`)
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .expect(200)
            .expect(res => {
                expect(res.body.title).to.eql('Naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;')
                expect(res.body.description).to.eql(`Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`)
            })
    })
})
})