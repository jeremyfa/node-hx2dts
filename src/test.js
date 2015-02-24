
var fs = require('fs');
var HXParser = require('./HXParser');
var DTSDumper = require('./DTSDumper');

var hx = String(fs.readFileSync(__dirname+'/../example/Example.hx'));

var parser = new HXParser(hx, 'Example');
var dumper = new DTSDumper(parser.getInfo());

console.log(dumper.getOutput());
