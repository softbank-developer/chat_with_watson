var path = require('path');
var express = require('express');
var bodyParser = require('body-parser');
var watson = require('watson-developer-cloud')

var app = express();
app.use(express.static('public'));
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

if (!process.env.WORKSPACE_ID) {
    console.error("環境変数[WORKSPACE_ID]が設定されていません")
    process.exit()
}

var cfenv = require('cfenv');
var appEnv = cfenv.getAppEnv();
var creds = appEnv.getServiceCreds('conversation');

var VERSION_DATE = "2018-02-16";
var ConversationV1 = require('watson-developer-cloud/conversation/v1');
var conversation;
try {
    conversation = new ConversationV1({
        username: creds && creds.username || process.env.CONVERSATION_USERNAME,
        password: creds && creds.password || process.env.CONVERSATION_PASSWORD,
        version_date: process.env.VERSION_DATE || VERSION_DATE,
        headers: {
            "X-Watson-Learning-Opt-Out": true
        }
    });
} catch (e) {
    console.error('Conversationサービスに接続できません')
    console.error(e)
    process.exit()
}


/**
 * メッセージ送信
 * @param  {String} text    メッセージ文字列
 * @param  {Object} context コンテキスト
 * @return {Promise}        プロミス
 */
var message = function (text, context) {
    var payload = {
        workspace_id: process.env.WORKSPACE_ID,
        input: {
            text: text
        },
        context: context
    };
    console.log("MESSAGE REQUEST:" + JSON.stringify(payload))
    return new Promise((resolve, reject) =>
        conversation.message(payload, function (err, data) {
            if (err) {
                console.error(err)
                reject(err);
            } else {
                resolve(data);
            }
        })
    )
}


app.get('/', function (req, res) {

    console.log("ROUTER /");

    res.render('index', {
        bot_icon_url: process.env.BOT_ICON_URL || '/images/muraki_bot.png',
        human_icon_url: null,
        debug_mode: process.env.DEBUG_MODE ? false : true,
    });
});


app.get('/api/bot_init', function (req, res) {

    console.log("ROUTER /api/bot_init");

    message('', undefined)
        .then(response1 => {
            console.log("OK:" + JSON.stringify(response1, null, 2), '\n--------');
            res.json(response1);
        })
        .catch(err => {
            console.error("NG:" + JSON.stringify(err, null, 2));
            res.status(403)
                .send('Forbidden');
        });
});


app.post('/api/send_message', function (req, res) {

    console.log("ROUTER /api/send_message");

    message(req.body.input, req.body.context)
        .then(response1 => {
            console.log("OK:" + JSON.stringify(response1, null, 2), '\n--------');
            res.json(response1);
        })
        .catch(err => {
            console.error("NG:" + JSON.stringify(err, null, 2));
            res.status(403)
                .send('Forbidden');
        });
});


app.listen(appEnv.port, '0.0.0.0', function () {
    console.log("server starting on " + appEnv.url);
});
