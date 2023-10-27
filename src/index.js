import express from 'express';
import { v4 as uuidv4 } from 'uuid'
import mongoose from 'mongoose';
import { createClient } from 'redis';
// import {userConnection,todoConnection} from  "./db.js"
// get environment variables
const port = process.env.PORT || 3000;
const nodeEnv = process.env.NODE_ENV;
const mySetting = process.env.MY_SETTING;
const version = process.env.VERSION || 'v1.2'

function makeNewConnection(uri) {
    const db = mongoose.createConnection(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });

    db.on('error', function (error) {
        console.log(`MongoDB :: connection ${this.name} ${JSON.stringify(error)}`);
        db.close().catch(() => console.log(`MongoDB :: failed to close connection ${this.name}`));
    });

    db.on('connected', function () {
        mongoose.set('debug', function (col, method, query, doc) {
            console.log(`MongoDB :: ${this.conn.name} ${col}.${method}(${JSON.stringify(query)},${JSON.stringify(doc)})`);
        });
        console.log(`MongoDB :: connected ${this.name}`);
    });

    db.on('disconnected', function () {
        console.log(`MongoDB :: disconnected ${this.name}`);
    });

    return db;
}

const userConnection = makeNewConnection('mongodb+srv://syedikram:syed12345@startupfoodapp.w2pio.mongodb.net/Development-Data?retryWrites=true&w=majority');
const todoConnection = makeNewConnection('mongodb+srv://syedikram:1234567890@cluster0.cbdu3.mongodb.net/Production_seconddatabase?retryWrites=true&w=majority');


// setup express
const app = express();
app.use(express.json());



// mongoose.connect('mongodb+srv://syedikram:syed12345@startupfoodapp.w2pio.mongodb.net/Development-Data?retryWrites=true&w=majority')
//     .then(() => {
//         console.log("First db Successfully connected to MongoDB.");
//     }).catch(err => {
//         console.log('First db Could not connect to MongoDB.');
//         process.exit();
//     });

// mongoose.connect('mongodb+srv://syedikram:1234567890@cluster0.cbdu3.mongodb.net/Production_seconddatabase?retryWrites=true&w=majority')
//     .then(() => {
//         console.log("Second db Successfully connected to MongoDB.");
//     }).catch(err => {
//         console.log('Second db Could not connect to MongoDB.');
//         process.exit();
//     });

// save albums in memory
let albums = [{
    id: "6f4df1f1-dbb2-46b5-903c-2995c16ed4bb",
    title: "All the Right Reasons",
    artist: "Nickelback"
}];


const client = await createClient({
    password: 'GvQo60GnJpMfLXAxQXUbM3PYIwus3w8f',
    socket: {
        host: 'redis-19172.c275.us-east-1-4.ec2.cloud.redislabs.com',
        port: 19172
    }
})
    .on('error', err => console.log('Redis Client Error', err))
    .on("ready", function () {

        console.log("Connected to Redis server successfully");
    })
    .connect()


await client.set('food-app', 'this is next gen food app');
const value = await client.get('food-app');
console.log("Get Data from redis", value);
await client.disconnect();

// setup routes
app.get('/api/albums', (req, res) => {
    res.send(albums);
});

app.get('/api/albums/:id', (req, res) => {
    const id = req.params.id;
    const album = albums.find(a => a.id === id);
    if (!album) {
        return res.sendStatus(404);
    }
    return res.send(album);
});

app.post('/api/albums', (req, res) => {
    const { title, artist } = req.body;

    // validate required fields
    if (!title || typeof title !== 'string') return res.status(400).send('Invalid required field: title (string)');
    if (!artist || typeof artist !== 'string') return res.status(400).send('Invalid required field: artist (string)');

    // create and insert album
    const album = {
        id: uuidv4(),
        title,
        artist
    }
    albums.push(album);
    return res.status(201).send(album);
});

app.delete('/api/albums/:id', (req, res) => {
    const id = req.params.id;

    // if album doesn't exist, return 404
    const album = albums.find(a => a.id === id);
    if (!album) {
        return res.sendStatus(404);
    }

    // otherwise album was found, remove it and return the album that has been deleted
    albums = albums.filter(a => a.id !== id);
    return res.send(album);
});

// utility endpoints
app.get('/api/healthcheck', (req, res) => {
    res.send({
        status: 'online',
        version,
        nodeEnv,
        mySetting,
        "redis": value || 'om'
    });
});

// Stops server with this method is called, only for demo purposes.
// DO NOT USE in actual production server
app.get('/api/stopserver', (req, res) => {
    process.exit(1);
});

// start express
app.listen(port, () => {
    console.log(`App listening on port: ${port}`)
});