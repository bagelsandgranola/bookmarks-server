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

    it('GET /api/bookmarks responds with 200 and all the test bookmarks', () => {
        return supertest(app)
            .get('/api/bookmarks')
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .expect(200, testBookmarks)
    })

    it(`GET /api/bookmarks/:id resolves an article by id from 'bookmarks' table`, () => {
        const bookmarkId = 2
        const expectedBookmark = testBookmarks[bookmarkId -1]
        return supertest(app)
            .get(`/api/bookmarks/${bookmarkId}`)
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .expect(200, expectedBookmark)
    })

    it('DELETE /api/bookmarks/:bookmark_id responds with 204 and removes the article', () => {
        const idToRemove = 2
        const expectedBookmarks = testBookmarks.filter(bookmark => bookmark.id !== idToRemove)
        return supertest(app)
            .delete(`/api/bookmarks/${idToRemove}`)
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .expect(204)
            .then(() => 
                supertest(app)
                    .get(`/api/bookmarks`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(expectedBookmarks)
            )
    })

    describe.only(`PATCH /api/bookmarks/:bookmark_id`,() => {
     
        it(`responds with 204 and updates the article`, () => {
            const idToUpdate = 2
            const updatedBookmarkInfo = {
                title: 'updated title',
                url: 'https://updatedurl.com',
                description: 'updated description',
                rating: 5
            }
            const expectedBookmark = {
                ...testBookmarks[idToUpdate -1 ],
                ...updatedBookmarkInfo
            }
            return supertest(app)
                .patch(`/api/bookmarks/${idToUpdate}`)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .send(updatedBookmarkInfo)
                .expect(204)
                .then(res => 
                    supertest(app)
                    .get(`/api/bookmarks/${idToUpdate}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(expectedBookmark)
                    )
        })

        it(`responds with 400 when no fields are supplied`, () => {
            idToUpdate = 2
            return supertest(app)
            .patch(`/api/bookmarks/${idToUpdate}`)
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .send( {incorrectField: 'value'})
            .expect(400, {error: {message:'Request body must contain either title, description, url, or rating'}})
        })

        it(`responds with 204 when updating only a subset of fields`, () => {
            const idToUpdate = 2
            const updatedBookmarkInfo ={
                title: 'just the title',
            }
            const expectedBookmark = {
                ...testBookmarks[idToUpdate -1],
                ...updatedBookmarkInfo
            }
            return supertest(app)
                .patch(`/api/bookmarks/${idToUpdate}`)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .send({
                    ...updatedBookmarkInfo,
                    fieldToIgnore: 'should not be in GET response'
                })
                .expect(204)
                .then(res => 
                    supertest(app)
                    .get(`/api/bookmarks/${idToUpdate}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(expectedBookmark)
                )
        })

    })

})

context('Given there are NO bookmarks in the database', () => {

    it('GET /api/bookmarks responds with 404 and error message', () => {
        return supertest(app)
            .get('/api/bookmarks')
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .expect(200, [])
    })

    it(`GET /api/bookmarks/:id resolves an article by id from 'bookmarks' table`, () => {
        const bookmarkId = 233
        return supertest(app)
            .get(`/api/bookmarks/${bookmarkId}`)
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .expect(404, { error: { message: `Bookmark Not Found`}})
    })

    it(`POST /api/bookmarks creates an bookmark, responding with 201 and new bookmark`, () => {
        const newBookmark = {
            title: 'test new bookmark',
            url: 'http://google.com',
            description: 'test description',
            rating: 4
        }
        return supertest(app)
            .post('/api/bookmarks')
            .send(newBookmark)
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .expect(201)
            .expect(res => {
                expect(res.body.title).to.eql(newBookmark.title)
                expect(res.body.url).to.eql(newBookmark.url)
                expect(res.body.description).to.eql(newBookmark.description)
                expect(res.body.rating).to.eql(newBookmark.rating)
                expect(res.body).to.have.property('id')
                expect(res.headers.location).to.eql(`/api/bookmarks/${res.body.id}`)
            })
            .then(postRes => 
                supertest(app)
                    .get(`/api/bookmarks/${postRes.body.id}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(postRes.body)
            )
    })

    it('DELETE /api/bookmarks/:bookmark_id responds with 404 if article does not exist', () => {
        const idToRemove = 2
        return supertest(app)
            .delete(`/api/bookmarks/${idToRemove}`)
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .expect(404, { error: { message: 'Bookmark Not Found' }})
    })

    describe.only(`PATCH /api/bookmarks/:bookmark_id`,() => {
     
        it(`responds with 404`, () => {
            const bookmark_id = 123456
            return supertest(app)
                .patch(`/api/bookmarks/${bookmark_id}`)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(404, {error : {message: `Bookmark Not Found`}})
        })

    })

    describe('missing data when POSTing to /api/bookmarks', () => {
        it(`responds with 400 missing 'url' if not supplied`, () => {
            const newBookmark = {
                title: 'test new bookmark',
            // url: 'http://google.com',
                description: 'test description',
                rating: 4
            }
            return supertest(app)
                .post('/api/bookmarks')
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
                .post('/api/bookmarks')
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
                .post('/api/bookmarks')
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
            .get(`/api/bookmarks/${maliciousBookmark.id}`)
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .expect(200)
            .expect(res => {
                expect(res.body.title).to.eql('Naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;')
                expect(res.body.description).to.eql(`Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`)
            })
    })
})
})
