hx2dts
======

Generate d.ts Typescript definition files from Haxe files.

This tool comes as a complement of [ts2hx](https://github.com/jeremyfa/node-ts2hx), a Typescript to Haxe transpiler.

It allows to access existing Haxe libraries from Typescript, like **OpenFL**, **Flixel** ...

The generated definition files will keep original Haxe comments.

Tested on Mac OS X with Intellij IDEA's Typescript plugin. May work with Visual Studio as well (if not, feel free to post a pull request).

## How to use

Install package globally, with NPM

``npm install -g hx2dts``

Then convert an existing haxe library to Typescript definition files:

``hx2dts --haxe /usr/lib/haxe/lib/flixel --destination ./flixel``

You can also convert the haxe standard library:

``hx2dts --haxe /usr/lib/haxe/std --destination ./std``

_Note: ``/usr/lib/haxe`` may be replaced by the location of your haxe installation on your computer_
