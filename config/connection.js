const { MongoClient } = require('mongodb');
const state={
    db:null
}

module.exports.connect = function (done) {
    const url = 'mongodb://localhost:27017';
    const dbName = 'shopping';

    MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true }, (err, client) => {
        if (err) {
            console.error('Error connecting to the database:', err);
            return done(err);
        }
        console.log('Connected to the database');
        state.db = client.db(dbName);
        done();
    });
};

module.exports.get = function () {
    return state.db;
};
