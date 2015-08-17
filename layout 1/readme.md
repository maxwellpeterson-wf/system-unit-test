#How to develop

## Run First Time Setup
[Read Setup Instructions](utils/dev-setup/readme.md)

## Using the commands
NPM and JSPM commands should be ran from the project root working directory.


## Development Dependencies
This project requires Node, Git, NPM, Gulp, and Python (optional?)

`Git` & `Python` need to be added to your `PATH`, `utils/dev-setup/setup-path.bat` should take care of this for you.

`utils/dev-setup/setup-dev.bat` will install the projects global and local dependencies and download the bower packages.

##Referencing TS, JS, CSS, and other files
JSPM provides front-end package management.

###Auto Injection
CSS and packages from JSPM packages are imported using ES6 style imports, no need to edit the index.html!

##Updating project packages:
Run `/update-project.bat.` to update to the latest major versions of npm modules and bower packages.

###Commands
* `jspm update` - updates JSPM packages to latest version numbers allowed in the `.build/config.js`
* `jspm clean` - cleans the JSPM packages folder of unused packages.
* `npm-check-updates -u`  - update the project.json version numbers to the latest versions.
* `npm update` - update the packages based on version numbering found in `/package.json`
* `npm-check-updates -g` - check for updates to global packages like gulp, you will need to run `npm install -g [packagename]` to update global packages.
* `npm purge` - cleans the `node_modules` folder of unused packages.

##Updating NPM
`https://github.com/felixrieseberg/npm-windows-upgrade`

##Use Gulp Tasks

* `gulp bundle` to build an optimized version of your application in /dist
* `gulp dev` to build a development version, watch files for changes, and launch a server.
* `gulp test` to launch your unit tests with Karma
* `gulp test:auto` to launch your unit tests with Karma in watch mode

## Use NPM Tasks
* `npm install [module]`
* `npm install --save-dev [module]` - saves the module as a development dependency.
* `npm update` - Checks for updates using the versioning found in package.json. ~ for minor versions, ^ allows major upgrades.
* `npm-check-updates -u` - Checks for the latest versions and updates the project.json file to the latest version numbers.
* `npm-check-updates -g` - Checks for the latest versions of global module. To update a global module, run `npm install -g [module]'

## Use Bower Tasks
* `jspm uninstall [package]`
* `jspm install --save [package]` - `--save` saves the package in the project `config.js`. This will be needed in most cases.
* `jspm update` - Updates the jspm packages to the latest versions allowed in the project `config.js`.

#Directory structure

The directory structure allows files for a particular module or component to reside in the same folder.
A template, controller, and stylesheet for a module are contained in the same folder.

This organization makes it easy to develop modules, without needing to jump between folders.

##Index.html
This is the main html file. You shouldn't need to edit this file unless you are adding meta tags. CSS and JS files are auto-injected with `gulp`

##Creating a new module
Create a sub directory under `/src/app/` or under an existing module if it's a sub module.

Your JS, CSS, and HTML file will be auto-injected.

#Style

## Interfaces
Filename and Interface name starts with I

## Quote Style
`"` for html, `'` for typescript.

##Indentation
Tab Spacing should be set to 4

# REM vs PX

## When to use REM
* Font sizes that should scale (almost always)
* When a size of a container or other elements depends on a font size, those should use REM units too. For example an
 Avatar circle that uses text should use REM for the font size and REM for the margin, padding, and line-height.
## When to use PX
* When sizes should not scale.
