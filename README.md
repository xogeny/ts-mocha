# TypeScript + Mocha

This module attempts to address
[issues I found](http://stackoverflow.com/questions/32996110/combine-mocha-typescript-and-watch)
when trying to use
[typescript-require](https://github.com/theblacksmith/typescript-require)
to test TypeScript code with Mocha.

My first thought was to use the [TypeScript Compiler API]() to
directly trigger compilation.  I thought this would be cleaner than
trying to run a script that runs the command line compiler.

This effort was simulataneously a success and a **failure**.

It was a success because I learned a bit about the TypeScript Compiler
API and managed to write a compiler plugin for Mocha that actually
works.  I also consider it a success because it triggers the
compilation using the options specified by a `tsconfig.json` which
means the results of running the tests through `mocha` should be the
same as the results you would get if you invoked `tsc` and then
`mocha` serially.

It was a failure because my main goal was to leverage the `--watch`
functionality in Mocha and that still doesn't work (more on that in a
second).  I recognized that while I could use a build tool like `gulp`
or `grunt` to build the TypeScript code and then run `mocha` on it, I
thought it would be much more elegant if `mocha` "just worked".

The reason the watch functionality doesn't work is that when `tsc`
compiles the tests it depends on lots of code, not just the TypeScript
code that mocha sees.  So if you change the actual test code, this
works just fine.  But if you change code that the tests leverage
(*i.e.,* the code you are trying to test), it doesn't notice the
changes.

# Limitations

In addition to the limitation of not detecting changes in the code to
be tested (documented above) while in watch mode, there is another
limitation of this module.  It uses the compiler API for TypeScript
v1.8.0+ (which isn't even officially released as of now).

# Contributions

I'd be happy to have others contributing to this in the hope that it
can eventually achieve the goals I set out to accomplish.  But for
now, I'm just making it available so people can leverage the limited
functionality it provides.
