var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var socketIo = require('socket.io');

var webpack = require('webpack')
var webpackDevMiddleware = require('webpack-dev-middleware');
var config = require('../webpack.config');

var app = express();
var contentPath = path.join(__dirname, '../src');

var handleSockets = require('./socket').default;

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');


// view engine setup
app.set('views', path.join(contentPath, 'views'));
app.set('view engine', 'twig');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

if (app.get('env') == 'development') {

    app.disable('view cache');

    // Configure Webpack Auto-compile middleware
    const compiler = webpack(config);
    app.use('/public', webpackDevMiddleware(compiler, {
        publicPath: config.output.publicPath
    }));
} else {
    app.use('/public', express.static(path.join(contentPath, '../public')));
}

// Routes
app.use('/', indexRouter);
app.use('/users', usersRouter);

// Socketio
var io = socketIo();
app.io = io
handleSockets(io);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;