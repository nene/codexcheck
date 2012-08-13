// Native modules
var fs = require("fs"),
    path = require("path");

// 3rd party modules.
var sanitizer = require("sanitizer"),
    jshint = require("jshint").JSHINT;

var FILES = [];
var VERBOSE = false;

// process command line arguments
process.argv.splice(2).forEach(function(opt) {
    if (opt === "-v" || opt === "--verbose") {
        // Write out the exact warnings and source
        VERBOSE = true;
    } else {
        // when it's not an option, it's either input file or directory.
        // For directories scan all files in it.
        // For file just add it to list of files.
        if (fs.statSync(opt).isDirectory()) {
            // Get an array of all files in the specified directory.
            FILES = FILES.concat(fs.readdirSync(opt).map(function(f) {
                return path.join(opt, f);
            }));
        } else {
            FILES.push(opt);
        }
    }
});

// Input directory must be passed from command line
if (FILES.length === 0) {
    console.log("Please specify an input directory.");
    process.exit(1);
}

function stripHtml(value) {
    value = value.replace(/<(?:.|\n)*?>/gm, "");
    return sanitizer.unescapeEntities(value);
}

function indent(spaces, text) {
    return text.replace(/^/gm, spaces);
}

// Extracts all <pre> blocks
function extractSnippets(html) {
    return (html.match(/<pre><code>([^]*?)<\/code><\/pre>/ig) || []).map(stripHtml);
}

// Counters for successes and failures
var totalFailures = 0;
var totalSuccesses = 0;

// Loop over each of the file names in the specified directory.
FILES.forEach(function (file) {
    console.log(file + ":");

    // Read the JSON from file
    var json = JSON.parse(fs.readFileSync(file, "utf-8"));

    // check the documentation of a class itself
    var snips = extractSnippets(json.doc);

    ["members", "statics"].forEach(function(group) {
        for (var i in json[group]) {
            json[group][i].forEach(function(m) {
                snips = snips.concat(extractSnippets(m.doc));
            });
        }
    });

    snips.forEach(function(code, idx) {
        // Lets JSHint the contents and see if it is valid JavaScript.
        // Note: It may not even be JavaScript at all, who knows. Exciting!
        if (!jshint(code)) {
            // If we have errors, display the example number (1-based), just for giggles.
            console.log("  - Example #%d: FAIL :(", idx + 1);
            // Increment the global failures count.
            totalFailures++;
            if (VERBOSE) {
                // Loop over each error and display the line number and JSHint warning message.
                jshint.errors.forEach(function (error) {
                    if (error) {
                        console.log("    line: " + error.line + ", reason:" + error.reason);
                    }
                });
                console.log("    ------------");
                console.log(indent("    ", code));
                console.log("    ------------");
            }
        } else {
            console.log("  - Example #%d: OK", idx + 1);
            totalSuccesses++;
        }

    });

});

// Display the total number of JSHint errors/warnings.
console.log("");
console.log("TOTAL SUCCESSES: %d", totalSuccesses);
console.log("TOTAL FAILURES:  %d", totalFailures);
console.log(new Date());


