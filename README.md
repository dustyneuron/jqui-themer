# jqui-themer

An unofficial jQuery UI theme generator

Aiming to be able to build themes for the development version of jQuery UI

## Current Progress (still a WIP):

Generates custom theme css file from a http://jqueryui.com/themeroller/ query string. Only generates the standard themes as no image generator yet.

Supports custom-scoped CSS output.

## Usage

Requires node.js (build using 0.4.11)

`node src/build-themes.js [--version version] [--scope scope]`

This builds all the standard themes, and puts them in `output`.

## License

Dual-licensed, choose MIT or GPLv2.

