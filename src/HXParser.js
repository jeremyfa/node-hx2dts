
var _ = require('lodash');

var REGEX_QUOTED_STRING = new RegExp('^(?:"(?:[^"\\\\]*(?:\\\\.[^"\\\\]*)*)"|\'(?:[^\']*(?:\'\'[^\']*)*)\')', '');

/**
 * Utility class to generate JSON object from haxe source code.
 * The JSON will contain dependencies, classes, interfaces, enums, typedefs, properties and methods informations.
 */
var HXParser = function(input, moduleName) {

    this.input = input;

    this.classesByName = {};
    this.interfacesByName = {};
    this.enumsByName = {};
    this.typedefsByName = {};

    this.currentClass = null;
    this.currentClassBraces = 0;
    this.currentInterface = null;
    this.currentInterfaceBraces = 0;
    this.currentEnum = null;
    this.currentEnumBraces = 0;
    this.currentTypedef = null;
    this.currentTypedefBraces = 0;

    this.info = {
        moduleName: moduleName,
        dependencies: [],
        entries: []
    };
    this.braces = 0;

    this.cleanupHaxe();
    this.parseHaxe();

    console.log(JSON.stringify(this.info, null, 4));
};


HXParser.prototype.cleanupHaxe = function() {
    var i = 0;
    var input = this.input;
    var newInput = '';

    while (i < input.length) {
        var hx = input.substring(i);

        if (this.isInSingleLineComment) {
            if (hx.charAt(0) == "\n") {
                this.isInSingleLineComment = false;
            }
            newInput += ' ';
            i++;
        }
        else if (this.isInMultiLineComment) {
            if (hx.substr(0, 2) == "*/") {
                this.isInMultiLineComment = false;
                newInput += '  ';
                i += 2;
            } else {
                if (hx.charAt(0) == "\n") {
                    newInput += "\n";
                } else {
                    newInput += ' ';
                }
                i++;
            }
        }
        else if (hx.substr(0, 2) == '//') {
            this.isInSingleLineComment = true;
            newInput += '  ';
            i += 2;
        }
        else if (hx.substr(0, 2) == '/*') {
            this.isInMultiLineComment = true;
            newInput += '  ';
            i += 2;
        }
        else {
            newInput += hx.charAt(0);
            i++;
        }
    }

    this.input = newInput;
    this.isInMultiLineComment = false;
    this.isInSingleLineComment = false;
};


HXParser.prototype.parseHaxe = function() {
    var i = 0;
    var input = this.input;
    var matches = null;

    while (i < input.length) {
        var hx = input.substring(i);
        matches = null;

        // Package
        if (this.info.package == null && (matches = hx.match(/^package(\s+((?:[a-zA-Z_][a-zA-Z_0-9]*)(?:\.[a-zA-Z_][a-zA-Z_0-9]*)*)?)?;/))) {
            var matchedHx = matches[0];
            var packageName = matches[2];

            if (packageName != null && packageName.length > 0) {
                this.info.package = packageName;
            }

            i += matchedHx.length;
        }
        else if (matches = hx.match(/^import(\s+((?:[a-zA-Z_][a-zA-Z_0-9]*)(?:\.[a-zA-Z_][a-zA-Z_0-9]*)*)?)?;/)) {
            var matchedHx = matches[0];
            var packageName = matches[2];

            if (packageName != null && packageName.length > 0) {
                if (this.info.dependencies.indexOf(packageName) == -1) {
                    this.info.dependencies.push(packageName);
                }
            }

            i += matchedHx.length;
        }
        // Interface
        else if (matches = hx.match(/^(private\s+)?interface\s+([a-zA-Z_][a-zA-Z_0-9]*)((\s+extends\s+(([a-zA-Z_][a-zA-Z_0-9]*\.)*[a-zA-Z_][a-zA-Z_0-9]*))*)(\s*\{|\s*;)/)) {
            var matchedHx = matches[0];

            // Basic info
            var interfaceInfo = {
                interfaceName:  matches[2],
                entries:        []
            };

            // Is it private?
            if (matches[1] != null && matches[1].trim() == 'private') {
                interfaceInfo.isPrivate = true;
            }

            // Extends other interfaces?
            if (matches[3] != null && matches[3].indexOf('extends') != -1) {
                interfaceInfo.extendsInterfaces = [];
                matches[3].split(/\sextends\s/).forEach(function(interfaceName) {
                    if (interfaceName.trim().length > 0) {
                        interfaceInfo.extendsInterfaces.push(interfaceName.trim());
                    }
                });
            }

            // Open brace?
            if (matches[7].indexOf('{') != -1) {
                this.braces++;
            }

            // Add result only if there is no existing entry
            var newEntries = [];
            this.info.entries.forEach(function(existingEntry) {
                if (existingEntry.interfaceName != interfaceInfo.interfaceName) {
                    newEntries.push(existingEntry);
                }
            });
            newEntries.push(interfaceInfo);
            this.interfacesByName[interfaceInfo.interfaceName] = interfaceInfo;
            this.info.entries = newEntries;

            // Set current interface
            this.currentInterface = interfaceInfo.interfaceName;
            this.currentInterfaceBraces = this.braces;

            i += matchedHx.length;
        }
        // Typedef
        else if (matches = hx.match(/^(private\s+)?typedef\s+([a-zA-Z_][a-zA-Z_0-9_<,>]*)\s*=\s*(\{|([a-zA-Z_][a-zA-Z0-9_<,>\-]*)\s*;)/)) {
            var matchedHx = matches[0];

            // Basic info
            var typedefInfo = {
                typedefName:    matches[2],
                entries:        []
            };

            // Is it private?
            if (matches[1] != null && matches[1].trim() == 'private') {
                typedefInfo.isPrivate = true;
            }

            if (matches[3] != null) {
                if (matches[3].indexOf('{') == 0) {
                    // Open braces
                    this.braces++;
                } else {
                    // Type alias
                    typedefInfo.typedefType = matches[4].replace(/\s*/g, '');
                }
            }

            // Add result only if there is no existing entry
            var newEntries = [];
            this.info.entries.forEach(function(existingEntry) {
                if (existingEntry.typedefName != typedefInfo.typedefName) {
                    newEntries.push(existingEntry);
                }
            });
            newEntries.push(typedefInfo);
            this.typedefsByName[typedefInfo.typedefName] = typedefInfo;
            this.info.entries = newEntries;

            // Set current class
            this.currentTypedef = typedefInfo.typedefName;
            this.currentTypedefBraces = this.braces;

            i += matchedHx.length;
        }
        // Class
        else if (matches = hx.match(/^(private\s+)?class\s+([a-zA-Z_][a-zA-Z_0-9]*)(\s+extends\s+(([a-zA-Z_][a-zA-Z_0-9]*\.)*[a-zA-Z_][a-zA-Z_0-9]*))?((\s+implements\s+(([a-zA-Z_][a-zA-Z_0-9]*\.)*[a-zA-Z_][a-zA-Z_0-9]*))*)(\s*\{|\s*;)/)) {
            var matchedHx = matches[0];

            // Basic info
            var classInfo = {
                className:  matches[2],
                entries:    []
            };

            // Is it private?
            if (matches[1] != null && matches[1].trim() == 'private') {
                classInfo.isPrivate = true;
            }

            // Extends another class?
            if (matches[4] != null && matches[4].length > 0) {
                classInfo.extendsClass = matches[4];
            }

            // Implements interfaces?
            if (matches[6] != null && matches[6].indexOf('implements') != -1) {
                classInfo.implementsInterfaces = [];
                matches[6].split(/\simplements\s/).forEach(function(interfaceName) {
                    if (interfaceName.trim().length > 0) {
                        classInfo.implementsInterfaces.push(interfaceName.trim());
                    }
                });
            }

            // Open brace?
            if (matches[10].indexOf('{') != -1) {
                this.braces++;
            }

            // Add result only if there is no existing entry
            var newEntries = [];
            this.info.entries.forEach(function(existingEntry) {
                if (existingEntry.className != classInfo.className) {
                    newEntries.push(existingEntry);
                }
            });
            newEntries.push(classInfo);
            this.classesByName[classInfo.className] = classInfo;
            this.info.entries = newEntries;

            // Set current class
            this.currentClass = classInfo.className;
            this.currentClassBraces = this.braces;

            i += matchedHx.length;
        }
        // Method
        else if ((this.currentClass != null || this.currentInterface != null || this.currentTypedef != null) && (matches = hx.match(/^((?:(private|static|public|override)\s+)*)function\s+([a-zA-Z_][a-zA-Z_0-9]*)\s*\(([^\)]*)\)(\s*:\s*([a-zA-Z_][a-zA-Z0-9_<,>\-]*))?(\s*\{|\s*;)/))) {
            var matchedHx = matches[0];

            // Basic info
            var methodInfo = {
                methodName: matches[3],
                arguments:  []
            };

            // Does it have modifiers?
            if (matches[1] != null) {
                // Is it static?
                if (matches[1].indexOf('static') != -1) {
                    methodInfo.isStatic = true;
                }
                // Is it private or public?
                if (matches[1].indexOf('public') == -1 && this.currentTypedef == null) {
                    methodInfo.isPrivate = true;
                }
            }

            // Arguments
            if (matches[4] != null) {
                methodInfo.arguments = this.parseArguments(matches[4]);
            }

            // Add method info to current class or interface
            if (this.currentClass != null) {
                this.classesByName[this.currentClass].entries.push(methodInfo);
            }
            else if (this.currentInterface != null) {
                this.interfacesByName[this.currentInterface].entries.push(methodInfo);
            }
            else if (this.currentTypedef != null) {
                this.typedefsByName[this.currentTypedef].entries.push(methodInfo);
            }

            // Return type
            if (matches[6] != null) {
                methodInfo.returnType = matches[6].replace(/\s*/g, '');
            }

            // Open brace?
            if (matches[7].indexOf('{') != -1) {
                this.braces++;
            }

            i += matchedHx.length;
        }
        // Property
        else if ((this.currentClass != null || this.currentInterface != null || this.currentTypedef != null) && (matches = hx.match(/^((?:(private|static|public|override)\s+)*)var\s+([a-zA-Z_][a-zA-Z_0-9]*)\s*(\(([^\)]*)\))?(\s*:\s*([a-zA-Z_][a-zA-Z0-9_<,>\-]*))?(\s*=\s*((?:"(?:[^"\\]*(?:\\.[^"\\]*)*)"|'(?:[^']*(?:''[^']*)*)')|(?:[^;]+)))?(\s*;)/))) {
            var matchedHx = matches[0];

            // Basic info
            var propertyInfo = {
                propertyName:   matches[3]
            };

            // Does it have modifiers?
            if (matches[1] != null) {
                // Is it static?
                if (matches[1].indexOf('static') != -1) {
                    propertyInfo.isStatic = true;
                }
                // Is it private or public?
                if (matches[1].indexOf('public') == -1 && this.currentTypedef == null) {
                    propertyInfo.isPrivate = true;
                }
            }

            // Type
            if (matches[7] != null) {
                propertyInfo.propertyType = matches[7].replace(/\s*/g, '');
            }

            // Default value
            if (matches[9] != null) {
                propertyInfo.defaultValue = matches[9].replace(/\s*/g, '');
            }

            // Add property info to current class or interface
            if (this.currentClass != null) {
                this.classesByName[this.currentClass].entries.push(propertyInfo);
            }
            else if (this.currentInterface != null) {
                this.interfacesByName[this.currentInterface].entries.push(propertyInfo);
            }
            else if (this.currentTypedef != null) {
                this.typedefsByName[this.currentTypedef].entries.push(propertyInfo);
            }

            i += matchedHx.length;
        }
        // Enum
        else if (matches = hx.match(/^(private\s+)?enum\s+([a-zA-Z_][a-zA-Z_0-9]*)(\s*\{|\s*;)/)) {
            var matchedHx = matches[0];

            // Basic info
            var enumInfo = {
                enumName:   matches[2],
                enumValues: []
            };

            // Is it private?
            if (matches[1] != null && matches[1].indexOf('private') != -1) {
                enumInfo.isPrivate = true;
            }

            // Open brace?
            if (matches[3].indexOf('{') != -1) {
                this.braces++;
            }

            // Add result only if there is no existing entry
            var newEntries = [];
            this.info.entries.forEach(function(existingEntry) {
                if (existingEntry.enumName != enumInfo.enumName) {
                    newEntries.push(existingEntry);
                }
            });
            newEntries.push(enumInfo);
            this.enumsByName[enumInfo.enumName] = enumInfo;
            this.info.entries = newEntries;

            // Set current enum
            this.currentEnum = enumInfo.enumName;
            this.currentEnumBraces = this.braces;

            i += matchedHx.length;
        }
        else if (this.currentEnum != null && (matches = hx.match(/^([a-zA-Z_][a-zA-Z_0-9]*)\s*(\(([^\)]*)\))?(\s*;)/))) {
            var matchedHx = matches[0];

            var valueInfo = {
                valueName:  matches[1]
            };

            if (matches[3] != null) {
                valueInfo.valueArguments = this.parseArguments(matches[3]);
            }

            this.enumsByName[this.currentEnum].enumValues.push(valueInfo);

            i += matchedHx.length;
        }
        else if ((hx.charAt(0) == '\'' || hx.charAt(0) == '"') && ((REGEX_QUOTED_STRING.lastIndex = -1) && (matches = hx.match(REGEX_QUOTED_STRING)))) {
            i += matches[0].length;
        }
        else if (hx.charAt(0) == '{') {
            // Open brace
            this.braces++;
            i++;
        }
        else if (hx.charAt(0) == '}') {
            // Close brace
            this.braces--;
            if (this.currentClass != null && this.braces < this.currentClassBraces) {
                this.currentClass = null;
                this.currentClassBraces = 0;
            }
            else if (this.currentInterface != null && this.braces < this.currentInterfaceBraces) {
                this.currentInterface = null;
                this.currentInterfaceBraces = 0;
            }
            else if (this.currentEnum != null && this.braces < this.currentEnumBraces) {
                this.currentEnum = null;
                this.currentEnumBraces = 0;
            }
            else if (this.currentTypedef != null && this.braces < this.currentTypedefBraces) {
                this.currentTypedef = null;
                this.currentTypedefBraces = 0;
            }
            i++;
        }
        else if (matches = hx.match(/^#(if|else|end)([^\n]*)\n/)) {
            // Preprocessor
            i += matches[0].length;
        }
        else {
            i++;
        }
    }
};


HXParser.prototype.parseArguments = function(input) {
    var i = 0;
    var matches = null;
    var arguments = [];
    input = input+',';

    while (i < input.length) {
        var hx = input.substring(i);

        if (matches = hx.match(/^(\?\s*)?([a-zA-Z_][a-zA-Z_0-9]*)\s*(:\s*([a-zA-Z_][a-zA-Z0-9_<,>\-]*))?(\s*=\s*([^,]+))?\s*,/)) {
            matchedHx = matches[0];

            // Basic info
            var argumentInfo = {
                argumentName:   matches[2]
            };

            // Is it optional?
            if (matches[1] != null && matches[1].indexOf('?') != -1) {
                argumentInfo.isOptional = true;
            }

            // Type information
            if (matches[4] != null) {
                argumentInfo.argumentType = matches[4].replace(/\s*/g, '');
            }

            // Default value
            if (matches[6] != null) {
                argumentInfo.defaultValue = matches[6].replace(/\s*/g, '');
            }

            arguments.push(argumentInfo);

            i += matchedHx.length;
        } else {
            i++;
        }
    }

    return arguments;
};

module.exports = HXParser;
