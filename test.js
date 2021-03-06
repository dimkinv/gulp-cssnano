'use strict';

var test = require('tape');
var nano = require('./');
var Vinyl = require('vinyl');
var ReadableStream = require('stream').Readable;
var sourcemaps = require('gulp-sourcemaps');

var css = 'h1\n{\n    color: white\n}\n';
var expected = 'h1{color:#fff}';

var sourceMapRegex = /sourceMappingURL=data:application\/json;/;

function fixture (contents) {
    return new Vinyl({
        contents: contents,
        cwd: __dirname,
        base: __dirname,
        path: __dirname + '/fixture.css'
    });
}

test('should minify css', function (t) {
    t.plan(1);

    var stream = nano();

    stream.on('data', function (data) {
        t.equal(String(data.contents), expected);
    });

    var file = fixture(new Buffer(css));

    stream.write(file);
});

test('should minify css, with sourcemaps', function (t) {
    t.plan(2);

    var init = sourcemaps.init();
    var write = sourcemaps.write();

    init.pipe(nano()).pipe(write);

    write.on('data', function (data) {
        var contents = String(data.contents);
        var mappings = data.sourceMap.mappings;
        t.equal(mappings, 'AAAA,GAEI,UAAY,CACf', 'should generate the mappings');
        t.ok(sourceMapRegex.test(contents), 'should have the map applied');
    });

    var file = fixture(new Buffer(css));

    init.write(file);
    init.end();
});

test('should minify css, discarding sourcemaps', function (t) {
    t.plan(1);

    var init = sourcemaps.init();
    var write = sourcemaps.write();
    var minify = nano();

    init.pipe(write).pipe(minify);

    minify.on('data', function (data) {
        t.equal(String(data.contents), expected);
    });

    var file = fixture(new Buffer(css));

    init.write(file);
    init.end();
});

test('should throw an error in stream mode', function (t) {
    t.plan(1);

    var stream = nano();

    var file = fixture(new ReadableStream());

    var write = function () {
        stream.write(file);
        file.contents.write(css);
        file.contents.end();
    };

    t.throws(write, 'should not support streaming contents');
});

test('should let null files pass through', function (t) {
    t.plan(1);

    var stream = nano();

    stream.on('data', function (data) {
        t.equal(data.contents, null, 'should not transform null in any way');
    });

    var file = fixture(null);

    stream.write(file);
});

test('should show css errors', function (t) {
    t.plan(2);

    var stream = nano();

    var file = fixture(new Buffer('h1\n{{\n    color: white\n}\n'));

    stream.on('error', function (error) {
        t.pass('caused error message');
        t.ok(error);
    });

    stream.on('data', function (data) {
        t.fail('should not have completed');
        t.notOk(data);
    });

    stream.write(file);
});
