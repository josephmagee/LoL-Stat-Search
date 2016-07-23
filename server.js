var express = require('express');
var app = express();
var exphbs = require('express-handlebars');
var request = require('request');
var async = require('async');
var fs = require('fs');
/*
 * get your own config file you crazy kids, and stay off my lawn. configuration.json holds your API key from Riot.
 * your API key can be found at https://developer.riotgames.com/ after logging into your league of legends account.
 */
var configuration = process.env.apikey;

app.engine('handlebars', exphbs({
    defaultLayout: 'main'
}));
app.set('view engine', 'handlebars');

app.get('/', function(req, res) {
    res.render('index');
});
app.get('/search', function(req, res) {
    var path = './data/logs.json';
    var obj = JSON.parse(fs.readFileSync(path, 'utf8'));
    var data = {};
    var api_key = configuration;
    var s_toSearch = req.query.summoner.toLowerCase().replace(/ /g, '');

    async.waterfall([
            function(callback) {
                var URL = 'https://na.api.pvp.net/api/lol/na/v1.4/summoner/by-name/' + s_toSearch + '?api_key=' + api_key;
                request(URL, function(err, response, body) {
                    if (!err && response.statusCode == 200) {
                        var json = JSON.parse(body);
                        data.id = json[s_toSearch].id;
                        data.name = json[s_toSearch].name;
                        callback(null, data);
                    } else {
                        console.log(err);
                    }
                });
            },
            function(data, callback) {
                var URL = 'https://na.api.pvp.net/api/lol/na/v1.3/stats/by-summoner/' + data.id + '/ranked?api_key=' + api_key;
                request(URL, function(err, response, body) {
                    if (!err && response.statusCode == 200) {
                        var json = JSON.parse(body);
                        var mostPlayed = 0;
                        var championPlayed = 0;
                        for (var c = 0; c < json['champions'].length; c++) {
                            var currentPlayed = json['champions'][c]['stats'].totalSessionsPlayed;
                            if (currentPlayed > mostPlayed && !json['champions'][c].id == 0) {
                                mostPlayed = currentPlayed;
                                championPlayed = json['champions'][c].id;
                            }
                        }
                        data.champId = championPlayed;
                        data.timesPlayed = mostPlayed;
                        callback(null, data);
                    } else {
                        console.log(err);
                    }
                });
            },
            function(data, callback) {
                var URL = 'https://na.api.pvp.net/api/lol/static-data/na/v1.2/champion/' + data.champId + '?locale=en_US&api_key=' + api_key;
                request(URL, function(err, response, body) {
                    if (response.statusCode == 200) {
                        var json = JSON.parse(body);
                        data.champName = json['name'];
                        callback(null, data);
                    } else {
                        console.log(err);
                    }
                });
            }
        ],
        function(err, data) {
            if(err) {
                console.log(err);
                res.render('index');
                return;
            }
            obj.searches.push({
                "value": data.name
            });
            fs.writeFile(path, JSON.stringify(obj, null, ''), function(err) {
                if(err) {
                    return console.log(err);
                }
            });
            res.render('index', {
                info: data
            });
        }
    );
});

var port = Number(process.env.PORT || 3000);
app.listen(port);
