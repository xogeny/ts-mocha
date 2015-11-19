/// <reference path="typings/node/node.d.ts" />

// Import type TypeScript compiler API
import * as ts from "typescript";

// A bunch of Node modules we need as well
import path = require('path');
import fs = require('fs');
import vm = require('vm');

var compiledTo: { [key: string]: string } = {}

// This (somehow) tells Mocha that this function should be
// called whenever Mocha encouters an TypeScript file to test
require.extensions['.ts'] = function(module: any) {
	var tsname = module.filename;

	// JS emitted *if* we've compiled this before

	var jsname = compiledTo[tsname];
	// If we've compiled this before and the file that we produced is still
	// newer that this source, 
	if (jsname && !isModified(tsname, jsname)) {
		console.log("  Skipping ", tsname)
	} else {
		jsname = compileTS(tsname);
	}

	if (jsname) {
		runJS(jsname, module);
		compiledTo[tsname] = jsname
	}
}

// This function compiles the specific TypeScript file and
// returns the name of the JS file emitted.
function compileTS(fileName: string): string {
	// If the variable TS_MOCHA_DEBUG is set, then turn on debugging
	// output (there didn't seem to be any other way to pass options
	// to compiler modules in Mocha).
	var debug = !!process.env["TS_MOCHA_DEBUG"]

	// Figure out where to start searching for a tsconfig.json file
	var searchPath = path.dirname(fileName);

	// Start by assuming the config file is in the same directory as
	// the TypeScript file...
	var configFileName = path.join(path.dirname(fileName), "tsconfig.json")

	// If not, use the TypeScript compiler API to try and find it...
	if (!fs.existsSync(configFileName)) {
		configFileName = ts.findConfigFile(searchPath);
	}

	if (!configFileName) {
		console.error("Unable to find configuration file for ", fileName);
		return null;
	}

	// Store the directory where the configuration file was found
	var confDir = path.dirname(configFileName);

	// If we have debugging turned on, output some stuff
	if (debug) {
		console.log("Compiling ", fileName);
		console.log("  searchPath: ", searchPath);
		console.log("  configFileName: ", configFileName);
	}

	// Read the configuration file...
	var configText: string = fs.readFileSync(configFileName, "utf8");
	// ...and then turn process it so we can get a JSON representation
	// of the configuration file.
	var contents = ts.parseConfigFileTextToJson(configFileName, configText);

	// Is there an error in the configuration.  If so, output an error and
	// return null
	if (contents.error) {
		console.error(contents.error);
		return null
	}

	// Turn JSON version of configuration into a instace of ts.CompilerOptions
	var config = ts.convertCompilerOptionsFromJson(contents.config.compilerOptions, confDir);

	// Report what we are compiling
	if (debug) {
		console.log("  Compiling ", fileName, " with ", config);
	} else {
		console.log("  Compiling ", fileName)
	}

	// Finally, compile the typescript code using the options we found in the
	// tsconfig.json file.
	return compile(fileName, config.options, debug);
};

function compile(fileName: string, options: ts.CompilerOptions, debug: boolean): string {
	// Create a compiler host
	let host = ts.createCompilerHost(options);
	// Create a program
    let program = ts.createProgram([fileName], options, host);

	// This is where we will update the last file compiled.  When the compilation process
	// is done, the last file emitted should be the one we were actually trying to compile
	// (at least it worked that way for me when testing...not sure if this is guaranteed)
	var lastFile: string = null;

	// This is a special callback that the compiler will call when it writes each file out.
	// We are wrapping the host function that actually does the writing so we can intercept
	// the file names.
	var callback = (fileName: string, data: string, writeByteOrderMark: boolean, onError?: (message: string) => void): void => {
		// Tell host to write file out
		host.writeFile(fileName, data, writeByteOrderMark, onError);
		// Check if this is a Javascript file and, if so, update lastFile variable
		if (path.extname(fileName)==".js") {
			if (debug) {
				console.log("  Writing ", fileName);
			}
			lastFile = fileName;
		}
	}

	// Emit JS code
	program.emit(undefined, callback);

	if (debug) {
		console.log("Last Javascript file written: ", lastFile)
	}

	// Return name of last file written
	return lastFile;
}

// This function comes from typescript-require
function runJS (jsname: string, module: any) {
	console.log("  Running ", jsname)
	var content = fs.readFileSync(jsname, 'utf8');

	var sandbox: vm.Context = {};
	for (var k in global) {
		sandbox[k] = global[k];
	}
	sandbox["require"] = module.require.bind(module);
	sandbox["exports"] = module.exports;
	sandbox["__filename"] = jsname;
	sandbox["__dirname"] = path.dirname(module.filename);
	sandbox["module"] = module;
	sandbox["global"] = sandbox;

	// This was in typescript-require, but the variable root
	// was never defined, so I have no idea what the point was.
	//sandbox["root"] = root;

	return vm.runInNewContext(content, sandbox, jsname);
}

// Another function shamelessly borrowed from typescript-require
function isModified(tsname: string, jsname: string): boolean {
  var tsMTime = fs.statSync(tsname).mtime;

  try {
    var jsMTime = fs.statSync(jsname).mtime;
	  return tsMTime > jsMTime;
  } catch (e) { //catch if file does not exists
	  return true;
  }
}
