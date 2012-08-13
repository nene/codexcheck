// Native modules
var fs = require("fs"),
    path = require("path");

// 3rd party modules.
var sanitizer = require("sanitizer"),
    jshint = require("jshint").JSHINT;

var ROOT_DIR = "/Users/peterdehaan/Sites/docfix/output";

// Get a list [array] all the files in the specified directory.
fs.readdir(ROOT_DIR, function (err, files) {
    "use strict";

    // Should we output a "success" message if JSHint succeeds?
    var SUPPRESS_SUCCESS = true;

    // The total number of errors in the files.
    var totalMatches = 0;

    if (err) {
        throw err;
    }

    // Resize the array for faster/easier debugging.
    // <debug>
    // files = files.slice(0, 5); // Limit to X files for debugging.
    // </debug>

    // Loop over each of the file names in the specified directory.
    files.forEach(function (file) {
        // Read the specified file and try and strip the JSONP callback.
        var content = fs.readFileSync(path.join(ROOT_DIR, file), "utf-8").match(/\((.*)\)/g)[0];
        content = content.substring(1, content.length - 1); // strip the first and last character.

        // Convert the file contents from a string to a JSON object.
        var jsonContent = JSON.parse(content);

        // Strip out the HTML content for easier reading/logging.
        // <debug>
        // jsonContent.html = "";
        // </debug>

        // Replace all newlines with some junk character.
        jsonContent.html = jsonContent.html.replace(/\n/g, "\007");

        // Create a non-greedy regular expression to strip out any <pre> blocks.
        var re = new RegExp("<pre><code>(.)*?</code></pre>", "ig"),
            mat = jsonContent.html.match(re);
        
        console.log(file, "-------");
        // If we have any RegExp matches...
        if (mat) {
            // Loop over each <pre><code>...</code></pre> code block...
            mat.forEach(function (item, idx) {
                // Strip out any HTML content and convert all our junk characters back to a newline.
                var str = stripHtml(item.replace(/\007/g, "\n"));

                // Lets JSHint the contents and see if it is valid JavaScript.
                // Note: It may not even be JavaScript at all, who knows. Exciting!
                if (!jshint(str)) {
                    // If we have errors, display the example number (1-based), just for giggles.
                    console.log("==== File %s; Example #%d ====", file, idx + 1);
                    // Increment the global error/warning count.
                    totalMatches += jshint.errors.length;
                    // Loop over each error and display the line number and JSHint warning message.
                    jshint.errors.forEach(function (error) {
                        if (error) {
                            console.log("line: " + error.line + ", reason:" + error.reason);
                        }
                    });
                    console.log("------------\n%s", str, "\n");
                } else {
                    // Display a JSHint success message, if global flag is set.
                    if (!SUPPRESS_SUCCESS) {
                        console.log("==== File %s; Example #%d ====", file, idx + 1);
                        console.log("jshint kosher!\n");
                    }
                }

            });
        } else {
            console.log("No [inline] examples found, congrats!");
        }

        console.log("\n\n\n\n");


        /*
        // Alias finder.
        try {
            if (jsonContent.aliases.hasOwnProperty("widget")) {
                console.log("---", file, "---");
                console.log(jsonContent.aliases.widget.join("\n"));
                console.log("");
            }
        } catch (err) {
            // console.log("no aliases");
        }
        */
    });

    // Display the total number of JSHint errors/warnings.
    console.log("TOTAL MATCHES: %d", totalMatches);
    console.log(new Date());
});

function stripHtml(value) {
    value = value.replace(/<(?:.|\n)*?>/gm, "");
    return sanitizer.unescapeEntities(value);
}
