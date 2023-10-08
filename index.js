require('dotenv').config()
const express = require('express');
const axios = require('axios');
const _ = require('lodash');

const port = 8000;

const app = express();

// cache options
const cacheOptions = {
    max: 100,
    length: (n) => n.length,
    maxAge: 60000
}

// cache for analytics result
const analyticsCache = new _.memoize.Cache(cacheOptions);

// chache for search query result
const searchCache = new _.memoize.Cache(cacheOptions);




app.get('/api/blog-stats', async (req, res) => {
    try {
        // if chache analytics result exist
        if (analyticsCache.has('analytics')) {
            const cachedAnalytics = analyticsCache.get('analytics');
            return res.json(cachedAnalytics);
        }

        const response = await axios.get('https://intent-kit-16.hasura.app/api/rest/blogs', {
            headers: {
                'x-hasura-admin-secret':process.env.SECRET_KEY 
            }
        })
        const blogData = response.data.blogs;

        // analytics using lodash

        const totalBlogs = blogData.length;
        //find blog with longest title
        const blogWithLongestTitle = _.maxBy(blogData, (blog) => blog.title.length);
        // find blog with privacy title
        const blogsWithPrivacyTitle = _.filter(blogData, (blog) => {
            _.includes(_.toLower(blog.title), 'privacy').length;

        })
        // find blogs with unique title
        const blogWithUniqueTitle = _.uniqBy(blogData, 'title').map((blog) => blog.title);

        const result = {
            totalBlogs,
            blogWithLongestTitle,
            blogsWithPrivacyTitle,
            blogWithUniqueTitle
        }

        // store analytics result in cache
        analyticsCache.set('analytics', result);



        res.json(result);



    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'An error occured while fetching and analysing blogs data' });
    }

})


app.get('/api/blog-search', async (req, res) => {
    try {
        const query = req.query.query;
        

        if (!query) {
            res.status(400).json({ error: 'Query parameter is required' });
        }

        // if cache search result exist
        if (searchCache.has(query)) {
            const cachedSearchResults = searchCache.get(query);
            return res.json(cachedSearchResults);
        }

        const response = await axios.get('https://intent-kit-16.hasura.app/api/rest/blogs', {
            headers: {
                'x-hasura-admin-secret':process.env.SECRET_KEY
            }
        })

        const blogData = response.data.blogs;

        const searchResult = _.filter(blogData, (blog) => {
            _.includes(_.toLower(blog.title), _.toLower(query));
        })

        // store search result in search cache
        searchCache.set(query, searchResult);
        res.json({ searchResult });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'An error occured while fetching blogs' });
    }
})


app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
})