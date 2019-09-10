function makeBookmarksArray( ) {
    return [
        {
            id: 1,
            title: 'Google', 
            url: 'http://google.com',
            description: 'An indie search engine startup', 
            rating: 4
        },
        {
            id: 2,
            title: 'Facebook', 
            url: 'http://facebook.com',
            description: 'everyone you went to highschool with', 
            rating: 4
        },
        {
            id: 3,
            title: 'LinkedIn', 
            url: 'http://linkedin.com',
            description: 'brag about your accomplishments', 
            rating: 1
        },
        {
            id: 4,
            title: 'Thinkful', 
            url: 'http://thinkful.com',
            description: 'great place to learn', 
            rating: 2
        },
    ];
}

module.exports = {
    makeBookmarksArray,
}