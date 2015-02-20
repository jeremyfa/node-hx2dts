
var fs = require('fs');
var fse = require('fs-extra');
var glob = require('glob');
var hx2dts = require('./hx2dts');

exports.convertDirectory = function(hxPath, dtsPath, verbose) {

    var log;
    if (verbose) {
        log = function(str) {
            process.stdout.write(str + "\n");
        };
    } else {
        log = function(str) {
            // Log nothing
        };
    }

    // Compute path of all hx files
    var hxFiles = glob.sync(hxPath+'/**/*.hx');

    // Remove prefix
    for (var i = 0; i < hxFiles.length; i++) {
        hxFiles[i] = hxFiles[i].substring(hxPath.length + 1);
    }

    // Compute all relative paths without extension
    var allFileNames = [];
    for (var i = 0; i < hxFiles.length; i++) {
        var file = hxFiles[i].substring(0, hxFiles[i].length - 3);
        if (allFileNames.indexOf(file) == -1) {
            allFileNames.push(file);
        }
    }

    // Create destination directory if needed
    fse.ensureDirSync(dtsPath);

    // Iterate over each file and convert it from haxe to d.ts
    for (var i = 0; i < allFileNames.length; i++) {
        var fileName = allFileNames[i];

        var haxeFilePath = hxPath+'/'+fileName+'.hx';

        var finalFilePath = dtsPath+'/'+fileName+'.d.ts';
        var simpleFilePath = finalFilePath.substring(finalFilePath.lastIndexOf('/') + 1);

        // Convert hx file
        log('convert '+fileName+'.hx -> '+simpleFilePath);

        var hx = String(fs.readFileSync(haxeFilePath));

        // Get module name
        var moduleName = haxeFilePath.substring(haxeFilePath.lastIndexOf('/')+1, haxeFilePath.length-3);

        var parser = new hx2dts.HXParser(hx, moduleName);
        var info = parser.getInfo();
        var dumper = new hx2dts.DTSDumper(info);

        if (fs.existsSync(finalFilePath)) {
            fs.unlinkSync(finalFilePath);
        }

        var replacedFileName = fileName;
        if (info.package != null && info.package.length > 0) {
            var packagePath = info.package.split('.').join('/');
            var lastIndexOfPackagePath = replacedFileName.lastIndexOf(packagePath);
            if (lastIndexOfPackagePath != -1) {
                replacedFileName = replacedFileName.substring(0, lastIndexOfPackagePath) + info.package + '.' + replacedFileName.substring(lastIndexOfPackagePath+packagePath.length+1);
            }
        }
        finalFilePath = dtsPath+'/'+replacedFileName+'.d.ts';

        // Create destination directory if needed
        fse.ensureDirSync(finalFilePath.substring(0, finalFilePath.lastIndexOf('/')));

        fs.writeFileSync(finalFilePath, dumper.getOutput());
    }
};
