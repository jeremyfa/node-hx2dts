
var fs = require('fs');
var HXParser = require('./HXParser');
var DTSDumper = require('./DTSDumper');

var hx = String(fs.readFileSync(__dirname+'/../example/FlxSprite.hx'));

var parser = new HXParser(hx, 'FlxSprite');
var dumper = new DTSDumper(parser.getInfo());

console.log(dumper.getOutput());
