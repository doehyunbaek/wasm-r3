/* BEGIN FILE: api/post-js-header.js */
/**
   post-js-header.js is to be prepended to other code to create
   post-js.js for use with Emscripten's --post-js flag. This code
   requires that it be running in that context. The Emscripten
   environment must have been set up already but it will not have
   loaded its WASM when the code in this file is run. The function it
   installs will be run after the WASM module is loaded, at which
   point the sqlite3 JS API bits will get set up.
*/
if(!Module.postRun) Module.postRun = [];
Module.postRun.push(function(Module/*the Emscripten-style module object*/){
  'use strict';
  /* This function will contain at least the following:

     - post-js-header.js (this file)
     - sqlite3-api-prologue.js  => Bootstrapping bits to attach the rest to
     - common/whwasmutil.js     => Replacements for much of Emscripten's glue
     - jaccwaby/jaccwabyt.js    => Jaccwabyt (C/JS struct binding)
     - sqlite3-api-glue.js      => glues previous parts together
     - sqlite3-api-oo.js        => SQLite3 OO API #1
     - sqlite3-api-worker1.js   => Worker-based API
     - sqlite3-vfs-helper.js    => Internal-use utilities for...
     - sqlite3-vfs-opfs.js      => OPFS VFS
     - sqlite3-api-cleanup.js   => final API cleanup
     - post-js-footer.js        => closes this postRun() function
  */
/* END FILE: api/post-js-header.js */
/* BEGIN FILE: ./bld/sqlite3-api.c-pp.js */
/* BEGIN FILE: ./bld/sqlite3-license-version.js */
/*
** LICENSE for the sqlite3 WebAssembly/JavaScript APIs.
**
** This bundle (typically released as sqlite3.js or sqlite3.mjs)
** is an amalgamation of JavaScript source code from two projects:
**
** 1) https://emscripten.org: the Emscripten "glue code" is covered by
**    the terms of the MIT license and University of Illinois/NCSA
**    Open Source License, as described at:
**
**    https://emscripten.org/docs/introducing_emscripten/emscripten_license.html
**
** 2) https://sqlite.org: all code and documentation labeled as being
**    from this source are released under the same terms as the sqlite3
**    C library:
**
** 2022-10-16
**
** The author disclaims copyright to this source code.  In place of a
** legal notice, here is a blessing:
**
** *   May you do good and not evil.
** *   May you find forgiveness for yourself and forgive others.
** *   May you share freely, never taking more than you give.
*/
/*
** This code was built from sqlite3 version...
**
**
** Using the Emscripten SDK version emcc (Emscripten gcc/clang-like replacement + linker emulating GNU ld) 3.1.46-git.
*/
/* END FILE: ./bld/sqlite3-license-version.js */
/* BEGIN FILE: api/sqlite3-api-prologue.js */
/*
  2022-05-22

  The author disclaims copyright to this source code.  In place of a
  legal notice, here is a blessing:

  *   May you do good and not evil.
  *   May you find forgiveness for yourself and forgive others.
  *   May you share freely, never taking more than you give.

  ***********************************************************************

  This file is intended to be combined at build-time with other
  related code, most notably a header and footer which wraps this
  whole file into an Emscripten Module.postRun() handler. The sqlite3
  JS API has no hard requirements on Emscripten and does not expose
  any Emscripten APIs to clients. It is structured such that its build
  can be tweaked to include it in arbitrary WASM environments which
  can supply the necessary underlying features (e.g. a POSIX file I/O
  layer).

  Main project home page: https://sqlite.org

  Documentation home page: https://sqlite.org/wasm
*/

/**
   sqlite3ApiBootstrap() is the only global symbol persistently
   exposed by this API. It is intended to be called one time at the
   end of the API amalgamation process, passed configuration details
   for the current environment, and then optionally be removed from
   the global object using `delete globalThis.sqlite3ApiBootstrap`.

   This function is not intended for client-level use. It is intended
   for use in creating bundles configured for specific WASM
   environments.

   This function expects a configuration object, intended to abstract
   away details specific to any given WASM environment, primarily so
   that it can be used without any _direct_ dependency on
   Emscripten. (Note the default values for the config object!) The
   config object is only honored the first time this is
   called. Subsequent calls ignore the argument and return the same
   (configured) object which gets initialized by the first call.  This
   function will throw if any of the required config options are
   missing.

   The config object properties include:

   - `exports`[^1]: the "exports" object for the current WASM
     environment. In an Emscripten-based build, this should be set to
     `Module['asm']`.

   - `memory`[^1]: optional WebAssembly.Memory object, defaulting to
     `exports.memory`. In Emscripten environments this should be set
     to `Module.wasmMemory` if the build uses `-sIMPORTED_MEMORY`, or be
     left undefined/falsy to default to `exports.memory` when using
     WASM-exported memory.

   - `bigIntEnabled`: true if BigInt support is enabled. Defaults to
     true if `globalThis.BigInt64Array` is available, else false. Some APIs
     will throw exceptions if called without BigInt support, as BigInt
     is required for marshalling C-side int64 into and out of JS.
     (Sidebar: it is technically possible to add int64 support via
     marshalling of int32 pairs, but doing so is unduly invasive.)

   - `allocExportName`: the name of the function, in `exports`, of the
     `malloc(3)`-compatible routine for the WASM environment. Defaults
     to `"sqlite3_malloc"`. Beware that using any allocator other than
     sqlite3_malloc() may require care in certain client-side code
     regarding which allocator is uses. Notably, sqlite3_deserialize()
     and sqlite3_serialize() can only safely use memory from different
     allocators under very specific conditions. The canonical builds
     of this API guaranty that `sqlite3_malloc()` is the JS-side
     allocator implementation.

   - `deallocExportName`: the name of the function, in `exports`, of
     the `free(3)`-compatible routine for the WASM
     environment. Defaults to `"sqlite3_free"`.

   - `reallocExportName`: the name of the function, in `exports`, of
     the `realloc(3)`-compatible routine for the WASM
     environment. Defaults to `"sqlite3_realloc"`.

   - `debug`, `log`, `warn`, and `error` may be functions equivalent
     to the like-named methods of the global `console` object. By
     default, these map directly to their `console` counterparts, but
     can be replaced with (e.g.) empty functions to squelch all such
     output.

   - `wasmfsOpfsDir`[^1]: Specifies the "mount point" of the OPFS-backed
     filesystem in WASMFS-capable builds.


   [^1] = This property may optionally be a function, in which case
          this function calls that function to fetch the value,
          enabling delayed evaluation.

   The returned object is the top-level sqlite3 namespace object.

*/
'use strict';
globalThis.sqlite3ApiBootstrap = function sqlite3ApiBootstrap(
  apiConfig = (globalThis.sqlite3ApiConfig || sqlite3ApiBootstrap.defaultConfig)
){
  if(sqlite3ApiBootstrap.sqlite3){ /* already initalized */
    console.warn("sqlite3ApiBootstrap() called multiple times.",
                 "Config and external initializers are ignored on calls after the first.");
    return sqlite3ApiBootstrap.sqlite3;
  }
  const config = Object.assign(Object.create(null),{
    exports: undefined,
    memory: undefined,
    bigIntEnabled: (()=>{
      if('undefined'!==typeof Module){
        /* Emscripten module will contain HEAPU64 when built with
           -sWASM_BIGINT=1, else it will not. */
        return !!Module.HEAPU64;
      }
      return !!globalThis.BigInt64Array;
    })(),
    debug: console.debug.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    log: console.log.bind(console),
    wasmfsOpfsDir: '/opfs',
    /**
       useStdAlloc is just for testing allocator discrepancies. The
       docs guarantee that this is false in the canonical builds. For
       99% of purposes it doesn't matter which allocators we use, but
       it becomes significant with, e.g., sqlite3_deserialize() and
       certain wasm.xWrap.resultAdapter()s.
    */
    useStdAlloc: false
  }, apiConfig || {});

  Object.assign(config, {
    allocExportName: config.useStdAlloc ? 'malloc' : 'sqlite3_malloc',
    deallocExportName: config.useStdAlloc ? 'free' : 'sqlite3_free',
    reallocExportName: config.useStdAlloc ? 'realloc' : 'sqlite3_realloc'
  }, config);

  [
    // If any of these config options are functions, replace them with
    // the result of calling that function...
    'exports', 'memory', 'wasmfsOpfsDir'
  ].forEach((k)=>{
    if('function' === typeof config[k]){
      config[k] = config[k]();
    }
  });
  /**
      The main sqlite3 binding API gets installed into this object,
      mimicking the C API as closely as we can. The numerous members
      names with prefixes 'sqlite3_' and 'SQLITE_' behave, insofar as
      possible, identically to the C-native counterparts, as documented at:

      https://www.sqlite.org/c3ref/intro.html

      A very few exceptions require an additional level of proxy
      function or may otherwise require special attention in the WASM
      environment, and all such cases are documented somewhere below
      in this file or in sqlite3-api-glue.js. capi members which are
      not documented are installed as 1-to-1 proxies for their
      C-side counterparts.
  */
  const capi = Object.create(null);
  /**
     Holds state which are specific to the WASM-related
     infrastructure and glue code.

     Note that a number of members of this object are injected
     dynamically after the api object is fully constructed, so
     not all are documented in this file.
  */
  const wasm = Object.create(null);

  /** Internal helper for SQLite3Error ctor. */
  const __rcStr = (rc)=>{
    return (capi.sqlite3_js_rc_str && capi.sqlite3_js_rc_str(rc))
           || ("Unknown result code #"+rc);
  };

  /** Internal helper for SQLite3Error ctor. */
  const __isInt = (n)=>'number'===typeof n && n===(n | 0);

  /**
     An Error subclass specifically for reporting DB-level errors and
     enabling clients to unambiguously identify such exceptions.
     The C-level APIs never throw, but some of the higher-level
     C-style APIs do and the object-oriented APIs use exceptions
     exclusively to report errors.
  */
  class SQLite3Error extends Error {
    /**
       Constructs this object with a message depending on its arguments:

       If its first argument is an integer, it is assumed to be
       an SQLITE_... result code and it is passed to
       sqlite3.capi.sqlite3_js_rc_str() to stringify it.

       If called with exactly 2 arguments and the 2nd is an object,
       that object is treated as the 2nd argument to the parent
       constructor.

       The exception's message is created by concatenating its
       arguments with a space between each, except for the
       two-args-with-an-objec form and that the first argument will
       get coerced to a string, as described above, if it's an
       integer.

       If passed an integer first argument, the error object's
       `resultCode` member will be set to the given integer value,
       else it will be set to capi.SQLITE_ERROR.
    */
    constructor(...args){
      let rc;
      if(args.length){
        if(__isInt(args[0])){
          rc = args[0];
          if(1===args.length){
            super(__rcStr(args[0]));
          }else{
            const rcStr = __rcStr(rc);
            if('object'===typeof args[1]){
              super(rcStr,args[1]);
            }else{
              args[0] = rcStr+':';
              super(args.join(' '));
            }
          }
        }else{
          if(2===args.length && 'object'===typeof args[1]){
            super(...args);
          }else{
            super(args.join(' '));
          }
        }
      }
      this.resultCode = rc || capi.SQLITE_ERROR;
      this.name = 'SQLite3Error';
    }
  };

  /**
     Functionally equivalent to the SQLite3Error constructor but may
     be used as part of an expression, e.g.:

     ```
     return someFunction(x) || SQLite3Error.toss(...);
     ```
  */
  SQLite3Error.toss = (...args)=>{
    throw new SQLite3Error(...args);
  };
  const toss3 = SQLite3Error.toss;

  if(config.wasmfsOpfsDir && !/^\/[^/]+$/.test(config.wasmfsOpfsDir)){
    toss3("config.wasmfsOpfsDir must be falsy or in the form '/dir-name'.");
  }

  /**
     Returns true if n is a 32-bit (signed) integer, else
     false. This is used for determining when we need to switch to
     double-type DB operations for integer values in order to keep
     more precision.
  */
  const isInt32 = (n)=>{
    return ('bigint'!==typeof n /*TypeError: can't convert BigInt to number*/)
      && !!(n===(n|0) && n<=2147483647 && n>=-2147483648);
  };
  /**
     Returns true if the given BigInt value is small enough to fit
     into an int64 value, else false.
  */
  const bigIntFits64 = function f(b){
    if(!f._max){
      f._max = BigInt("0x7fffffffffffffff");
      f._min = ~f._max;
    }
    return b >= f._min && b <= f._max;
  };

  /**
     Returns true if the given BigInt value is small enough to fit
     into an int32, else false.
  */
  const bigIntFits32 = (b)=>(b >= (-0x7fffffffn - 1n) && b <= 0x7fffffffn);

  /**
     Returns true if the given BigInt value is small enough to fit
     into a double value without loss of precision, else false.
  */
  const bigIntFitsDouble = function f(b){
    if(!f._min){
      f._min = Number.MIN_SAFE_INTEGER;
      f._max = Number.MAX_SAFE_INTEGER;
    }
    return b >= f._min && b <= f._max;
  };

  /** Returns v if v appears to be a TypedArray, else false. */
  const isTypedArray = (v)=>{
    return (v && v.constructor && isInt32(v.constructor.BYTES_PER_ELEMENT)) ? v : false;
  };


  /** Internal helper to use in operations which need to distinguish
      between TypedArrays which are backed by a SharedArrayBuffer
      from those which are not. */
  const __SAB = ('undefined'===typeof SharedArrayBuffer)
        ? function(){} : SharedArrayBuffer;
  /** Returns true if the given TypedArray object is backed by a
      SharedArrayBuffer, else false. */
  const isSharedTypedArray = (aTypedArray)=>(aTypedArray.buffer instanceof __SAB);

  /**
     Returns either aTypedArray.slice(begin,end) (if
     aTypedArray.buffer is a SharedArrayBuffer) or
     aTypedArray.subarray(begin,end) (if it's not).

     This distinction is important for APIs which don't like to
     work on SABs, e.g. TextDecoder, and possibly for our
     own APIs which work on memory ranges which "might" be
     modified by other threads while they're working.
  */
  const typedArrayPart = (aTypedArray, begin, end)=>{
    return isSharedTypedArray(aTypedArray)
      ? aTypedArray.slice(begin, end)
      : aTypedArray.subarray(begin, end);
  };

  /**
     Returns true if v appears to be one of our bind()-able TypedArray
     types: Uint8Array or Int8Array or ArrayBuffer. Support for
     TypedArrays with element sizes >1 is a potential TODO just
     waiting on a use case to justify them. Until then, their `buffer`
     property can be used to pass them as an ArrayBuffer. If it's not
     a bindable array type, a falsy value is returned.
  */
  const isBindableTypedArray = (v)=>{
    return v && (v instanceof Uint8Array
                 || v instanceof Int8Array
                 || v instanceof ArrayBuffer);
  };

  /**
     Returns true if v appears to be one of the TypedArray types
     which is legal for holding SQL code (as opposed to binary blobs).

     Currently this is the same as isBindableTypedArray() but it
     seems likely that we'll eventually want to add Uint32Array
     and friends to the isBindableTypedArray() list but not to the
     isSQLableTypedArray() list.
  */
  const isSQLableTypedArray = (v)=>{
    return v && (v instanceof Uint8Array
                 || v instanceof Int8Array
                 || v instanceof ArrayBuffer);
  };

  /** Returns true if isBindableTypedArray(v) does, else throws with a message
      that v is not a supported TypedArray value. */
  const affirmBindableTypedArray = (v)=>{
    return isBindableTypedArray(v)
      || toss3("Value is not of a supported TypedArray type.");
  };

  const utf8Decoder = new TextDecoder('utf-8');

  /**
     Uses TextDecoder to decode the given half-open range of the
     given TypedArray to a string. This differs from a simple
     call to TextDecoder in that it accounts for whether the
     first argument is backed by a SharedArrayBuffer or not,
     and can work more efficiently if it's not (TextDecoder
     refuses to act upon an SAB).
  */
  const typedArrayToString = function(typedArray, begin, end){
    return utf8Decoder.decode(typedArrayPart(typedArray, begin,end));
  };

  /**
     If v is-a Array, its join("") result is returned.  If
     isSQLableTypedArray(v) is true then typedArrayToString(v) is
     returned. If it looks like a WASM pointer, wasm.cstrToJs(v) is
     returned. Else v is returned as-is.
  */
  const flexibleString = function(v){
    if(isSQLableTypedArray(v)){
      return typedArrayToString(
        (v instanceof ArrayBuffer) ? new Uint8Array(v) : v
      );
    }
    else if(Array.isArray(v)) return v.join("");
    else if(wasm.isPtr(v)) v = wasm.cstrToJs(v);
    return v;
  };

  /**
     An Error subclass specifically for reporting Wasm-level malloc()
     failure and enabling clients to unambiguously identify such
     exceptions.
  */
  class WasmAllocError extends Error {
    /**
       If called with 2 arguments and the 2nd one is an object, it
       behaves like the Error constructor, else it concatenates all
       arguments together with a single space between each to
       construct an error message string. As a special case, if
       called with no arguments then it uses a default error
       message.
    */
    constructor(...args){
      if(2===args.length && 'object'===typeof args[1]){
        super(...args);
      }else if(args.length){
        super(args.join(' '));
      }else{
        super("Allocation failed.");
      }
      this.resultCode = capi.SQLITE_NOMEM;
      this.name = 'WasmAllocError';
    }
  };
  /**
     Functionally equivalent to the WasmAllocError constructor but may
     be used as part of an expression, e.g.:

     ```
     return someAllocatingFunction(x) || WasmAllocError.toss(...);
     ```
  */
  WasmAllocError.toss = (...args)=>{
    throw new WasmAllocError(...args);
  };

  Object.assign(capi, {
    /**
       sqlite3_bind_blob() works exactly like its C counterpart unless
       its 3rd argument is one of:

       - JS string: the 3rd argument is converted to a C string, the
         4th argument is ignored, and the C-string's length is used
         in its place.

       - Array: converted to a string as defined for "flexible
         strings" and then it's treated as a JS string.

       - Int8Array or Uint8Array: wasm.allocFromTypedArray() is used to
         conver the memory to the WASM heap. If the 4th argument is
         0 or greater, it is used as-is, otherwise the array's byteLength
         value is used. This is an exception to the C API's undefined
         behavior for a negative 4th argument, but results are undefined
         if the given 4th argument value is greater than the byteLength
         of the input array.

       - If it's an ArrayBuffer, it gets wrapped in a Uint8Array and
         treated as that type.

       In all of those cases, the final argument (destructor) is
       ignored and capi.SQLITE_WASM_DEALLOC is assumed.

       A 3rd argument of `null` is treated as if it were a WASM pointer
       of 0.

       If the 3rd argument is neither a WASM pointer nor one of the
       above-described types, capi.SQLITE_MISUSE is returned.

       The first argument may be either an `sqlite3_stmt*` WASM
       pointer or an sqlite3.oo1.Stmt instance.

       For consistency with the C API, it requires the same number of
       arguments. It returns capi.SQLITE_MISUSE if passed any other
       argument count.
    */
    sqlite3_bind_blob: undefined/*installed later*/,

    /**
       sqlite3_bind_text() works exactly like its C counterpart unless
       its 3rd argument is one of:

       - JS string: the 3rd argument is converted to a C string, the
         4th argument is ignored, and the C-string's length is used
         in its place.

       - Array: converted to a string as defined for "flexible
         strings". The 4th argument is ignored and a value of -1
         is assumed.

       - Int8Array or Uint8Array: is assumed to contain UTF-8 text, is
         converted to a string. The 4th argument is ignored, replaced
         by the array's byteLength value.

       - If it's an ArrayBuffer, it gets wrapped in a Uint8Array and
         treated as that type.

       In each of those cases, the final argument (text destructor) is
       ignored and capi.SQLITE_WASM_DEALLOC is assumed.

       A 3rd argument of `null` is treated as if it were a WASM pointer
       of 0.

       If the 3rd argument is neither a WASM pointer nor one of the
       above-described types, capi.SQLITE_MISUSE is returned.

       The first argument may be either an `sqlite3_stmt*` WASM
       pointer or an sqlite3.oo1.Stmt instance.

       For consistency with the C API, it requires the same number of
       arguments. It returns capi.SQLITE_MISUSE if passed any other
       argument count.

       If client code needs to bind partial strings, it needs to
       either parcel the string up before passing it in here or it
       must pass in a WASM pointer for the 3rd argument and a valid
       4th-argument value, taking care not to pass a value which
       truncates a multi-byte UTF-8 character. When passing
       WASM-format strings, it is important that the final argument be
       valid or unexpected content can result can result, or even a
       crash if the application reads past the WASM heap bounds.
    */
    sqlite3_bind_text: undefined/*installed later*/,

    /**
       sqlite3_create_function_v2() differs from its native
       counterpart only in the following ways:

       1) The fourth argument (`eTextRep`) argument must not specify
       any encoding other than sqlite3.SQLITE_UTF8. The JS API does not
       currently support any other encoding and likely never
       will. This function does not replace that argument on its own
       because it may contain other flags. As a special case, if
       the bottom 4 bits of that argument are 0, SQLITE_UTF8 is
       assumed.

       2) Any of the four final arguments may be either WASM pointers
       (assumed to be function pointers) or JS Functions. In the
       latter case, each gets bound to WASM using
       sqlite3.capi.wasm.installFunction() and that wrapper is passed
       on to the native implementation.

       For consistency with the C API, it requires the same number of
       arguments. It returns capi.SQLITE_MISUSE if passed any other
       argument count.

       The semantics of JS functions are:

       xFunc: is passed `(pCtx, ...values)`. Its return value becomes
       the new SQL function's result.

       xStep: is passed `(pCtx, ...values)`. Its return value is
       ignored.

       xFinal: is passed `(pCtx)`. Its return value becomes the new
       aggregate SQL function's result.

       xDestroy: is passed `(void*)`. Its return value is ignored. The
       pointer passed to it is the one from the 5th argument to
       sqlite3_create_function_v2().

       Note that:

       - `pCtx` in the above descriptions is a `sqlite3_context*`. At
         least 99 times out of a hundred, that initial argument will
         be irrelevant for JS UDF bindings, but it needs to be there
         so that the cases where it _is_ relevant, in particular with
         window and aggregate functions, have full access to the
         lower-level sqlite3 APIs.

       - When wrapping JS functions, the remaining arguments are passd
         to them as positional arguments, not as an array of
         arguments, because that allows callback definitions to be
         more JS-idiomatic than C-like. For example `(pCtx,a,b)=>a+b`
         is more intuitive and legible than
         `(pCtx,args)=>args[0]+args[1]`. For cases where an array of
         arguments would be more convenient, the callbacks simply need
         to be declared like `(pCtx,...args)=>{...}`, in which case
         `args` will be an array.

       - If a JS wrapper throws, it gets translated to
         sqlite3_result_error() or sqlite3_result_error_nomem(),
         depending on whether the exception is an
         sqlite3.WasmAllocError object or not.

       - When passing on WASM function pointers, arguments are _not_
         converted or reformulated. They are passed on as-is in raw
         pointer form using their native C signatures. Only JS
         functions passed in to this routine, and thus wrapped by this
         routine, get automatic conversions of arguments and result
         values. The routines which perform those conversions are
         exposed for client-side use as
         sqlite3_create_function_v2.convertUdfArgs() and
         sqlite3_create_function_v2.setUdfResult(). sqlite3_create_function()
         and sqlite3_create_window_function() have those same methods.

       For xFunc(), xStep(), and xFinal():

       - When called from SQL, arguments to the UDF, and its result,
         will be converted between JS and SQL with as much fidelity as
         is feasible, triggering an exception if a type conversion
         cannot be determined. Some freedom is afforded to numeric
         conversions due to friction between the JS and C worlds:
         integers which are larger than 32 bits may be treated as
         doubles or BigInts.

       If any JS-side bound functions throw, those exceptions are
       intercepted and converted to database-side errors with the
       exception of xDestroy(): any exception from it is ignored,
       possibly generating a console.error() message.  Destructors
       must not throw.

       Once installed, there is currently no way to uninstall the
       automatically-converted WASM-bound JS functions from WASM. They
       can be uninstalled from the database as documented in the C
       API, but this wrapper currently has no infrastructure in place
       to also free the WASM-bound JS wrappers, effectively resulting
       in a memory leak if the client uninstalls the UDF. Improving that
       is a potential TODO, but removing client-installed UDFs is rare
       in practice. If this factor is relevant for a given client,
       they can create WASM-bound JS functions themselves, hold on to their
       pointers, and pass the pointers in to here. Later on, they can
       free those pointers (using `wasm.uninstallFunction()` or
       equivalent).

       C reference: https://www.sqlite.org/c3ref/create_function.html

       Maintenance reminder: the ability to add new
       WASM-accessible functions to the runtime requires that the
       WASM build is compiled with emcc's `-sALLOW_TABLE_GROWTH`
       flag.
    */
    sqlite3_create_function_v2: (
      pDb, funcName, nArg, eTextRep, pApp,
      xFunc, xStep, xFinal, xDestroy
    )=>{/*installed later*/},
    /**
       Equivalent to passing the same arguments to
       sqlite3_create_function_v2(), with 0 as the final argument.
    */
    sqlite3_create_function: (
      pDb, funcName, nArg, eTextRep, pApp,
      xFunc, xStep, xFinal
    )=>{/*installed later*/},
    /**
       The sqlite3_create_window_function() JS wrapper differs from
       its native implementation in the exact same way that
       sqlite3_create_function_v2() does. The additional function,
       xInverse(), is treated identically to xStep() by the wrapping
       layer.
    */
    sqlite3_create_window_function: (
      pDb, funcName, nArg, eTextRep, pApp,
      xStep, xFinal, xValue, xInverse, xDestroy
    )=>{/*installed later*/},
    /**
       The sqlite3_prepare_v3() binding handles two different uses
       with differing JS/WASM semantics:

       1) sqlite3_prepare_v3(pDb, sqlString, -1, prepFlags, ppStmt , null)

       2) sqlite3_prepare_v3(pDb, sqlPointer, sqlByteLen, prepFlags, ppStmt, sqlPointerToPointer)

       Note that the SQL length argument (the 3rd argument) must, for
       usage (1), always be negative because it must be a byte length
       and that value is expensive to calculate from JS (where only
       the character length of strings is readily available). It is
       retained in this API's interface for code/documentation
       compatibility reasons but is currently _always_ ignored. With
       usage (2), the 3rd argument is used as-is but is is still
       critical that the C-style input string (2nd argument) be
       terminated with a 0 byte.

       In usage (1), the 2nd argument must be of type string,
       Uint8Array, Int8Array, or ArrayBuffer (all of which are assumed
       to hold SQL). If it is, this function assumes case (1) and
       calls the underyling C function with the equivalent of:

       (pDb, sqlAsString, -1, prepFlags, ppStmt, null)

       The `pzTail` argument is ignored in this case because its
       result is meaningless when a string-type value is passed
       through: the string goes through another level of internal
       conversion for WASM's sake and the result pointer would refer
       to that transient conversion's memory, not the passed-in
       string.

       If the sql argument is not a string, it must be a _pointer_ to
       a NUL-terminated string which was allocated in the WASM memory
       (e.g. using capi.wasm.alloc() or equivalent). In that case,
       the final argument may be 0/null/undefined or must be a pointer
       to which the "tail" of the compiled SQL is written, as
       documented for the C-side sqlite3_prepare_v3(). In case (2),
       the underlying C function is called with the equivalent of:

       (pDb, sqlAsPointer, sqlByteLen, prepFlags, ppStmt, pzTail)

       It returns its result and compiled statement as documented in
       the C API. Fetching the output pointers (5th and 6th
       parameters) requires using `capi.wasm.peek()` (or
       equivalent) and the `pzTail` will point to an address relative to
       the `sqlAsPointer` value.

       If passed an invalid 2nd argument type, this function will
       return SQLITE_MISUSE and sqlite3_errmsg() will contain a string
       describing the problem.

       Side-note: if given an empty string, or one which contains only
       comments or an empty SQL expression, 0 is returned but the result
       output pointer will be NULL.
    */
    sqlite3_prepare_v3: (dbPtr, sql, sqlByteLen, prepFlags,
                         stmtPtrPtr, strPtrPtr)=>{}/*installed later*/,

    /**
       Equivalent to calling sqlite3_prapare_v3() with 0 as its 4th argument.
    */
    sqlite3_prepare_v2: (dbPtr, sql, sqlByteLen,
                         stmtPtrPtr,strPtrPtr)=>{}/*installed later*/,

    /**
       This binding enables the callback argument to be a JavaScript.

       If the callback is a function, then for the duration of the
       sqlite3_exec() call, it installs a WASM-bound function which
       acts as a proxy for the given callback. That proxy will also
       perform a conversion of the callback's arguments from
       `(char**)` to JS arrays of strings. However, for API
       consistency's sake it will still honor the C-level callback
       parameter order and will call it like:

       `callback(pVoid, colCount, listOfValues, listOfColNames)`

       If the callback is not a JS function then this binding performs
       no translation of the callback, but the sql argument is still
       converted to a WASM string for the call using the
       "string:flexible" argument converter.
    */
    sqlite3_exec: (pDb, sql, callback, pVoid, pErrMsg)=>{}/*installed later*/,

    /**
       If passed a single argument which appears to be a byte-oriented
       TypedArray (Int8Array or Uint8Array), this function treats that
       TypedArray as an output target, fetches `theArray.byteLength`
       bytes of randomness, and populates the whole array with it. As
       a special case, if the array's length is 0, this function
       behaves as if it were passed (0,0). When called this way, it
       returns its argument, else it returns the `undefined` value.

       If called with any other arguments, they are passed on as-is
       to the C API. Results are undefined if passed any incompatible
       values.
     */
    sqlite3_randomness: (n, outPtr)=>{/*installed later*/},
  }/*capi*/);

  /**
     Various internal-use utilities are added here as needed. They
     are bound to an object only so that we have access to them in
     the differently-scoped steps of the API bootstrapping
     process. At the end of the API setup process, this object gets
     removed. These are NOT part of the public API.
  */
  const util = {
    affirmBindableTypedArray, flexibleString,
    bigIntFits32, bigIntFits64, bigIntFitsDouble,
    isBindableTypedArray,
    isInt32, isSQLableTypedArray, isTypedArray,
    typedArrayToString,
    isUIThread: ()=>(globalThis.window===globalThis && !!globalThis.document),
    // is this true for ESM?: 'undefined'===typeof WorkerGlobalScope
    isSharedTypedArray,
    toss: function(...args){throw new Error(args.join(' '))},
    toss3,
    typedArrayPart,
    /**
       Given a byte array or ArrayBuffer, this function throws if the
       lead bytes of that buffer do not hold a SQLite3 database header,
       else it returns without side effects.

       Added in 3.44.
    */
    affirmDbHeader: function(bytes){
      if(bytes instanceof ArrayBuffer) bytes = new Uint8Array(bytes);
      const header = "SQLite format 3";
      if( header.length > bytes.byteLength ){
        toss3("Input does not contain an SQLite3 database header.");
      }
      for(let i = 0; i < header.length; ++i){
        if( header.charCodeAt(i) !== bytes[i] ){
          toss3("Input does not contain an SQLite3 database header.");
        }
      }
    },
    /**
       Given a byte array or ArrayBuffer, this function throws if the
       database does not, at a cursory glance, appear to be an SQLite3
       database. It only examines the size and header, but further
       checks may be added in the future.

       Added in 3.44.
    */
    affirmIsDb: function(bytes){
      if(bytes instanceof ArrayBuffer) bytes = new Uint8Array(bytes);
      const n = bytes.byteLength;
      if(n<512 || n%512!==0) {
        toss3("Byte array size",n,"is invalid for an SQLite3 db.");
      }
      util.affirmDbHeader(bytes);
    }
  }/*util*/;

  Object.assign(wasm, {
    /**
       Emscripten APIs have a deep-seated assumption that all pointers
       are 32 bits. We'll remain optimistic that that won't always be
       the case and will use this constant in places where we might
       otherwise use a hard-coded 4.
    */
    ptrSizeof: config.wasmPtrSizeof || 4,
    /**
       The WASM IR (Intermediate Representation) value for
       pointer-type values. It MUST refer to a value type of the
       size described by this.ptrSizeof.
    */
    ptrIR: config.wasmPtrIR || "i32",
    /**
       True if BigInt support was enabled via (e.g.) the
       Emscripten -sWASM_BIGINT flag, else false. When
       enabled, certain 64-bit sqlite3 APIs are enabled which
       are not otherwise enabled due to JS/WASM int64
       impedence mismatches.
    */
    bigIntEnabled: !!config.bigIntEnabled,
    /**
       The symbols exported by the WASM environment.
    */
    exports: config.exports
      || toss3("Missing API config.exports (WASM module exports)."),

    /**
       When Emscripten compiles with `-sIMPORTED_MEMORY`, it
       initalizes the heap and imports it into wasm, as opposed to
       the other way around. In this case, the memory is not
       available via this.exports.memory.
    */
    memory: config.memory || config.exports['memory']
      || toss3("API config object requires a WebAssembly.Memory object",
              "in either config.exports.memory (exported)",
              "or config.memory (imported)."),

    /**
       The API's primary point of access to the WASM-side memory
       allocator.  Works like sqlite3_malloc() but throws a
       WasmAllocError if allocation fails. It is important that any
       code which might pass through the sqlite3 C API NOT throw and
       must instead return SQLITE_NOMEM (or equivalent, depending on
       the context).

       Very few cases in the sqlite3 JS APIs can result in
       client-defined functions propagating exceptions via the C-style
       API. Most notably, this applies to WASM-bound JS functions
       which are created directly by clients and passed on _as WASM
       function pointers_ to functions such as
       sqlite3_create_function_v2(). Such bindings created
       transparently by this API will automatically use wrappers which
       catch exceptions and convert them to appropriate error codes.

       For cases where non-throwing allocation is required, use
       this.alloc.impl(), which is direct binding of the
       underlying C-level allocator.

       Design note: this function is not named "malloc" primarily
       because Emscripten uses that name and we wanted to avoid any
       confusion early on in this code's development, when it still
       had close ties to Emscripten's glue code.
    */
    alloc: undefined/*installed later*/,

    /**
       Rarely necessary in JS code, this routine works like
       sqlite3_realloc(M,N), where M is either NULL or a pointer
       obtained from this function or this.alloc() and N is the number
       of bytes to reallocate the block to. Returns a pointer to the
       reallocated block or 0 if allocation fails.

       If M is NULL and N is positive, this behaves like
       this.alloc(N). If N is 0, it behaves like this.dealloc().
       Results are undefined if N is negative (sqlite3_realloc()
       treats that as 0, but if this code is built with a different
       allocator it may misbehave with negative values).

       Like this.alloc.impl(), this.realloc.impl() is a direct binding
       to the underlying realloc() implementation which does not throw
       exceptions, instead returning 0 on allocation error.
    */
    realloc: undefined/*installed later*/,

    /**
       The API's primary point of access to the WASM-side memory
       deallocator. Works like sqlite3_free().

       Design note: this function is not named "free" for the same
       reason that this.alloc() is not called this.malloc().
    */
    dealloc: undefined/*installed later*/

    /* Many more wasm-related APIs get installed later on. */
  }/*wasm*/);

  /**
     wasm.alloc()'s srcTypedArray.byteLength bytes,
     populates them with the values from the source
     TypedArray, and returns the pointer to that memory. The
     returned pointer must eventually be passed to
     wasm.dealloc() to clean it up.

     The argument may be a Uint8Array, Int8Array, or ArrayBuffer,
     and it throws if passed any other type.

     As a special case, to avoid further special cases where
     this is used, if srcTypedArray.byteLength is 0, it
     allocates a single byte and sets it to the value
     0. Even in such cases, calls must behave as if the
     allocated memory has exactly srcTypedArray.byteLength
     bytes.
  */
  wasm.allocFromTypedArray = function(srcTypedArray){
    if(srcTypedArray instanceof ArrayBuffer){
      srcTypedArray = new Uint8Array(srcTypedArray);
    }
    affirmBindableTypedArray(srcTypedArray);
    const pRet = wasm.alloc(srcTypedArray.byteLength || 1);
    wasm.heapForSize(srcTypedArray.constructor).set(
      srcTypedArray.byteLength ? srcTypedArray : [0], pRet
    );
    return pRet;
  };

  {
    // Set up allocators...
    const keyAlloc = config.allocExportName,
          keyDealloc = config.deallocExportName,
          keyRealloc = config.reallocExportName;
    for(const key of [keyAlloc, keyDealloc, keyRealloc]){
      const f = wasm.exports[key];
      if(!(f instanceof Function)) toss3("Missing required exports[",key,"] function.");
    }

    wasm.alloc = function f(n){
      return f.impl(n) || WasmAllocError.toss("Failed to allocate",n," bytes.");
    };
    wasm.alloc.impl = wasm.exports[keyAlloc];
    wasm.realloc = function f(m,n){
      const m2 = f.impl(m,n);
      return n ? (m2 || WasmAllocError.toss("Failed to reallocate",n," bytes.")) : 0;
    };
    wasm.realloc.impl = wasm.exports[keyRealloc];
    wasm.dealloc = wasm.exports[keyDealloc];
  }

  /**
     Reports info about compile-time options using
     sqlite3_compileoption_get() and sqlite3_compileoption_used(). It
     has several distinct uses:

     If optName is an array then it is expected to be a list of
     compilation options and this function returns an object
     which maps each such option to true or false, indicating
     whether or not the given option was included in this
     build. That object is returned.

     If optName is an object, its keys are expected to be compilation
     options and this function sets each entry to true or false,
     indicating whether the compilation option was used or not. That
     object is returned.

     If passed no arguments then it returns an object mapping
     all known compilation options to their compile-time values,
     or boolean true if they are defined with no value. This
     result, which is relatively expensive to compute, is cached
     and returned for future no-argument calls.

     In all other cases it returns true if the given option was
     active when when compiling the sqlite3 module, else false.

     Compile-time option names may optionally include their
     "SQLITE_" prefix. When it returns an object of all options,
     the prefix is elided.
  */
  wasm.compileOptionUsed = function f(optName){
    if(!arguments.length){
      if(f._result) return f._result;
      else if(!f._opt){
        f._rx = /^([^=]+)=(.+)/;
        f._rxInt = /^-?\d+$/;
        f._opt = function(opt, rv){
          const m = f._rx.exec(opt);
          rv[0] = (m ? m[1] : opt);
          rv[1] = m ? (f._rxInt.test(m[2]) ? +m[2] : m[2]) : true;
        };
      }
      const rc = {}, ov = [0,0];
      let i = 0, k;
      while((k = capi.sqlite3_compileoption_get(i++))){
        f._opt(k,ov);
        rc[ov[0]] = ov[1];
      }
      return f._result = rc;
    }else if(Array.isArray(optName)){
      const rc = {};
      optName.forEach((v)=>{
        rc[v] = capi.sqlite3_compileoption_used(v);
      });
      return rc;
    }else if('object' === typeof optName){
      Object.keys(optName).forEach((k)=> {
        optName[k] = capi.sqlite3_compileoption_used(k);
      });
      return optName;
    }
    return (
      'string'===typeof optName
    ) ? !!capi.sqlite3_compileoption_used(optName) : false;
  }/*compileOptionUsed()*/;

  /**
     sqlite3.wasm.pstack (pseudo-stack) holds a special-case
     stack-style allocator intended only for use with _small_ data of
     not more than (in total) a few kb in size, managed as if it were
     stack-based.

     It has only a single intended usage:

     ```
     const stackPos = pstack.pointer;
     try{
       const ptr = pstack.alloc(8);
       // ==> pstack.pointer === ptr
       const otherPtr = pstack.alloc(8);
       // ==> pstack.pointer === otherPtr
       ...
     }finally{
       pstack.restore(stackPos);
       // ==> pstack.pointer === stackPos
     }
     ```

     This allocator is much faster than a general-purpose one but is
     limited to usage patterns like the one shown above.

     It operates from a static range of memory which lives outside of
     space managed by Emscripten's stack-management, so does not
     collide with Emscripten-provided stack allocation APIs. The
     memory lives in the WASM heap and can be used with routines such
     as wasm.poke() and wasm.heap8u().slice().
  */
  wasm.pstack = Object.assign(Object.create(null),{
    /**
       Sets the current pstack position to the given pointer. Results
       are undefined if the passed-in value did not come from
       this.pointer.
    */
    restore: wasm.exports.sqlite3_wasm_pstack_restore,
    /**
       Attempts to allocate the given number of bytes from the
       pstack. On success, it zeroes out a block of memory of the
       given size, adjusts the pstack pointer, and returns a pointer
       to the memory. On error, throws a WasmAllocError. The
       memory must eventually be released using restore().

       If n is a string, it must be a WASM "IR" value in the set
       accepted by wasm.sizeofIR(), which is mapped to the size of
       that data type. If passed a string not in that set, it throws a
       WasmAllocError.

       This method always adjusts the given value to be a multiple
       of 8 bytes because failing to do so can lead to incorrect
       results when reading and writing 64-bit values from/to the WASM
       heap. Similarly, the returned address is always 8-byte aligned.
    */
    alloc: function(n){
      if('string'===typeof n && !(n = wasm.sizeofIR(n))){
        WasmAllocError.toss("Invalid value for pstack.alloc(",arguments[0],")");
      }
      return wasm.exports.sqlite3_wasm_pstack_alloc(n)
        || WasmAllocError.toss("Could not allocate",n,
                               "bytes from the pstack.");
    },
    /**
       alloc()'s n chunks, each sz bytes, as a single memory block and
       returns the addresses as an array of n element, each holding
       the address of one chunk.

       sz may optionally be an IR string accepted by wasm.sizeofIR().

       Throws a WasmAllocError if allocation fails.

       Example:

       ```
       const [p1, p2, p3] = wasm.pstack.allocChunks(3,4);
       ```
    */
    allocChunks: function(n,sz){
      if('string'===typeof sz && !(sz = wasm.sizeofIR(sz))){
        WasmAllocError.toss("Invalid size value for allocChunks(",arguments[1],")");
      }
      const mem = wasm.pstack.alloc(n * sz);
      const rc = [];
      let i = 0, offset = 0;
      for(; i < n; ++i, offset += sz) rc.push(mem + offset);
      return rc;
    },
    /**
       A convenience wrapper for allocChunks() which sizes each chunk
       as either 8 bytes (safePtrSize is truthy) or wasm.ptrSizeof (if
       safePtrSize is falsy).

       How it returns its result differs depending on its first
       argument: if it's 1, it returns a single pointer value. If it's
       more than 1, it returns the same as allocChunks().

       When a returned pointers will refer to a 64-bit value, e.g. a
       double or int64, and that value must be written or fetched,
       e.g. using wasm.poke() or wasm.peek(), it is
       important that the pointer in question be aligned to an 8-byte
       boundary or else it will not be fetched or written properly and
       will corrupt or read neighboring memory.

       However, when all pointers involved point to "small" data, it
       is safe to pass a falsy value to save a tiny bit of memory.
    */
    allocPtr: (n=1,safePtrSize=true)=>{
      return 1===n
        ? wasm.pstack.alloc(safePtrSize ? 8 : wasm.ptrSizeof)
        : wasm.pstack.allocChunks(n, safePtrSize ? 8 : wasm.ptrSizeof);
    },

    /**
       Records the current pstack position, calls the given function,
       passing it the sqlite3 object, then restores the pstack
       regardless of whether the function throws. Returns the result
       of the call or propagates an exception on error.

       Added in 3.44.
    */
    call: function(f){
      const stackPos = wasm.pstack.pointer;
      try{ return f(sqlite3) } finally{
        wasm.pstack.restore(stackPos);
      }
    }

  })/*wasm.pstack*/;
  Object.defineProperties(wasm.pstack, {
    /**
       sqlite3.wasm.pstack.pointer resolves to the current pstack
       position pointer. This value is intended _only_ to be saved
       for passing to restore(). Writing to this memory, without
       first reserving it via wasm.pstack.alloc() and friends, leads
       to undefined results.
    */
    pointer: {
      configurable: false, iterable: true, writeable: false,
      get: wasm.exports.sqlite3_wasm_pstack_ptr
      //Whether or not a setter as an alternative to restore() is
      //clearer or would just lead to confusion is unclear.
      //set: wasm.exports.sqlite3_wasm_pstack_restore
    },
    /**
       sqlite3.wasm.pstack.quota to the total number of bytes
       available in the pstack, including any space which is currently
       allocated. This value is a compile-time constant.
    */
    quota: {
      configurable: false, iterable: true, writeable: false,
      get: wasm.exports.sqlite3_wasm_pstack_quota
    },
    /**
       sqlite3.wasm.pstack.remaining resolves to the amount of space
       remaining in the pstack.
    */
    remaining: {
      configurable: false, iterable: true, writeable: false,
      get: wasm.exports.sqlite3_wasm_pstack_remaining
    }
  })/*wasm.pstack properties*/;

  capi.sqlite3_randomness = (...args)=>{
    if(1===args.length && util.isTypedArray(args[0])
      && 1===args[0].BYTES_PER_ELEMENT){
      const ta = args[0];
      if(0===ta.byteLength){
        wasm.exports.sqlite3_randomness(0,0);
        return ta;
      }
      const stack = wasm.pstack.pointer;
      try {
        let n = ta.byteLength, offset = 0;
        const r = wasm.exports.sqlite3_randomness;
        const heap = wasm.heap8u();
        const nAlloc = n < 512 ? n : 512;
        const ptr = wasm.pstack.alloc(nAlloc);
        do{
          const j = (n>nAlloc ? nAlloc : n);
          r(j, ptr);
          ta.set(typedArrayPart(heap, ptr, ptr+j), offset);
          n -= j;
          offset += j;
        } while(n > 0);
      }catch(e){
        console.error("Highly unexpected (and ignored!) "+
                      "exception in sqlite3_randomness():",e);
      }finally{
        wasm.pstack.restore(stack);
      }
      return ta;
    }
    wasm.exports.sqlite3_randomness(...args);
  };

  /** State for sqlite3_wasmfs_opfs_dir(). */
  let __wasmfsOpfsDir = undefined;
  /**
     If the wasm environment has a WASMFS/OPFS-backed persistent
     storage directory, its path is returned by this function. If it
     does not then it returns "" (noting that "" is a falsy value).

     The first time this is called, this function inspects the current
     environment to determine whether persistence support is available
     and, if it is, enables it (if needed). After the first call it
     always returns the cached result.

     If the returned string is not empty, any files stored under the
     given path (recursively) are housed in OPFS storage. If the
     returned string is empty, this particular persistent storage
     option is not available on the client.

     Though the mount point name returned by this function is intended
     to remain stable, clients should not hard-coded it anywhere. Always call this function to get the path.

     Note that this function is a no-op in must builds of this
     library, as the WASMFS capability requires a custom
     build.
  */
  capi.sqlite3_wasmfs_opfs_dir = function(){
    if(undefined !== __wasmfsOpfsDir) return __wasmfsOpfsDir;
    // If we have no OPFS, there is no persistent dir
    const pdir = config.wasmfsOpfsDir;
    if(!pdir
       || !globalThis.FileSystemHandle
       || !globalThis.FileSystemDirectoryHandle
       || !globalThis.FileSystemFileHandle){
      return __wasmfsOpfsDir = "";
    }
    try{
      if(pdir && 0===wasm.xCallWrapped(
        'sqlite3_wasm_init_wasmfs', 'i32', ['string'], pdir
      )){
        return __wasmfsOpfsDir = pdir;
      }else{
        return __wasmfsOpfsDir = "";
      }
    }catch(e){
      // sqlite3_wasm_init_wasmfs() is not available
      return __wasmfsOpfsDir = "";
    }
  };

  /**
     Returns true if sqlite3.capi.sqlite3_wasmfs_opfs_dir() is a
     non-empty string and the given name starts with (that string +
     '/'), else returns false.
  */
  capi.sqlite3_wasmfs_filename_is_persistent = function(name){
    const p = capi.sqlite3_wasmfs_opfs_dir();
    return (p && name) ? name.startsWith(p+'/') : false;
  };

  /**
     Given an `sqlite3*`, an sqlite3_vfs name, and an optional db name
     (defaulting to "main"), returns a truthy value (see below) if
     that db uses that VFS, else returns false. If pDb is falsy then
     the 3rd argument is ignored and this function returns a truthy
     value if the default VFS name matches that of the 2nd
     argument. Results are undefined if pDb is truthy but refers to an
     invalid pointer. The 3rd argument specifies the database name of
     the given database connection to check, defaulting to the main
     db.

     The 2nd and 3rd arguments may either be a JS string or a WASM
     C-string. If the 2nd argument is a NULL WASM pointer, the default
     VFS is assumed. If the 3rd is a NULL WASM pointer, "main" is
     assumed.

     The truthy value it returns is a pointer to the `sqlite3_vfs`
     object.

     To permit safe use of this function from APIs which may be called
     via the C stack (like SQL UDFs), this function does not throw: if
     bad arguments cause a conversion error when passing into
     wasm-space, false is returned.
  */
  capi.sqlite3_js_db_uses_vfs = function(pDb,vfsName,dbName=0){
    try{
      const pK = capi.sqlite3_vfs_find(vfsName);
      if(!pK) return false;
      else if(!pDb){
        return pK===capi.sqlite3_vfs_find(0) ? pK : false;
      }else{
        return pK===capi.sqlite3_js_db_vfs(pDb,dbName) ? pK : false;
      }
    }catch(e){
      /* Ignore - probably bad args to a wasm-bound function. */
      return false;
    }
  };

  /**
     Returns an array of the names of all currently-registered sqlite3
     VFSes.
  */
  capi.sqlite3_js_vfs_list = function(){
    const rc = [];
    let pVfs = capi.sqlite3_vfs_find(0);
    while(pVfs){
      const oVfs = new capi.sqlite3_vfs(pVfs);
      rc.push(wasm.cstrToJs(oVfs.$zName));
      pVfs = oVfs.$pNext;
      oVfs.dispose();
    }
    return rc;
  };

  /**
     A convenience wrapper around sqlite3_serialize() which serializes
     the given `sqlite3*` pointer to a Uint8Array. The first argument
     may be either an `sqlite3*` or an sqlite3.oo1.DB instance.

     On success it returns a Uint8Array. If the schema is empty, an
     empty array is returned.

     `schema` is the schema to serialize. It may be a WASM C-string
     pointer or a JS string. If it is falsy, it defaults to `"main"`.

     On error it throws with a description of the problem.
  */
  capi.sqlite3_js_db_export = function(pDb, schema=0){
    pDb = wasm.xWrap.testConvertArg('sqlite3*', pDb);
    if(!pDb) toss3('Invalid sqlite3* argument.');
    if(!wasm.bigIntEnabled) toss3('BigInt64 support is not enabled.');
    const scope = wasm.scopedAllocPush();
    let pOut;
    try{
      const pSize = wasm.scopedAlloc(8/*i64*/ + wasm.ptrSizeof);
      const ppOut = pSize + 8;
      /**
         Maintenance reminder, since this cost a full hour of grief
         and confusion: if the order of pSize/ppOut are reversed in
         that memory block, fetching the value of pSize after the
         export reads a garbage size because it's not on an 8-byte
         memory boundary!
      */
      const zSchema = schema
            ? (wasm.isPtr(schema) ? schema : wasm.scopedAllocCString(''+schema))
            : 0;
      let rc = wasm.exports.sqlite3_wasm_db_serialize(
        pDb, zSchema, ppOut, pSize, 0
      );
      if(rc){
        toss3("Database serialization failed with code",
             sqlite3.capi.sqlite3_js_rc_str(rc));
      }
      pOut = wasm.peekPtr(ppOut);
      const nOut = wasm.peek(pSize, 'i64');
      rc = nOut
        ? wasm.heap8u().slice(pOut, pOut + Number(nOut))
        : new Uint8Array();
      return rc;
    }finally{
      if(pOut) wasm.exports.sqlite3_free(pOut);
      wasm.scopedAllocPop(scope);
    }
  };

  /**
     Given a `sqlite3*` and a database name (JS string or WASM
     C-string pointer, which may be 0), returns a pointer to the
     sqlite3_vfs responsible for it. If the given db name is null/0,
     or not provided, then "main" is assumed.
  */
  capi.sqlite3_js_db_vfs =
    (dbPointer, dbName=0)=>wasm.sqlite3_wasm_db_vfs(dbPointer, dbName);

  /**
     A thin wrapper around capi.sqlite3_aggregate_context() which
     behaves the same except that it throws a WasmAllocError if that
     function returns 0. As a special case, if n is falsy it does
     _not_ throw if that function returns 0. That special case is
     intended for use with xFinal() implementations.
  */
  capi.sqlite3_js_aggregate_context = (pCtx, n)=>{
    return capi.sqlite3_aggregate_context(pCtx, n)
      || (n ? WasmAllocError.toss("Cannot allocate",n,
                                  "bytes for sqlite3_aggregate_context()")
          : 0);
  };

  /**
     If the current environment supports the POSIX file APIs, this routine
     creates (or overwrites) the given file using those APIs. This is
     primarily intended for use in Emscripten-based builds where the POSIX
     APIs are transparently proxied by an in-memory virtual filesystem.
     It may behave diffrently in other environments.

     The first argument must be either a JS string or WASM C-string
     holding the filename. Note that this routine does _not_ create
     intermediary directories if the filename has a directory part.

     The 2nd argument may either a valid WASM memory pointer, an
     ArrayBuffer, or a Uint8Array. The 3rd must be the length, in
     bytes, of the data array to copy. If the 2nd argument is an
     ArrayBuffer or Uint8Array and the 3rd is not a positive integer
     then the 3rd defaults to the array's byteLength value.

     Results are undefined if data is a WASM pointer and dataLen is
     exceeds data's bounds.

     Throws if any arguments are invalid or if creating or writing to
     the file fails.

     Added in 3.43 as an alternative for the deprecated
     sqlite3_js_vfs_create_file().
  */
  capi.sqlite3_js_posix_create_file = function(filename, data, dataLen){
    let pData;
    if(data && wasm.isPtr(data)){
      pData = data;
    }else if(data instanceof ArrayBuffer || data instanceof Uint8Array){
      pData = wasm.allocFromTypedArray(data);
      if(arguments.length<3 || !util.isInt32(dataLen) || dataLen<0){
        dataLen = data.byteLength;
      }
    }else{
      SQLite3Error.toss("Invalid 2nd argument for sqlite3_js_posix_create_file().");
    }
    try{
      if(!util.isInt32(dataLen) || dataLen<0){
        SQLite3Error.toss("Invalid 3rd argument for sqlite3_js_posix_create_file().");
      }
      const rc = wasm.sqlite3_wasm_posix_create_file(filename, pData, dataLen);
      if(rc) SQLite3Error.toss("Creation of file failed with sqlite3 result code",
                               capi.sqlite3_js_rc_str(rc));
    }finally{
       wasm.dealloc(pData);
    }
  };

  /**
     Deprecation warning: this function does not work properly in
     debug builds of sqlite3 because its out-of-scope use of the
     sqlite3_vfs API triggers assertions in the core library.  That
     was unfortunately not discovered until 2023-08-11. This function
     is now deprecated and should not be used in new code.

     Alternative options:

     - "unix" VFS and its variants can get equivalent functionality
       with sqlite3_js_posix_create_file().

     - OPFS: use either sqlite3.oo1.OpfsDb.importDb(), for the "opfs"
       VFS, or the importDb() method of the PoolUtil object provided
       by the "opfs-sahpool" OPFS (noting that its VFS name may differ
       depending on client-side configuration). We cannot proxy those
       from here because the former is necessarily asynchronous and
       the latter requires information not available to this function.

     Creates a file using the storage appropriate for the given
     sqlite3_vfs.  The first argument may be a VFS name (JS string
     only, NOT a WASM C-string), WASM-managed `sqlite3_vfs*`, or
     a capi.sqlite3_vfs instance. Pass 0 (a NULL pointer) to use the
     default VFS. If passed a string which does not resolve using
     sqlite3_vfs_find(), an exception is thrown. (Note that a WASM
     C-string is not accepted because it is impossible to
     distinguish from a C-level `sqlite3_vfs*`.)

     The second argument, the filename, must be a JS or WASM C-string.

     The 3rd may either be falsy, a valid WASM memory pointer, an
     ArrayBuffer, or a Uint8Array. The 4th must be the length, in
     bytes, of the data array to copy. If the 3rd argument is an
     ArrayBuffer or Uint8Array and the 4th is not a positive integer
     then the 4th defaults to the array's byteLength value.

     If data is falsy then a file is created with dataLen bytes filled
     with uninitialized data (whatever truncate() leaves there). If
     data is not falsy then a file is created or truncated and it is
     filled with the first dataLen bytes of the data source.

     Throws if any arguments are invalid or if creating or writing to
     the file fails.

     Note that most VFSes do _not_ automatically create directory
     parts of filenames, nor do all VFSes have a concept of
     directories.  If the given filename is not valid for the given
     VFS, an exception will be thrown. This function exists primarily
     to assist in implementing file-upload capability, with the caveat
     that clients must have some idea of the VFS into which they want
     to upload and that VFS must support the operation.

     VFS-specific notes:

     - "memdb": results are undefined.

     - "kvvfs": will fail with an I/O error due to strict internal
       requirments of that VFS's xTruncate().

     - "unix" and related: will use the WASM build's equivalent of the
       POSIX I/O APIs. This will work so long as neither a specific
       VFS nor the WASM environment imposes requirements which break it.

     - "opfs": uses OPFS storage and creates directory parts of the
       filename. It can only be used to import an SQLite3 database
       file and will fail if given anything else.
  */
  capi.sqlite3_js_vfs_create_file = function(vfs, filename, data, dataLen){
    config.warn("sqlite3_js_vfs_create_file() is deprecated and",
                "should be avoided because it can lead to C-level crashes.",
                "See its documentation for alternative options.");
    let pData;
    if(data){
      if(wasm.isPtr(data)){
        pData = data;
      }else if(data instanceof ArrayBuffer){
        data = new Uint8Array(data);
      }
      if(data instanceof Uint8Array){
        pData = wasm.allocFromTypedArray(data);
        if(arguments.length<4 || !util.isInt32(dataLen) || dataLen<0){
          dataLen = data.byteLength;
        }
      }else{
        SQLite3Error.toss("Invalid 3rd argument type for sqlite3_js_vfs_create_file().");
      }
    }else{
       pData = 0;
    }
    if(!util.isInt32(dataLen) || dataLen<0){
      wasm.dealloc(pData);
      SQLite3Error.toss("Invalid 4th argument for sqlite3_js_vfs_create_file().");
    }
    try{
      const rc = wasm.sqlite3_wasm_vfs_create_file(vfs, filename, pData, dataLen);
      if(rc) SQLite3Error.toss("Creation of file failed with sqlite3 result code",
                               capi.sqlite3_js_rc_str(rc));
    }finally{
       wasm.dealloc(pData);
    }
  };

  /**
     Converts SQL input from a variety of convenient formats
     to plain strings.

     If v is a string, it is returned as-is. If it is-a Array, its
     join("") result is returned.  If is is a Uint8Array, Int8Array,
     or ArrayBuffer, it is assumed to hold UTF-8-encoded text and is
     decoded to a string. If it looks like a WASM pointer,
     wasm.cstrToJs(sql) is returned. Else undefined is returned.

     Added in 3.44
  */
  capi.sqlite3_js_sql_to_string = (sql)=>{
    if('string' === typeof sql){
      return sql;
    }
    const x = flexibleString(v);
    return x===v ? undefined : x;
  }

  if( util.isUIThread() ){
    /* Features specific to the main window thread... */

    /**
       Internal helper for sqlite3_js_kvvfs_clear() and friends.
       Its argument should be one of ('local','session',"").
    */
    const __kvvfsInfo = function(which){
      const rc = Object.create(null);
      rc.prefix = 'kvvfs-'+which;
      rc.stores = [];
      if('session'===which || ""===which) rc.stores.push(globalThis.sessionStorage);
      if('local'===which || ""===which) rc.stores.push(globalThis.localStorage);
      return rc;
    };

    /**
       Clears all storage used by the kvvfs DB backend, deleting any
       DB(s) stored there. Its argument must be either 'session',
       'local', or "". In the first two cases, only sessionStorage
       resp. localStorage is cleared. If it's an empty string (the
       default) then both are cleared. Only storage keys which match
       the pattern used by kvvfs are cleared: any other client-side
       data are retained.

       This function is only available in the main window thread.

       Returns the number of entries cleared.
    */
    capi.sqlite3_js_kvvfs_clear = function(which=""){
      let rc = 0;
      const kvinfo = __kvvfsInfo(which);
      kvinfo.stores.forEach((s)=>{
        const toRm = [] /* keys to remove */;
        let i;
        for( i = 0; i < s.length; ++i ){
          const k = s.key(i);
          if(k.startsWith(kvinfo.prefix)) toRm.push(k);
        }
        toRm.forEach((kk)=>s.removeItem(kk));
        rc += toRm.length;
      });
      return rc;
    };

    /**
       This routine guesses the approximate amount of
       window.localStorage and/or window.sessionStorage in use by the
       kvvfs database backend. Its argument must be one of
       ('session', 'local', ""). In the first two cases, only
       sessionStorage resp. localStorage is counted. If it's an empty
       string (the default) then both are counted. Only storage keys
       which match the pattern used by kvvfs are counted. The returned
       value is the "length" value of every matching key and value,
       noting that JavaScript stores each character in 2 bytes.

       Note that the returned size is not authoritative from the
       perspective of how much data can fit into localStorage and
       sessionStorage, as the precise algorithms for determining
       those limits are unspecified and may include per-entry
       overhead invisible to clients.
    */
    capi.sqlite3_js_kvvfs_size = function(which=""){
      let sz = 0;
      const kvinfo = __kvvfsInfo(which);
      kvinfo.stores.forEach((s)=>{
        let i;
        for(i = 0; i < s.length; ++i){
          const k = s.key(i);
          if(k.startsWith(kvinfo.prefix)){
            sz += k.length;
            sz += s.getItem(k).length;
          }
        }
      });
      return sz * 2 /* because JS uses 2-byte char encoding */;
    };

  }/* main-window-only bits */

  /**
     Wraps all known variants of the C-side variadic
     sqlite3_db_config().

     Full docs: https://sqlite.org/c3ref/db_config.html

     Returns capi.SQLITE_MISUSE if op is not a valid operation ID.

     The variants which take `(int, int*)` arguments treat a
     missing or falsy pointer argument as 0.
  */
  capi.sqlite3_db_config = function(pDb, op, ...args){
    if(!this.s){
      this.s = wasm.xWrap('sqlite3_wasm_db_config_s','int',
                          ['sqlite3*', 'int', 'string:static']
                          /* MAINDBNAME requires a static string */);
      this.pii = wasm.xWrap('sqlite3_wasm_db_config_pii', 'int',
                            ['sqlite3*', 'int', '*','int', 'int']);
      this.ip = wasm.xWrap('sqlite3_wasm_db_config_ip','int',
                           ['sqlite3*', 'int', 'int','*']);
    }
    switch(op){
        case capi.SQLITE_DBCONFIG_ENABLE_FKEY:
        case capi.SQLITE_DBCONFIG_ENABLE_TRIGGER:
        case capi.SQLITE_DBCONFIG_ENABLE_FTS3_TOKENIZER:
        case capi.SQLITE_DBCONFIG_ENABLE_LOAD_EXTENSION:
        case capi.SQLITE_DBCONFIG_NO_CKPT_ON_CLOSE:
        case capi.SQLITE_DBCONFIG_ENABLE_QPSG:
        case capi.SQLITE_DBCONFIG_TRIGGER_EQP:
        case capi.SQLITE_DBCONFIG_RESET_DATABASE:
        case capi.SQLITE_DBCONFIG_DEFENSIVE:
        case capi.SQLITE_DBCONFIG_WRITABLE_SCHEMA:
        case capi.SQLITE_DBCONFIG_LEGACY_ALTER_TABLE:
        case capi.SQLITE_DBCONFIG_DQS_DML:
        case capi.SQLITE_DBCONFIG_DQS_DDL:
        case capi.SQLITE_DBCONFIG_ENABLE_VIEW:
        case capi.SQLITE_DBCONFIG_LEGACY_FILE_FORMAT:
        case capi.SQLITE_DBCONFIG_TRUSTED_SCHEMA:
        case capi.SQLITE_DBCONFIG_STMT_SCANSTATUS:
        case capi.SQLITE_DBCONFIG_REVERSE_SCANORDER:
          return this.ip(pDb, op, args[0], args[1] || 0);
        case capi.SQLITE_DBCONFIG_LOOKASIDE:
          return this.pii(pDb, op, args[0], args[1], args[2]);
        case capi.SQLITE_DBCONFIG_MAINDBNAME:
          return this.s(pDb, op, args[0]);
        default:
          return capi.SQLITE_MISUSE;
    }
  }.bind(Object.create(null));

  /**
     Given a (sqlite3_value*), this function attempts to convert it
     to an equivalent JS value with as much fidelity as feasible and
     return it.

     By default it throws if it cannot determine any sensible
     conversion. If passed a falsy second argument, it instead returns
     `undefined` if no suitable conversion is found.  Note that there
     is no conversion from SQL to JS which results in the `undefined`
     value, so `undefined` has an unambiguous meaning here.  It will
     always throw a WasmAllocError if allocating memory for a
     conversion fails.

     Caveats:

     - It does not support sqlite3_value_to_pointer() conversions
       because those require a type name string which this function
       does not have and cannot sensibly be given at the level of the
       API where this is used (e.g. automatically converting UDF
       arguments). Clients using sqlite3_value_to_pointer(), and its
       related APIs, will need to manage those themselves.
  */
  capi.sqlite3_value_to_js = function(pVal,throwIfCannotConvert=true){
    let arg;
    const valType = capi.sqlite3_value_type(pVal);
    switch(valType){
        case capi.SQLITE_INTEGER:
          if(wasm.bigIntEnabled){
            arg = capi.sqlite3_value_int64(pVal);
            if(util.bigIntFitsDouble(arg)) arg = Number(arg);
          }
          else arg = capi.sqlite3_value_double(pVal)/*yes, double, for larger integers*/;
          break;
        case capi.SQLITE_FLOAT:
          arg = capi.sqlite3_value_double(pVal);
          break;
        case capi.SQLITE_TEXT:
          arg = capi.sqlite3_value_text(pVal);
          break;
        case capi.SQLITE_BLOB:{
          const n = capi.sqlite3_value_bytes(pVal);
          const pBlob = capi.sqlite3_value_blob(pVal);
          if(n && !pBlob) sqlite3.WasmAllocError.toss(
            "Cannot allocate memory for blob argument of",n,"byte(s)"
          );
          arg = n ? wasm.heap8u().slice(pBlob, pBlob + Number(n)) : null;
          break;
        }
        case capi.SQLITE_NULL:
          arg = null; break;
        default:
          if(throwIfCannotConvert){
            toss3(capi.SQLITE_MISMATCH,
                  "Unhandled sqlite3_value_type():",valType);
          }
          arg = undefined;
    }
    return arg;
  };

  /**
     Requires a C-style array of `sqlite3_value*` objects and the
     number of entries in that array. Returns a JS array containing
     the results of passing each C array entry to
     sqlite3_value_to_js(). The 3rd argument to this function is
     passed on as the 2nd argument to that one.
  */
  capi.sqlite3_values_to_js = function(argc,pArgv,throwIfCannotConvert=true){
    let i;
    const tgt = [];
    for(i = 0; i < argc; ++i){
      /**
         Curiously: despite ostensibly requiring 8-byte
         alignment, the pArgv array is parcelled into chunks of
         4 bytes (1 pointer each). The values those point to
         have 8-byte alignment but the individual argv entries
         do not.
      */
      tgt.push(capi.sqlite3_value_to_js(
        wasm.peekPtr(pArgv + (wasm.ptrSizeof * i)),
        throwIfCannotConvert
      ));
    }
    return tgt;
  };

  /**
     Calls either sqlite3_result_error_nomem(), if e is-a
     WasmAllocError, or sqlite3_result_error(). In the latter case,
     the second arugment is coerced to a string to create the error
     message.

     The first argument is a (sqlite3_context*). Returns void.
     Does not throw.
  */
  capi.sqlite3_result_error_js = function(pCtx,e){
    if(e instanceof WasmAllocError){
      capi.sqlite3_result_error_nomem(pCtx);
    }else{
      /* Maintenance reminder: ''+e, rather than e.message,
         will prefix e.message with e.name, so it includes
         the exception's type name in the result. */;
      capi.sqlite3_result_error(pCtx, ''+e, -1);
    }
  };

  /**
     This function passes its 2nd argument to one of the
     sqlite3_result_xyz() routines, depending on the type of that
     argument:

     - If (val instanceof Error), this function passes it to
       sqlite3_result_error_js().
     - `null`: `sqlite3_result_null()`
     - `boolean`: `sqlite3_result_int()` with a value of 0 or 1.
     - `number`: `sqlite3_result_int()`, `sqlite3_result_int64()`, or
       `sqlite3_result_double()`, depending on the range of the number
       and whether or not int64 support is enabled.
     - `bigint`: similar to `number` but will trigger an error if the
       value is too big to store in an int64.
     - `string`: `sqlite3_result_text()`
     - Uint8Array or Int8Array or ArrayBuffer: `sqlite3_result_blob()`
     - `undefined`: is a no-op provided to simplify certain use cases.

     Anything else triggers `sqlite3_result_error()` with a
     description of the problem.

     The first argument to this function is a `(sqlite3_context*)`.
     Returns void. Does not throw.
  */
  capi.sqlite3_result_js = function(pCtx,val){
    if(val instanceof Error){
      capi.sqlite3_result_error_js(pCtx, val);
      return;
    }
    try{
      switch(typeof val) {
          case 'undefined':
            /* This is a no-op. This routine originated in the create_function()
               family of APIs and in that context, passing in undefined indicated
               that the caller was responsible for calling sqlite3_result_xxx()
               (if needed). */
            break;
          case 'boolean':
            capi.sqlite3_result_int(pCtx, val ? 1 : 0);
            break;
          case 'bigint':
            if(util.bigIntFits32(val)){
              capi.sqlite3_result_int(pCtx, Number(val));
            }else if(util.bigIntFitsDouble(val)){
              capi.sqlite3_result_double(pCtx, Number(val));
            }else if(wasm.bigIntEnabled){
              if(util.bigIntFits64(val)) capi.sqlite3_result_int64(pCtx, val);
              else toss3("BigInt value",val.toString(),"is too BigInt for int64.");
            }else{
              toss3("BigInt value",val.toString(),"is too BigInt.");
            }
            break;
          case 'number': {
            let f;
            if(util.isInt32(val)){
              f = capi.sqlite3_result_int;
            }else if(wasm.bigIntEnabled
                     && Number.isInteger(val)
                     && util.bigIntFits64(BigInt(val))){
              f = capi.sqlite3_result_int64;
            }else{
              f = capi.sqlite3_result_double;
            }
            f(pCtx, val);
            break;
          }
          case 'string': {
            const [p, n] = wasm.allocCString(val,true);
            capi.sqlite3_result_text(pCtx, p, n, capi.SQLITE_WASM_DEALLOC);
            break;
          }
          case 'object':
            if(null===val/*yes, typeof null === 'object'*/) {
              capi.sqlite3_result_null(pCtx);
              break;
            }else if(util.isBindableTypedArray(val)){
              const pBlob = wasm.allocFromTypedArray(val);
              capi.sqlite3_result_blob(
                pCtx, pBlob, val.byteLength,
                capi.SQLITE_WASM_DEALLOC
              );
              break;
            }
            // else fall through
          default:
            toss3("Don't not how to handle this UDF result value:",(typeof val), val);
      }
    }catch(e){
      capi.sqlite3_result_error_js(pCtx, e);
    }
  };

  /**
     Returns the result sqlite3_column_value(pStmt,iCol) passed to
     sqlite3_value_to_js(). The 3rd argument of this function is
     ignored by this function except to pass it on as the second
     argument of sqlite3_value_to_js(). If the sqlite3_column_value()
     returns NULL (e.g. because the column index is out of range),
     this function returns `undefined`, regardless of the 3rd
     argument. If the 3rd argument is falsy and conversion fails,
     `undefined` will be returned.

     Note that sqlite3_column_value() returns an "unprotected" value
     object, but in a single-threaded environment (like this one)
     there is no distinction between protected and unprotected values.
  */
  capi.sqlite3_column_js = function(pStmt, iCol, throwIfCannotConvert=true){
    const v = capi.sqlite3_column_value(pStmt, iCol);
    return (0===v) ? undefined : capi.sqlite3_value_to_js(v, throwIfCannotConvert);
  };

  /**
     Internal impl of sqlite3_preupdate_new/old_js() and
     sqlite3changeset_new/old_js().
  */
  const __newOldValue = function(pObj, iCol, impl){
    impl = capi[impl];
    if(!this.ptr) this.ptr = wasm.allocPtr();
    else wasm.pokePtr(this.ptr, 0);
    const rc = impl(pObj, iCol, this.ptr);
    if(rc) return SQLite3Error.toss(rc,arguments[2]+"() failed with code "+rc);
    const pv = wasm.peekPtr(this.ptr);
    return pv ? capi.sqlite3_value_to_js( pv, true ) : undefined;
  }.bind(Object.create(null));

  /**
     A wrapper around sqlite3_preupdate_new() which fetches the
     sqlite3_value at the given index and returns the result of
     passing it to sqlite3_value_to_js(). Throws on error.
  */
  capi.sqlite3_preupdate_new_js =
    (pDb, iCol)=>__newOldValue(pDb, iCol, 'sqlite3_preupdate_new');

  /**
     The sqlite3_preupdate_old() counterpart of
     sqlite3_preupdate_new_js(), with an identical interface.
  */
  capi.sqlite3_preupdate_old_js =
    (pDb, iCol)=>__newOldValue(pDb, iCol, 'sqlite3_preupdate_old');

  /**
     A wrapper around sqlite3changeset_new() which fetches the
     sqlite3_value at the given index and returns the result of
     passing it to sqlite3_value_to_js(). Throws on error.

     If sqlite3changeset_new() succeeds but has no value to report,
     this function returns the undefined value, noting that undefined
     is a valid conversion from an `sqlite3_value`, so is unambiguous.
  */
  capi.sqlite3changeset_new_js =
    (pChangesetIter, iCol) => __newOldValue(pChangesetIter, iCol,
                                            'sqlite3changeset_new');

  /**
     The sqlite3changeset_old() counterpart of
     sqlite3changeset_new_js(), with an identical interface.
  */
  capi.sqlite3changeset_old_js =
    (pChangesetIter, iCol)=>__newOldValue(pChangesetIter, iCol,
                                          'sqlite3changeset_old');

  /* The remainder of the API will be set up in later steps. */
  const sqlite3 = {
    WasmAllocError: WasmAllocError,
    SQLite3Error: SQLite3Error,
    capi,
    util,
    wasm,
    config,
    /**
       Holds the version info of the sqlite3 source tree from which
       the generated sqlite3-api.js gets built. Note that its version
       may well differ from that reported by sqlite3_libversion(), but
       that should be considered a source file mismatch, as the JS and
       WASM files are intended to be built and distributed together.

       This object is initially a placeholder which gets replaced by a
       build-generated object.
    */
    version: Object.create(null),

    /**
       The library reserves the 'client' property for client-side use
       and promises to never define a property with this name nor to
       ever rely on specific contents of it. It makes no such guarantees
       for other properties.
    */
    client: undefined,

    /**
       This function is not part of the public interface, but a
       piece of internal bootstrapping infrastructure.

       Performs any optional asynchronous library-level initialization
       which might be required. This function returns a Promise which
       resolves to the sqlite3 namespace object. Any error in the
       async init will be fatal to the init as a whole, but init
       routines are themselves welcome to install dummy catch()
       handlers which are not fatal if their failure should be
       considered non-fatal. If called more than once, the second and
       subsequent calls are no-ops which return a pre-resolved
       Promise.

       Ideally this function is called as part of the Promise chain
       which handles the loading and bootstrapping of the API.  If not
       then it must be called by client-level code, which must not use
       the library until the returned promise resolves.

       If called multiple times it will return the same promise on
       subsequent calls. The current build setup precludes that
       possibility, so it's only a hypothetical problem if/when this
       function ever needs to be invoked by clients.

       In Emscripten-based builds, this function is called
       automatically and deleted from this object.
    */
    asyncPostInit: async function ff(){
      if(ff.isReady instanceof Promise) return ff.isReady;
      let lia = sqlite3ApiBootstrap.initializersAsync;
      delete sqlite3ApiBootstrap.initializersAsync;
      const postInit = async ()=>{
        if(!sqlite3.__isUnderTest){
          /* Delete references to internal-only APIs which are used by
             some initializers. Retain them when running in test mode
             so that we can add tests for them. */
          delete sqlite3.util;
          /* It's conceivable that we might want to expose
             StructBinder to client-side code, but it's only useful if
             clients build their own sqlite3.wasm which contains their
             own C struct types. */
          delete sqlite3.StructBinder;
        }
        return sqlite3;
      };
      const catcher = (e)=>{
        config.error("an async sqlite3 initializer failed:",e);
        throw e;
      };
      if(!lia || !lia.length){
        return ff.isReady = postInit().catch(catcher);
      }
      lia = lia.map((f)=>{
        return (f instanceof Function) ? async x=>f(sqlite3) : f;
      });
      lia.push(postInit);
      let p = Promise.resolve(sqlite3);
      while(lia.length) p = p.then(lia.shift());
      return ff.isReady = p.catch(catcher);
    },
    /**
       scriptInfo ideally gets injected into this object by the
       infrastructure which assembles the JS/WASM module. It contains
       state which must be collected before sqlite3ApiBootstrap() can
       be declared. It is not necessarily available to any
       sqlite3ApiBootstrap.initializers but "should" be in place (if
       it's added at all) by the time that
       sqlite3ApiBootstrap.initializersAsync is processed.

       This state is not part of the public API, only intended for use
       with the sqlite3 API bootstrapping and wasm-loading process.
    */
    scriptInfo: undefined
  };
  try{
    sqlite3ApiBootstrap.initializers.forEach((f)=>{
      f(sqlite3);
    });
  }catch(e){
    /* If we don't report this here, it can get completely swallowed
       up and disappear into the abyss of Promises and Workers. */
    console.error("sqlite3 bootstrap initializer threw:",e);
    throw e;
  }
  delete sqlite3ApiBootstrap.initializers;
  sqlite3ApiBootstrap.sqlite3 = sqlite3;
  return sqlite3;
}/*sqlite3ApiBootstrap()*/;
/**
  globalThis.sqlite3ApiBootstrap.initializers is an internal detail used by
  the various pieces of the sqlite3 API's amalgamation process. It
  must not be modified by client code except when plugging such code
  into the amalgamation process.

  Each component of the amalgamation is expected to append a function
  to this array. When sqlite3ApiBootstrap() is called for the first
  time, each such function will be called (in their appended order)
  and passed the sqlite3 namespace object, into which they can install
  their features (noting that most will also require that certain
  features alread have been installed).  At the end of that process,
  this array is deleted.

  Note that the order of insertion into this array is significant for
  some pieces. e.g. sqlite3.capi and sqlite3.wasm cannot be fully
  utilized until the whwasmutil.js part is plugged in via
  sqlite3-api-glue.js.
*/
globalThis.sqlite3ApiBootstrap.initializers = [];
/**
  globalThis.sqlite3ApiBootstrap.initializersAsync is an internal detail
  used by the sqlite3 API's amalgamation process. It must not be
  modified by client code except when plugging such code into the
  amalgamation process.

  The counterpart of globalThis.sqlite3ApiBootstrap.initializers,
  specifically for initializers which are asynchronous. All entries in
  this list must be either async functions, non-async functions which
  return a Promise, or a Promise. Each function in the list is called
  with the sqlite3 object as its only argument.

  The resolved value of any Promise is ignored and rejection will kill
  the asyncPostInit() process (at an indeterminate point because all
  of them are run asynchronously in parallel).

  This list is not processed until the client calls
  sqlite3.asyncPostInit(). This means, for example, that intializers
  added to globalThis.sqlite3ApiBootstrap.initializers may push entries to
  this list.
*/
globalThis.sqlite3ApiBootstrap.initializersAsync = [];
/**
   Client code may assign sqlite3ApiBootstrap.defaultConfig an
   object-type value before calling sqlite3ApiBootstrap() (without
   arguments) in order to tell that call to use this object as its
   default config value. The intention of this is to provide
   downstream clients with a reasonably flexible approach for plugging in
   an environment-suitable configuration without having to define a new
   global-scope symbol.
*/
globalThis.sqlite3ApiBootstrap.defaultConfig = Object.create(null);
/**
   Placeholder: gets installed by the first call to
   globalThis.sqlite3ApiBootstrap(). However, it is recommended that the
   caller of sqlite3ApiBootstrap() capture its return value and delete
   globalThis.sqlite3ApiBootstrap after calling it. It returns the same
   value which will be stored here.
*/
globalThis.sqlite3ApiBootstrap.sqlite3 = undefined;
/* END FILE: api/sqlite3-api-prologue.js */
/* BEGIN FILE: common/whwasmutil.js */
/**
  2022-07-08

  The author disclaims copyright to this source code.  In place of a
  legal notice, here is a blessing:

  *   May you do good and not evil.
  *   May you find forgiveness for yourself and forgive others.
  *   May you share freely, never taking more than you give.

  ***********************************************************************

  The whwasmutil is developed in conjunction with the Jaccwabyt
  project:

  https://fossil.wanderinghorse.net/r/jaccwabyt

  and sqlite3:

  https://sqlite.org

  This file is kept in sync between both of those trees.

  Maintenance reminder: If you're reading this in a tree other than
  one of those listed above, note that this copy may be replaced with
  upstream copies of that one from time to time. Thus the code
  installed by this function "should not" be edited outside of those
  projects, else it risks getting overwritten.
*/
/**
   This function is intended to simplify porting around various bits
   of WASM-related utility code from project to project.

   The primary goal of this code is to replace, where possible,
   Emscripten-generated glue code with equivalent utility code which
   can be used in arbitrary WASM environments built with toolchains
   other than Emscripten. As of this writing, this code is capable of
   acting as a replacement for Emscripten's generated glue code
   _except_ that the latter installs handlers for Emscripten-provided
   APIs such as its "FS" (virtual filesystem) API. Loading of such
   things still requires using Emscripten's glue, but the post-load
   utility APIs provided by this code are still usable as replacements
   for their sub-optimally-documented Emscripten counterparts.

   Intended usage:

   ```
   globalThis.WhWasmUtilInstaller(appObject);
   delete globalThis.WhWasmUtilInstaller;
   ```

   Its global-scope symbol is intended only to provide an easy way to
   make it available to 3rd-party scripts and "should" be deleted
   after calling it. That symbols is _not_ used within the library.

   Forewarning: this API explicitly targets only browser
   environments. If a given non-browser environment has the
   capabilities needed for a given feature (e.g. TextEncoder), great,
   but it does not go out of its way to account for them and does not
   provide compatibility crutches for them.

   It currently offers alternatives to the following
   Emscripten-generated APIs:

   - OPTIONALLY memory allocation, but how this gets imported is
     environment-specific.  Most of the following features only work
     if allocation is available.

   - WASM-exported "indirect function table" access and
     manipulation. e.g.  creating new WASM-side functions using JS
     functions, analog to Emscripten's addFunction() and
     uninstallFunction() but slightly different.

   - Get/set specific heap memory values, analog to Emscripten's
     getValue() and setValue().

   - String length counting in UTF-8 bytes (C-style and JS strings).

   - JS string to C-string conversion and vice versa, analog to
     Emscripten's stringToUTF8Array() and friends, but with slighter
     different interfaces.

   - JS string to Uint8Array conversion, noting that browsers actually
     already have this built in via TextEncoder.

   - "Scoped" allocation, such that allocations made inside of a given
     explicit scope will be automatically cleaned up when the scope is
     closed. This is fundamentally similar to Emscripten's
     stackAlloc() and friends but uses the heap instead of the stack
     because access to the stack requires C code.

   - Create JS wrappers for WASM functions, analog to Emscripten's
     ccall() and cwrap() functions, except that the automatic
     conversions for function arguments and return values can be
     easily customized by the client by assigning custom function
     signature type names to conversion functions. Essentially,
     it's ccall() and cwrap() on steroids.

   How to install...

   Passing an object to this function will install the functionality
   into that object. Afterwards, client code "should" delete the global
   symbol.

   This code requires that the target object have the following
   properties, noting that they needn't be available until the first
   time one of the installed APIs is used (as opposed to when this
   function is called) except where explicitly noted:

   - `exports` must be a property of the target object OR a property
     of `target.instance` (a WebAssembly.Module instance) and it must
     contain the symbols exported by the WASM module associated with
     this code. In an Enscripten environment it must be set to
     `Module['asm']` (versions <=3.1.43) or `wasmExports` (versions
     >=3.1.44). The exports object must contain a minimum of the
     following symbols:

     - `memory`: a WebAssembly.Memory object representing the WASM
       memory. _Alternately_, the `memory` property can be set as
       `target.memory`, in particular if the WASM heap memory is
       initialized in JS an _imported_ into WASM, as opposed to being
       initialized in WASM and exported to JS.

     - `__indirect_function_table`: the WebAssembly.Table object which
       holds WASM-exported functions. This API does not strictly
       require that the table be able to grow but it will throw if its
       `installFunction()` is called and the table cannot grow.

   In order to simplify downstream usage, if `target.exports` is not
   set when this is called then a property access interceptor
   (read-only, configurable, enumerable) gets installed as `exports`
   which resolves to `target.instance.exports`, noting that the latter
   property need not exist until the first time `target.exports` is
   accessed.

   Some APIs _optionally_ make use of the `bigIntEnabled` property of
   the target object. It "should" be set to true if the WASM
   environment is compiled with BigInt support, else it must be
   false. If it is false, certain BigInt-related features will trigger
   an exception if invoked. This property, if not set when this is
   called, will get a default value of true only if the BigInt64Array
   constructor is available, else it will default to false. Note that
   having the BigInt type is not sufficient for full int64 integration
   with WASM: the target WASM file must also have been built with
   that support. In Emscripten that's done using the `-sWASM_BIGINT`
   flag.

   Some optional APIs require that the target have the following
   methods:

   - 'alloc()` must behave like C's `malloc()`, allocating N bytes of
     memory and returning its pointer. In Emscripten this is
     conventionally made available via `Module['_malloc']`. This API
     requires that the alloc routine throw on allocation error, as
     opposed to returning null or 0.

   - 'dealloc()` must behave like C's `free()`, accepting either a
     pointer returned from its allocation counterpart or the values
     null/0 (for which it must be a no-op). allocating N bytes of
     memory and returning its pointer. In Emscripten this is
     conventionally made available via `Module['_free']`.

   APIs which require allocation routines are explicitly documented as
   such and/or have "alloc" in their names.

   This code is developed and maintained in conjunction with the
   Jaccwabyt project:

   https://fossil.wanderinghorse.net/r/jaccwabbyt

   More specifically:

   https://fossil.wanderinghorse.net/r/jaccwabbyt/file/common/whwasmutil.js
*/
globalThis.WhWasmUtilInstaller = function(target){
  'use strict';
  if(undefined===target.bigIntEnabled){
    target.bigIntEnabled = !!globalThis['BigInt64Array'];
  }

  /** Throws a new Error, the message of which is the concatenation of
      all args with a space between each. */
  const toss = (...args)=>{throw new Error(args.join(' '))};

  if(!target.exports){
    Object.defineProperty(target, 'exports', {
      enumerable: true, configurable: true,
      get: ()=>(target.instance && target.instance.exports)
    });
  }

  /*********
    alloc()/dealloc() auto-install...

    This would be convenient but it can also cause us to pick up
    malloc() even when the client code is using a different exported
    allocator (who, me?), which is bad. malloc() may be exported even
    if we're not explicitly using it and overriding the malloc()
    function, linking ours first, is not always feasible when using a
    malloc() proxy, as it can lead to recursion and stack overflow
    (who, me?). So... we really need the downstream code to set up
    target.alloc/dealloc() itself.
  ******/
  /******
  if(target.exports){
    //Maybe auto-install alloc()/dealloc()...
    if(!target.alloc && target.exports.malloc){
      target.alloc = function(n){
        const m = this(n);
        return m || toss("Allocation of",n,"byte(s) failed.");
      }.bind(target.exports.malloc);
    }

    if(!target.dealloc && target.exports.free){
      target.dealloc = function(ptr){
        if(ptr) this(ptr);
      }.bind(target.exports.free);
    }
  }*******/

  /**
     Pointers in WASM are currently assumed to be 32-bit, but someday
     that will certainly change.
  */
  const ptrIR = target.pointerIR || 'i32';
  const ptrSizeof = target.ptrSizeof =
        ('i32'===ptrIR ? 4
         : ('i64'===ptrIR
            ? 8 : toss("Unhandled ptrSizeof:",ptrIR)));
  /** Stores various cached state. */
  const cache = Object.create(null);
  /** Previously-recorded size of cache.memory.buffer, noted so that
      we can recreate the view objects if the heap grows. */
  cache.heapSize = 0;
  /** WebAssembly.Memory object extracted from target.memory or
      target.exports.memory the first time heapWrappers() is
      called. */
  cache.memory = null;
  /** uninstallFunction() puts table indexes in here for reuse and
      installFunction() extracts them. */
  cache.freeFuncIndexes = [];
  /**
     Used by scopedAlloc() and friends.
  */
  cache.scopedAlloc = [];

  cache.utf8Decoder = new TextDecoder();
  cache.utf8Encoder = new TextEncoder('utf-8');

  /**
     For the given IR-like string in the set ('i8', 'i16', 'i32',
     'f32', 'float', 'i64', 'f64', 'double', '*'), or any string value
     ending in '*', returns the sizeof for that value
     (target.ptrSizeof in the latter case). For any other value, it
     returns the undefined value.
  */
  target.sizeofIR = (n)=>{
    switch(n){
        case 'i8': return 1;
        case 'i16': return 2;
        case 'i32': case 'f32': case 'float': return 4;
        case 'i64': case 'f64': case 'double': return 8;
        case '*': return ptrSizeof;
        default:
          return (''+n).endsWith('*') ? ptrSizeof : undefined;
    }
  };

  /**
     If (cache.heapSize !== cache.memory.buffer.byteLength), i.e. if
     the heap has grown since the last call, updates cache.HEAPxyz.
     Returns the cache object.
  */
  const heapWrappers = function(){
    if(!cache.memory){
      cache.memory = (target.memory instanceof WebAssembly.Memory)
        ? target.memory : target.exports.memory;
    }else if(cache.heapSize === cache.memory.buffer.byteLength){
      return cache;
    }
    // heap is newly-acquired or has been resized....
    const b = cache.memory.buffer;
    cache.HEAP8 = new Int8Array(b); cache.HEAP8U = new Uint8Array(b);
    cache.HEAP16 = new Int16Array(b); cache.HEAP16U = new Uint16Array(b);
    cache.HEAP32 = new Int32Array(b); cache.HEAP32U = new Uint32Array(b);
    if(target.bigIntEnabled){
      cache.HEAP64 = new BigInt64Array(b); cache.HEAP64U = new BigUint64Array(b);
    }
    cache.HEAP32F = new Float32Array(b); cache.HEAP64F = new Float64Array(b);
    cache.heapSize = b.byteLength;
    return cache;
  };

  /** Convenience equivalent of this.heapForSize(8,false). */
  target.heap8 = ()=>heapWrappers().HEAP8;

  /** Convenience equivalent of this.heapForSize(8,true). */
  target.heap8u = ()=>heapWrappers().HEAP8U;

  /** Convenience equivalent of this.heapForSize(16,false). */
  target.heap16 = ()=>heapWrappers().HEAP16;

  /** Convenience equivalent of this.heapForSize(16,true). */
  target.heap16u = ()=>heapWrappers().HEAP16U;

  /** Convenience equivalent of this.heapForSize(32,false). */
  target.heap32 = ()=>heapWrappers().HEAP32;

  /** Convenience equivalent of this.heapForSize(32,true). */
  target.heap32u = ()=>heapWrappers().HEAP32U;

  /**
     Requires n to be one of:

     - integer 8, 16, or 32.
     - A integer-type TypedArray constructor: Int8Array, Int16Array,
     Int32Array, or their Uint counterparts.

     If this.bigIntEnabled is true, it also accepts the value 64 or a
     BigInt64Array/BigUint64Array, else it throws if passed 64 or one
     of those constructors.

     Returns an integer-based TypedArray view of the WASM heap
     memory buffer associated with the given block size. If passed
     an integer as the first argument and unsigned is truthy then
     the "U" (unsigned) variant of that view is returned, else the
     signed variant is returned. If passed a TypedArray value, the
     2nd argument is ignored. Note that Float32Array and
     Float64Array views are not supported by this function.

     Note that growth of the heap will invalidate any references to
     this heap, so do not hold a reference longer than needed and do
     not use a reference after any operation which may
     allocate. Instead, re-fetch the reference by calling this
     function again.

     Throws if passed an invalid n.

     Pedantic side note: the name "heap" is a bit of a misnomer. In a
     WASM environment, the stack and heap memory are all accessed via
     the same view(s) of the memory.
  */
  target.heapForSize = function(n,unsigned = true){
    let ctor;
    const c = (cache.memory && cache.heapSize === cache.memory.buffer.byteLength)
          ? cache : heapWrappers();
    switch(n){
        case Int8Array: return c.HEAP8; case Uint8Array: return c.HEAP8U;
        case Int16Array: return c.HEAP16; case Uint16Array: return c.HEAP16U;
        case Int32Array: return c.HEAP32; case Uint32Array: return c.HEAP32U;
        case 8:  return unsigned ? c.HEAP8U : c.HEAP8;
        case 16: return unsigned ? c.HEAP16U : c.HEAP16;
        case 32: return unsigned ? c.HEAP32U : c.HEAP32;
        case 64:
          if(c.HEAP64) return unsigned ? c.HEAP64U : c.HEAP64;
          break;
        default:
          if(target.bigIntEnabled){
            if(n===globalThis['BigUint64Array']) return c.HEAP64U;
            else if(n===globalThis['BigInt64Array']) return c.HEAP64;
            break;
          }
    }
    toss("Invalid heapForSize() size: expecting 8, 16, 32,",
         "or (if BigInt is enabled) 64.");
  };

  /**
     Returns the WASM-exported "indirect function table."
  */
  target.functionTable = function(){
    return target.exports.__indirect_function_table;
    /** -----------------^^^^^ "seems" to be a standardized export name.
        From Emscripten release notes from 2020-09-10:
        - Use `__indirect_function_table` as the import name for the
        table, which is what LLVM does.
    */
  };

  /**
     Given a function pointer, returns the WASM function table entry
     if found, else returns a falsy value: undefined if fptr is out of
     range or null if it's in range but the table entry is empty.
  */
  target.functionEntry = function(fptr){
    const ft = target.functionTable();
    return fptr < ft.length ? ft.get(fptr) : undefined;
  };

  /**
     Creates a WASM function which wraps the given JS function and
     returns the JS binding of that WASM function. The signature
     string must be the Jaccwabyt-format or Emscripten
     addFunction()-format function signature string. In short: in may
     have one of the following formats:

     - Emscripten: `"x..."`, where the first x is a letter representing
       the result type and subsequent letters represent the argument
       types. Functions with no arguments have only a single
       letter. See below.

     - Jaccwabyt: `"x(...)"` where `x` is the letter representing the
       result type and letters in the parens (if any) represent the
       argument types. Functions with no arguments use `x()`. See
       below.

     Supported letters:

     - `i` = int32
     - `p` = int32 ("pointer")
     - `j` = int64
     - `f` = float32
     - `d` = float64
     - `v` = void, only legal for use as the result type

     It throws if an invalid signature letter is used.

     Jaccwabyt-format signatures support some additional letters which
     have no special meaning here but (in this context) act as aliases
     for other letters:

     - `s`, `P`: same as `p`

     Sidebar: this code is developed together with Jaccwabyt, thus the
     support for its signature format.

     The arguments may be supplied in either order: (func,sig) or
     (sig,func).
  */
  target.jsFuncToWasm = function f(func, sig){
    /** Attribution: adapted up from Emscripten-generated glue code,
        refactored primarily for efficiency's sake, eliminating
        call-local functions and superfluous temporary arrays. */
    if(!f._){/*static init...*/
      f._ = {
        // Map of signature letters to type IR values
        sigTypes: Object.assign(Object.create(null),{
          i: 'i32', p: 'i32', P: 'i32', s: 'i32',
          j: 'i64', f: 'f32', d: 'f64'
        }),
        // Map of type IR values to WASM type code values
        typeCodes: Object.assign(Object.create(null),{
          f64: 0x7c, f32: 0x7d, i64: 0x7e, i32: 0x7f
        }),
        /** Encodes n, which must be <2^14 (16384), into target array
            tgt, as a little-endian value, using the given method
            ('push' or 'unshift'). */
        uleb128Encode: function(tgt, method, n){
          if(n<128) tgt[method](n);
          else tgt[method]( (n % 128) | 128, n>>7);
        },
        /** Intentionally-lax pattern for Jaccwabyt-format function
            pointer signatures, the intent of which is simply to
            distinguish them from Emscripten-format signatures. The
            downstream checks are less lax. */
        rxJSig: /^(\w)\((\w*)\)$/,
        /** Returns the parameter-value part of the given signature
            string. */
        sigParams: function(sig){
          const m = f._.rxJSig.exec(sig);
          return m ? m[2] : sig.substr(1);
        },
        /** Returns the IR value for the given letter or throws
            if the letter is invalid. */
        letterType: (x)=>f._.sigTypes[x] || toss("Invalid signature letter:",x),
        /** Returns an object describing the result type and parameter
            type(s) of the given function signature, or throws if the
            signature is invalid. */
        /******** // only valid for use with the WebAssembly.Function ctor, which
                  // is not yet documented on MDN.
        sigToWasm: function(sig){
          const rc = {parameters:[], results: []};
          if('v'!==sig[0]) rc.results.push(f.sigTypes(sig[0]));
          for(const x of f._.sigParams(sig)){
            rc.parameters.push(f._.typeCodes(x));
          }
          return rc;
        },************/
        /** Pushes the WASM data type code for the given signature
            letter to the given target array. Throws if letter is
            invalid. */
        pushSigType: (dest, letter)=>dest.push(f._.typeCodes[f._.letterType(letter)])
      };
    }/*static init*/
    if('string'===typeof func){
      const x = sig;
      sig = func;
      func = x;
    }
    const sigParams = f._.sigParams(sig);
    const wasmCode = [0x01/*count: 1*/, 0x60/*function*/];
    f._.uleb128Encode(wasmCode, 'push', sigParams.length);
    for(const x of sigParams) f._.pushSigType(wasmCode, x);
    if('v'===sig[0]) wasmCode.push(0);
    else{
      wasmCode.push(1);
      f._.pushSigType(wasmCode, sig[0]);
    }
    f._.uleb128Encode(wasmCode, 'unshift', wasmCode.length)/* type section length */;
    wasmCode.unshift(
      0x00, 0x61, 0x73, 0x6d, /* magic: "\0asm" */
      0x01, 0x00, 0x00, 0x00, /* version: 1 */
      0x01 /* type section code */
    );
    wasmCode.push(
      /* import section: */ 0x02, 0x07,
      /* (import "e" "f" (func 0 (type 0))): */
      0x01, 0x01, 0x65, 0x01, 0x66, 0x00, 0x00,
      /* export section: */ 0x07, 0x05,
      /* (export "f" (func 0 (type 0))): */
      0x01, 0x01, 0x66, 0x00, 0x00
    );
    return (new WebAssembly.Instance(
      new WebAssembly.Module(new Uint8Array(wasmCode)), {
        e: { f: func }
      })).exports['f'];
  }/*jsFuncToWasm()*/;

  /**
     Documented as target.installFunction() except for the 3rd
     argument: if truthy, the newly-created function pointer
     is stashed in the current scoped-alloc scope and will be
     cleaned up at the matching scopedAllocPop(), else it
     is not stashed there.
   */
  const __installFunction = function f(func, sig, scoped){
    if(scoped && !cache.scopedAlloc.length){
      toss("No scopedAllocPush() scope is active.");
    }
    if('string'===typeof func){
      const x = sig;
      sig = func;
      func = x;
    }
    if('string'!==typeof sig || !(func instanceof Function)){
      toss("Invalid arguments: expecting (function,signature) "+
           "or (signature,function).");
    }
    const ft = target.functionTable();
    const oldLen = ft.length;
    let ptr;
    while(cache.freeFuncIndexes.length){
      ptr = cache.freeFuncIndexes.pop();
      if(ft.get(ptr)){ /* Table was modified via a different API */
        ptr = null;
        continue;
      }else{
        break;
      }
    }
    if(!ptr){
      ptr = oldLen;
      ft.grow(1);
    }
    try{
      /*this will only work if func is a WASM-exported function*/
      ft.set(ptr, func);
      if(scoped){
        cache.scopedAlloc[cache.scopedAlloc.length-1].push(ptr);
      }
      return ptr;
    }catch(e){
      if(!(e instanceof TypeError)){
        if(ptr===oldLen) cache.freeFuncIndexes.push(oldLen);
        throw e;
      }
    }
    // It's not a WASM-exported function, so compile one...
    try {
      const fptr = target.jsFuncToWasm(func, sig);
      ft.set(ptr, fptr);
      if(scoped){
        cache.scopedAlloc[cache.scopedAlloc.length-1].push(ptr);
      }
    }catch(e){
      if(ptr===oldLen) cache.freeFuncIndexes.push(oldLen);
      throw e;
    }
    return ptr;
  };

  /**
     Expects a JS function and signature, exactly as for
     this.jsFuncToWasm(). It uses that function to create a
     WASM-exported function, installs that function to the next
     available slot of this.functionTable(), and returns the
     function's index in that table (which acts as a pointer to that
     function). The returned pointer can be passed to
     uninstallFunction() to uninstall it and free up the table slot for
     reuse.

     If passed (string,function) arguments then it treats the first
     argument as the signature and second as the function.

     As a special case, if the passed-in function is a WASM-exported
     function then the signature argument is ignored and func is
     installed as-is, without requiring re-compilation/re-wrapping.

     This function will propagate an exception if
     WebAssembly.Table.grow() throws or this.jsFuncToWasm() throws.
     The former case can happen in an Emscripten-compiled
     environment when building without Emscripten's
     `-sALLOW_TABLE_GROWTH` flag.

     Sidebar: this function differs from Emscripten's addFunction()
     _primarily_ in that it does not share that function's
     undocumented behavior of reusing a function if it's passed to
     addFunction() more than once, which leads to uninstallFunction()
     breaking clients which do not take care to avoid that case:

     https://github.com/emscripten-core/emscripten/issues/17323
  */
  target.installFunction = (func, sig)=>__installFunction(func, sig, false);

  /**
     Works exactly like installFunction() but requires that a
     scopedAllocPush() is active and uninstalls the given function
     when that alloc scope is popped via scopedAllocPop().
     This is used for implementing JS/WASM function bindings which
     should only persist for the life of a call into a single
     C-side function.
  */
  target.scopedInstallFunction = (func, sig)=>__installFunction(func, sig, true);

  /**
     Requires a pointer value previously returned from
     this.installFunction(). Removes that function from the WASM
     function table, marks its table slot as free for re-use, and
     returns that function. It is illegal to call this before
     installFunction() has been called and results are undefined if
     ptr was not returned by that function. The returned function
     may be passed back to installFunction() to reinstall it.

     To simplify certain use cases, if passed a falsy non-0 value
     (noting that 0 is a valid function table index), this function
     has no side effects and returns undefined.
  */
  target.uninstallFunction = function(ptr){
    if(!ptr && 0!==ptr) return undefined;
    const fi = cache.freeFuncIndexes;
    const ft = target.functionTable();
    fi.push(ptr);
    const rc = ft.get(ptr);
    ft.set(ptr, null);
    return rc;
  };

  /**
     Given a WASM heap memory address and a data type name in the form
     (i8, i16, i32, i64, float (or f32), double (or f64)), this
     fetches the numeric value from that address and returns it as a
     number or, for the case of type='i64', a BigInt (noting that that
     type triggers an exception if this.bigIntEnabled is
     falsy). Throws if given an invalid type.

     If the first argument is an array, it is treated as an array of
     addresses and the result is an array of the values from each of
     those address, using the same 2nd argument for determining the
     value type to fetch.

     As a special case, if type ends with a `*`, it is considered to
     be a pointer type and is treated as the WASM numeric type
     appropriate for the pointer size (`i32`).

     While likely not obvious, this routine and its poke()
     counterpart are how pointer-to-value _output_ parameters
     in WASM-compiled C code can be interacted with:

     ```
     const ptr = alloc(4);
     poke(ptr, 0, 'i32'); // clear the ptr's value
     aCFuncWithOutputPtrToInt32Arg( ptr ); // e.g. void foo(int *x);
     const result = peek(ptr, 'i32'); // fetch ptr's value
     dealloc(ptr);
     ```

     scopedAlloc() and friends can be used to make handling of
     `ptr` safe against leaks in the case of an exception:

     ```
     let result;
     const scope = scopedAllocPush();
     try{
       const ptr = scopedAlloc(4);
       poke(ptr, 0, 'i32');
       aCFuncWithOutputPtrArg( ptr );
       result = peek(ptr, 'i32');
     }finally{
       scopedAllocPop(scope);
     }
     ```

     As a rule poke() must be called to set (typically zero
     out) the pointer's value, else it will contain an essentially
     random value.

     ACHTUNG: calling this often, e.g. in a loop, can have a noticably
     painful impact on performance. Rather than doing so, use
     heapForSize() to fetch the heap object and read directly from it.

     See: poke()
  */
  target.peek = function f(ptr, type='i8'){
    if(type.endsWith('*')) type = ptrIR;
    const c = (cache.memory && cache.heapSize === cache.memory.buffer.byteLength)
          ? cache : heapWrappers();
    const list = Array.isArray(ptr) ? [] : undefined;
    let rc;
    do{
      if(list) ptr = arguments[0].shift();
      switch(type){
          case 'i1':
          case 'i8': rc = c.HEAP8[ptr>>0]; break;
          case 'i16': rc = c.HEAP16[ptr>>1]; break;
          case 'i32': rc = c.HEAP32[ptr>>2]; break;
          case 'float': case 'f32': rc = c.HEAP32F[ptr>>2]; break;
          case 'double': case 'f64': rc = Number(c.HEAP64F[ptr>>3]); break;
          case 'i64':
            if(target.bigIntEnabled){
              rc = BigInt(c.HEAP64[ptr>>3]);
              break;
            }
            /* fallthru */
          default:
            toss('Invalid type for peek():',type);
      }
      if(list) list.push(rc);
    }while(list && arguments[0].length);
    return list || rc;
  };

  /**
     The counterpart of peek(), this sets a numeric value at
     the given WASM heap address, using the type to define how many
     bytes are written. Throws if given an invalid type. See
     peek() for details about the type argument. If the 3rd
     argument ends with `*` then it is treated as a pointer type and
     this function behaves as if the 3rd argument were `i32`.

     If the first argument is an array, it is treated like a list
     of pointers and the given value is written to each one.

     Returns `this`. (Prior to 2022-12-09 it returns this function.)

     ACHTUNG: calling this often, e.g. in a loop, can have a noticably
     painful impact on performance. Rather than doing so, use
     heapForSize() to fetch the heap object and assign directly to it
     or use the heap's set() method.
  */
  target.poke = function(ptr, value, type='i8'){
    if (type.endsWith('*')) type = ptrIR;
    const c = (cache.memory && cache.heapSize === cache.memory.buffer.byteLength)
          ? cache : heapWrappers();
    for(const p of (Array.isArray(ptr) ? ptr : [ptr])){
      switch (type) {
          case 'i1':
          case 'i8': c.HEAP8[p>>0] = value; continue;
          case 'i16': c.HEAP16[p>>1] = value; continue;
          case 'i32': c.HEAP32[p>>2] = value; continue;
          case 'float': case 'f32': c.HEAP32F[p>>2] = value; continue;
          case 'double': case 'f64': c.HEAP64F[p>>3] = value; continue;
          case 'i64':
            if(c.HEAP64){
              c.HEAP64[p>>3] = BigInt(value);
              continue;
            }
            /* fallthru */
          default:
            toss('Invalid type for poke(): ' + type);
      }
    }
    return this;
  };

  /**
     Convenience form of peek() intended for fetching
     pointer-to-pointer values. If passed a single non-array argument
     it returns the value of that one pointer address. If passed
     multiple arguments, or a single array of arguments, it returns an
     array of their values.
  */
  target.peekPtr = (...ptr)=>target.peek( (1===ptr.length ? ptr[0] : ptr), ptrIR );

  /**
     A variant of poke() intended for setting pointer-to-pointer
     values. Its differences from poke() are that (1) it defaults to a
     value of 0 and (2) it always writes to the pointer-sized heap
     view.
  */
  target.pokePtr = (ptr, value=0)=>target.poke(ptr, value, ptrIR);

  /**
     Convenience form of peek() intended for fetching i8 values. If
     passed a single non-array argument it returns the value of that
     one pointer address. If passed multiple arguments, or a single
     array of arguments, it returns an array of their values.
  */
  target.peek8 = (...ptr)=>target.peek( (1===ptr.length ? ptr[0] : ptr), 'i8' );
  /**
     Convience form of poke() intended for setting individual bytes.
     Its difference from poke() is that it always writes to the
     i8-sized heap view.
  */
  target.poke8 = (ptr, value)=>target.poke(ptr, value, 'i8');
  /** i16 variant of peek8(). */
  target.peek16 = (...ptr)=>target.peek( (1===ptr.length ? ptr[0] : ptr), 'i16' );
  /** i16 variant of poke8(). */
  target.poke16 = (ptr, value)=>target.poke(ptr, value, 'i16');
  /** i32 variant of peek8(). */
  target.peek32 = (...ptr)=>target.peek( (1===ptr.length ? ptr[0] : ptr), 'i32' );
  /** i32 variant of poke8(). */
  target.poke32 = (ptr, value)=>target.poke(ptr, value, 'i32');
  /** i64 variant of peek8(). Will throw if this build is not
      configured for BigInt support. */
  target.peek64 = (...ptr)=>target.peek( (1===ptr.length ? ptr[0] : ptr), 'i64' );
  /** i64 variant of poke8(). Will throw if this build is not
      configured for BigInt support. Note that this returns
      a BigInt-type value, not a Number-type value. */
  target.poke64 = (ptr, value)=>target.poke(ptr, value, 'i64');
  /** f32 variant of peek8(). */
  target.peek32f = (...ptr)=>target.peek( (1===ptr.length ? ptr[0] : ptr), 'f32' );
  /** f32 variant of poke8(). */
  target.poke32f = (ptr, value)=>target.poke(ptr, value, 'f32');
  /** f64 variant of peek8(). */
  target.peek64f = (...ptr)=>target.peek( (1===ptr.length ? ptr[0] : ptr), 'f64' );
  /** f64 variant of poke8(). */
  target.poke64f = (ptr, value)=>target.poke(ptr, value, 'f64');

  /** Deprecated alias for getMemValue() */
  target.getMemValue = target.peek;
  /** Deprecated alias for peekPtr() */
  target.getPtrValue = target.peekPtr;
  /** Deprecated alias for poke() */
  target.setMemValue = target.poke;
  /** Deprecated alias for pokePtr() */
  target.setPtrValue = target.pokePtr;

  /**
     Returns true if the given value appears to be legal for use as
     a WASM pointer value. Its _range_ of values is not (cannot be)
     validated except to ensure that it is a 32-bit integer with a
     value of 0 or greater. Likewise, it cannot verify whether the
     value actually refers to allocated memory in the WASM heap.
  */
  target.isPtr32 = (ptr)=>('number'===typeof ptr && (ptr===(ptr|0)) && ptr>=0);

  /**
     isPtr() is an alias for isPtr32(). If/when 64-bit WASM pointer
     support becomes widespread, it will become an alias for either
     isPtr32() or the as-yet-hypothetical isPtr64(), depending on a
     configuration option.
  */
  target.isPtr = target.isPtr32;

  /**
     Expects ptr to be a pointer into the WASM heap memory which
     refers to a NUL-terminated C-style string encoded as UTF-8.
     Returns the length, in bytes, of the string, as for `strlen(3)`.
     As a special case, if !ptr or if it's not a pointer then it
     returns `null`. Throws if ptr is out of range for
     target.heap8u().
  */
  target.cstrlen = function(ptr){
    if(!ptr || !target.isPtr(ptr)) return null;
    const h = heapWrappers().HEAP8U;
    let pos = ptr;
    for( ; h[pos] !== 0; ++pos ){}
    return pos - ptr;
  };

  /** Internal helper to use in operations which need to distinguish
      between SharedArrayBuffer heap memory and non-shared heap. */
  const __SAB = ('undefined'===typeof SharedArrayBuffer)
        ? function(){} : SharedArrayBuffer;
  const __utf8Decode = function(arrayBuffer, begin, end){
    return cache.utf8Decoder.decode(
      (arrayBuffer.buffer instanceof __SAB)
        ? arrayBuffer.slice(begin, end)
        : arrayBuffer.subarray(begin, end)
    );
  };

  /**
     Expects ptr to be a pointer into the WASM heap memory which
     refers to a NUL-terminated C-style string encoded as UTF-8. This
     function counts its byte length using cstrlen() then returns a
     JS-format string representing its contents. As a special case, if
     ptr is falsy or not a pointer, `null` is returned.
  */
  target.cstrToJs = function(ptr){
    const n = target.cstrlen(ptr);
    return n ? __utf8Decode(heapWrappers().HEAP8U, ptr, ptr+n) : (null===n ? n : "");
  };

  /**
     Given a JS string, this function returns its UTF-8 length in
     bytes. Returns null if str is not a string.
  */
  target.jstrlen = function(str){
    /** Attribution: derived from Emscripten's lengthBytesUTF8() */
    if('string'!==typeof str) return null;
    const n = str.length;
    let len = 0;
    for(let i = 0; i < n; ++i){
      let u = str.charCodeAt(i);
      if(u>=0xd800 && u<=0xdfff){
        u = 0x10000 + ((u & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF);
      }
      if(u<=0x7f) ++len;
      else if(u<=0x7ff) len += 2;
      else if(u<=0xffff) len += 3;
      else len += 4;
    }
    return len;
  };

  /**
     Encodes the given JS string as UTF8 into the given TypedArray
     tgt, starting at the given offset and writing, at most, maxBytes
     bytes (including the NUL terminator if addNul is true, else no
     NUL is added). If it writes any bytes at all and addNul is true,
     it always NUL-terminates the output, even if doing so means that
     the NUL byte is all that it writes.

     If maxBytes is negative (the default) then it is treated as the
     remaining length of tgt, starting at the given offset.

     If writing the last character would surpass the maxBytes count
     because the character is multi-byte, that character will not be
     written (as opposed to writing a truncated multi-byte character).
     This can lead to it writing as many as 3 fewer bytes than
     maxBytes specifies.

     Returns the number of bytes written to the target, _including_
     the NUL terminator (if any). If it returns 0, it wrote nothing at
     all, which can happen if:

     - str is empty and addNul is false.
     - offset < 0.
     - maxBytes == 0.
     - maxBytes is less than the byte length of a multi-byte str[0].

     Throws if tgt is not an Int8Array or Uint8Array.

     Design notes:

     - In C's strcpy(), the destination pointer is the first
       argument. That is not the case here primarily because the 3rd+
       arguments are all referring to the destination, so it seems to
       make sense to have them grouped with it.

     - Emscripten's counterpart of this function (stringToUTF8Array())
       returns the number of bytes written sans NUL terminator. That
       is, however, ambiguous: str.length===0 or maxBytes===(0 or 1)
       all cause 0 to be returned.
  */
  target.jstrcpy = function(jstr, tgt, offset = 0, maxBytes = -1, addNul = true){
    /** Attribution: the encoding bits are taken from Emscripten's
        stringToUTF8Array(). */
    if(!tgt || (!(tgt instanceof Int8Array) && !(tgt instanceof Uint8Array))){
      toss("jstrcpy() target must be an Int8Array or Uint8Array.");
    }
    if(maxBytes<0) maxBytes = tgt.length - offset;
    if(!(maxBytes>0) || !(offset>=0)) return 0;
    let i = 0, max = jstr.length;
    const begin = offset, end = offset + maxBytes - (addNul ? 1 : 0);
    for(; i < max && offset < end; ++i){
      let u = jstr.charCodeAt(i);
      if(u>=0xd800 && u<=0xdfff){
        u = 0x10000 + ((u & 0x3FF) << 10) | (jstr.charCodeAt(++i) & 0x3FF);
      }
      if(u<=0x7f){
        if(offset >= end) break;
        tgt[offset++] = u;
      }else if(u<=0x7ff){
        if(offset + 1 >= end) break;
        tgt[offset++] = 0xC0 | (u >> 6);
        tgt[offset++] = 0x80 | (u & 0x3f);
      }else if(u<=0xffff){
        if(offset + 2 >= end) break;
        tgt[offset++] = 0xe0 | (u >> 12);
        tgt[offset++] = 0x80 | ((u >> 6) & 0x3f);
        tgt[offset++] = 0x80 | (u & 0x3f);
      }else{
        if(offset + 3 >= end) break;
        tgt[offset++] = 0xf0 | (u >> 18);
        tgt[offset++] = 0x80 | ((u >> 12) & 0x3f);
        tgt[offset++] = 0x80 | ((u >> 6) & 0x3f);
        tgt[offset++] = 0x80 | (u & 0x3f);
      }
    }
    if(addNul) tgt[offset++] = 0;
    return offset - begin;
  };

  /**
     Works similarly to C's strncpy(), copying, at most, n bytes (not
     characters) from srcPtr to tgtPtr. It copies until n bytes have
     been copied or a 0 byte is reached in src. _Unlike_ strncpy(), it
     returns the number of bytes it assigns in tgtPtr, _including_ the
     NUL byte (if any). If n is reached before a NUL byte in srcPtr,
     tgtPtr will _not_ be NULL-terminated. If a NUL byte is reached
     before n bytes are copied, tgtPtr will be NUL-terminated.

     If n is negative, cstrlen(srcPtr)+1 is used to calculate it, the
     +1 being for the NUL byte.

     Throws if tgtPtr or srcPtr are falsy. Results are undefined if:

     - either is not a pointer into the WASM heap or

     - srcPtr is not NUL-terminated AND n is less than srcPtr's
       logical length.

     ACHTUNG: it is possible to copy partial multi-byte characters
     this way, and converting such strings back to JS strings will
     have undefined results.
  */
  target.cstrncpy = function(tgtPtr, srcPtr, n){
    if(!tgtPtr || !srcPtr) toss("cstrncpy() does not accept NULL strings.");
    if(n<0) n = target.cstrlen(strPtr)+1;
    else if(!(n>0)) return 0;
    const heap = target.heap8u();
    let i = 0, ch;
    for(; i < n && (ch = heap[srcPtr+i]); ++i){
      heap[tgtPtr+i] = ch;
    }
    if(i<n) heap[tgtPtr + i++] = 0;
    return i;
  };

  /**
     For the given JS string, returns a Uint8Array of its contents
     encoded as UTF-8. If addNul is true, the returned array will have
     a trailing 0 entry, else it will not.
  */
  target.jstrToUintArray = (str, addNul=false)=>{
    return cache.utf8Encoder.encode(addNul ? (str+"\0") : str);
    // Or the hard way...
    /** Attribution: derived from Emscripten's stringToUTF8Array() */
    //const a = [], max = str.length;
    //let i = 0, pos = 0;
    //for(; i < max; ++i){
    //  let u = str.charCodeAt(i);
    //  if(u>=0xd800 && u<=0xdfff){
    //    u = 0x10000 + ((u & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF);
    //  }
    //  if(u<=0x7f) a[pos++] = u;
    //  else if(u<=0x7ff){
    //    a[pos++] = 0xC0 | (u >> 6);
    //    a[pos++] = 0x80 | (u & 63);
    //  }else if(u<=0xffff){
    //    a[pos++] = 0xe0 | (u >> 12);
    //    a[pos++] = 0x80 | ((u >> 6) & 63);
    //    a[pos++] = 0x80 | (u & 63);
    //  }else{
    //    a[pos++] = 0xf0 | (u >> 18);
    //    a[pos++] = 0x80 | ((u >> 12) & 63);
    //    a[pos++] = 0x80 | ((u >> 6) & 63);
    //    a[pos++] = 0x80 | (u & 63);
    //  }
    // }
    // return new Uint8Array(a);
  };

  const __affirmAlloc = (obj,funcName)=>{
    if(!(obj.alloc instanceof Function) ||
       !(obj.dealloc instanceof Function)){
      toss("Object is missing alloc() and/or dealloc() function(s)",
           "required by",funcName+"().");
    }
  };

  const __allocCStr = function(jstr, returnWithLength, allocator, funcName){
    __affirmAlloc(target, funcName);
    if('string'!==typeof jstr) return null;
    if(0){/* older impl, possibly more widely compatible? */
      const n = target.jstrlen(jstr),
            ptr = allocator(n+1);
      target.jstrcpy(jstr, target.heap8u(), ptr, n+1, true);
      return returnWithLength ? [ptr, n] : ptr;
    }else{/* newer, (probably) faster and (certainly) simpler impl */
      const u = cache.utf8Encoder.encode(jstr),
            ptr = allocator(u.length+1),
            heap = heapWrappers().HEAP8U;
      heap.set(u, ptr);
      heap[ptr + u.length] = 0;
      return returnWithLength ? [ptr, u.length] : ptr;
    }
  };

  /**
     Uses target.alloc() to allocate enough memory for jstrlen(jstr)+1
     bytes of memory, copies jstr to that memory using jstrcpy(),
     NUL-terminates it, and returns the pointer to that C-string.
     Ownership of the pointer is transfered to the caller, who must
     eventually pass the pointer to dealloc() to free it.

     If passed a truthy 2nd argument then its return semantics change:
     it returns [ptr,n], where ptr is the C-string's pointer and n is
     its cstrlen().

     Throws if `target.alloc` or `target.dealloc` are not functions.
  */
  target.allocCString =
    (jstr, returnWithLength=false)=>__allocCStr(jstr, returnWithLength,
                                                target.alloc, 'allocCString()');

  /**
     Starts an "allocation scope." All allocations made using
     scopedAlloc() are recorded in this scope and are freed when the
     value returned from this function is passed to
     scopedAllocPop().

     This family of functions requires that the API's object have both
     `alloc()` and `dealloc()` methods, else this function will throw.

     Intended usage:

     ```
     const scope = scopedAllocPush();
     try {
       const ptr1 = scopedAlloc(100);
       const ptr2 = scopedAlloc(200);
       const ptr3 = scopedAlloc(300);
       ...
       // Note that only allocations made via scopedAlloc()
       // are managed by this allocation scope.
     }finally{
       scopedAllocPop(scope);
     }
     ```

     The value returned by this function must be treated as opaque by
     the caller, suitable _only_ for passing to scopedAllocPop().
     Its type and value are not part of this function's API and may
     change in any given version of this code.

     `scopedAlloc.level` can be used to determine how many scoped
     alloc levels are currently active.
   */
  target.scopedAllocPush = function(){
    __affirmAlloc(target, 'scopedAllocPush');
    const a = [];
    cache.scopedAlloc.push(a);
    return a;
  };

  /**
     Cleans up all allocations made using scopedAlloc() in the context
     of the given opaque state object, which must be a value returned
     by scopedAllocPush(). See that function for an example of how to
     use this function.

     Though scoped allocations are managed like a stack, this API
     behaves properly if allocation scopes are popped in an order
     other than the order they were pushed.

     If called with no arguments, it pops the most recent
     scopedAllocPush() result:

     ```
     scopedAllocPush();
     try{ ... } finally { scopedAllocPop(); }
     ```

     It's generally recommended that it be passed an explicit argument
     to help ensure that push/push are used in matching pairs, but in
     trivial code that may be a non-issue.
  */
  target.scopedAllocPop = function(state){
    __affirmAlloc(target, 'scopedAllocPop');
    const n = arguments.length
          ? cache.scopedAlloc.indexOf(state)
          : cache.scopedAlloc.length-1;
    if(n<0) toss("Invalid state object for scopedAllocPop().");
    if(0===arguments.length) state = cache.scopedAlloc[n];
    cache.scopedAlloc.splice(n,1);
    for(let p; (p = state.pop()); ){
      if(target.functionEntry(p)){
        //console.warn("scopedAllocPop() uninstalling function",p);
        target.uninstallFunction(p);
      }
      else target.dealloc(p);
    }
  };

  /**
     Allocates n bytes of memory using this.alloc() and records that
     fact in the state for the most recent call of scopedAllocPush().
     Ownership of the memory is given to scopedAllocPop(), which
     will clean it up when it is called. The memory _must not_ be
     passed to this.dealloc(). Throws if this API object is missing
     the required `alloc()` or `dealloc()` functions or no scoped
     alloc is active.

     See scopedAllocPush() for an example of how to use this function.

     The `level` property of this function can be queried to query how
     many scoped allocation levels are currently active.

     See also: scopedAllocPtr(), scopedAllocCString()
  */
  target.scopedAlloc = function(n){
    if(!cache.scopedAlloc.length){
      toss("No scopedAllocPush() scope is active.");
    }
    const p = target.alloc(n);
    cache.scopedAlloc[cache.scopedAlloc.length-1].push(p);
    return p;
  };

  Object.defineProperty(target.scopedAlloc, 'level', {
    configurable: false, enumerable: false,
    get: ()=>cache.scopedAlloc.length,
    set: ()=>toss("The 'active' property is read-only.")
  });

  /**
     Works identically to allocCString() except that it allocates the
     memory using scopedAlloc().

     Will throw if no scopedAllocPush() call is active.
  */
  target.scopedAllocCString =
    (jstr, returnWithLength=false)=>__allocCStr(jstr, returnWithLength,
                                                target.scopedAlloc, 'scopedAllocCString()');

  // impl for allocMainArgv() and scopedAllocMainArgv().
  const __allocMainArgv = function(isScoped, list){
    const pList = target[
      isScoped ? 'scopedAlloc' : 'alloc'
    ]((list.length + 1) * target.ptrSizeof);
    let i = 0;
    list.forEach((e)=>{
      target.pokePtr(pList + (target.ptrSizeof * i++),
                         target[
                           isScoped ? 'scopedAllocCString' : 'allocCString'
                         ](""+e));
    });
    target.pokePtr(pList + (target.ptrSizeof * i), 0);
    return pList;
  };

  /**
     Creates an array, using scopedAlloc(), suitable for passing to a
     C-level main() routine. The input is a collection with a length
     property and a forEach() method. A block of memory
     (list.length+1) entries long is allocated and each pointer-sized
     block of that memory is populated with a scopedAllocCString()
     conversion of the (""+value) of each element, with the exception
     that the final entry is a NULL pointer. Returns a pointer to the
     start of the list, suitable for passing as the 2nd argument to a
     C-style main() function.

     Throws if scopedAllocPush() is not active.

     Design note: the returned array is allocated with an extra NULL
     pointer entry to accommodate certain APIs, but client code which
     does not need that functionality should treat the returned array
     as list.length entries long.
  */
  target.scopedAllocMainArgv = (list)=>__allocMainArgv(true, list);

  /**
     Identical to scopedAllocMainArgv() but uses alloc() instead of
     scopedAlloc().
  */
  target.allocMainArgv = (list)=>__allocMainArgv(false, list);

  /**
     Expects to be given a C-style string array and its length. It
     returns a JS array of strings and/or nulls: any entry in the
     pArgv array which is NULL results in a null entry in the result
     array. If argc is 0 then an empty array is returned.

     Results are undefined if any entry in the first argc entries of
     pArgv are neither 0 (NULL) nor legal UTF-format C strings.

     To be clear, the expected C-style arguments to be passed to this
     function are `(int, char **)` (optionally const-qualified).
  */
  target.cArgvToJs = (argc, pArgv)=>{
    const list = [];
    for(let i = 0; i < argc; ++i){
      const arg = target.peekPtr(pArgv + (target.ptrSizeof * i));
      list.push( arg ? target.cstrToJs(arg) : null );
    }
    return list;
  };

  /**
     Wraps function call func() in a scopedAllocPush() and
     scopedAllocPop() block, such that all calls to scopedAlloc() and
     friends from within that call will have their memory freed
     automatically when func() returns. If func throws or propagates
     an exception, the scope is still popped, otherwise it returns the
     result of calling func().
  */
  target.scopedAllocCall = function(func){
    target.scopedAllocPush();
    try{ return func() } finally{ target.scopedAllocPop() }
  };

  /** Internal impl for allocPtr() and scopedAllocPtr(). */
  const __allocPtr = function(howMany, safePtrSize, method){
    __affirmAlloc(target, method);
    const pIr = safePtrSize ? 'i64' : ptrIR;
    let m = target[method](howMany * (safePtrSize ? 8 : ptrSizeof));
    target.poke(m, 0, pIr)
    if(1===howMany){
      return m;
    }
    const a = [m];
    for(let i = 1; i < howMany; ++i){
      m += (safePtrSize ? 8 : ptrSizeof);
      a[i] = m;
      target.poke(m, 0, pIr);
    }
    return a;
  };

  /**
     Allocates one or more pointers as a single chunk of memory and
     zeroes them out.

     The first argument is the number of pointers to allocate. The
     second specifies whether they should use a "safe" pointer size (8
     bytes) or whether they may use the default pointer size
     (typically 4 but also possibly 8).

     How the result is returned depends on its first argument: if
     passed 1, it returns the allocated memory address. If passed more
     than one then an array of pointer addresses is returned, which
     can optionally be used with "destructuring assignment" like this:

     ```
     const [p1, p2, p3] = allocPtr(3);
     ```

     ACHTUNG: when freeing the memory, pass only the _first_ result
     value to dealloc(). The others are part of the same memory chunk
     and must not be freed separately.

     The reason for the 2nd argument is..

     When one of the returned pointers will refer to a 64-bit value,
     e.g. a double or int64, an that value must be written or fetched,
     e.g. using poke() or peek(), it is important that
     the pointer in question be aligned to an 8-byte boundary or else
     it will not be fetched or written properly and will corrupt or
     read neighboring memory. It is only safe to pass false when the
     client code is certain that it will only get/fetch 4-byte values
     (or smaller).
  */
  target.allocPtr =
    (howMany=1, safePtrSize=true)=>__allocPtr(howMany, safePtrSize, 'alloc');

  /**
     Identical to allocPtr() except that it allocates using scopedAlloc()
     instead of alloc().
  */
  target.scopedAllocPtr =
    (howMany=1, safePtrSize=true)=>__allocPtr(howMany, safePtrSize, 'scopedAlloc');

  /**
     If target.exports[name] exists, it is returned, else an
     exception is thrown.
  */
  target.xGet = function(name){
    return target.exports[name] || toss("Cannot find exported symbol:",name);
  };

  const __argcMismatch =
        (f,n)=>toss(f+"() requires",n,"argument(s).");

  /**
     Looks up a WASM-exported function named fname from
     target.exports. If found, it is called, passed all remaining
     arguments, and its return value is returned to xCall's caller. If
     not found, an exception is thrown. This function does no
     conversion of argument or return types, but see xWrap() and
     xCallWrapped() for variants which do.

     As a special case, if passed only 1 argument after the name and
     that argument in an Array, that array's entries become the
     function arguments. (This is not an ambiguous case because it's
     not legal to pass an Array object to a WASM function.)
  */
  target.xCall = function(fname, ...args){
    const f = target.xGet(fname);
    if(!(f instanceof Function)) toss("Exported symbol",fname,"is not a function.");
    if(f.length!==args.length) __argcMismatch(fname,f.length)
    /* This is arguably over-pedantic but we want to help clients keep
       from shooting themselves in the foot when calling C APIs. */;
    return (2===arguments.length && Array.isArray(arguments[1]))
      ? f.apply(null, arguments[1])
      : f.apply(null, args);
  };

  /**
     State for use with xWrap()
  */
  cache.xWrap = Object.create(null);
  cache.xWrap.convert = Object.create(null);
  /** Map of type names to argument conversion functions. */
  cache.xWrap.convert.arg = new Map;
  /** Map of type names to return result conversion functions. */
  cache.xWrap.convert.result = new Map;
  const xArg = cache.xWrap.convert.arg, xResult = cache.xWrap.convert.result;

  if(target.bigIntEnabled){
    xArg.set('i64', (i)=>BigInt(i));
  }
  const __xArgPtr = 'i32' === ptrIR
        ? ((i)=>(i | 0)) : ((i)=>(BigInt(i) | BigInt(0)));
  xArg.set('i32', __xArgPtr )
    .set('i16', (i)=>((i | 0) & 0xFFFF))
    .set('i8', (i)=>((i | 0) & 0xFF))
    .set('f32', (i)=>Number(i).valueOf())
    .set('float', xArg.get('f32'))
    .set('f64', xArg.get('f32'))
    .set('double', xArg.get('f64'))
    .set('int', xArg.get('i32'))
    .set('null', (i)=>i)
    .set(null, xArg.get('null'))
    .set('**', __xArgPtr)
    .set('*', __xArgPtr);
  xResult.set('*', __xArgPtr)
    .set('pointer', __xArgPtr)
    .set('number', (v)=>Number(v))
    .set('void', (v)=>undefined)
    .set('null', (v)=>v)
    .set(null, xResult.get('null'));

  { /* Copy certain xArg[...] handlers to xResult[...] and
       add pointer-style variants of them. */
    const copyToResult = ['i8', 'i16', 'i32', 'int',
                          'f32', 'float', 'f64', 'double'];
    if(target.bigIntEnabled) copyToResult.push('i64');
    const adaptPtr = xArg.get(ptrIR);
    for(const t of copyToResult){
      xArg.set(t+'*', adaptPtr);
      xResult.set(t+'*', adaptPtr);
      xResult.set(t, (xArg.get(t) || toss("Missing arg converter:",t)));
    }
  }

  /**
     In order for args of type string to work in various contexts in
     the sqlite3 API, we need to pass them on as, variably, a C-string
     or a pointer value. Thus for ARGs of type 'string' and
     '*'/'pointer' we behave differently depending on whether the
     argument is a string or not:

     - If v is a string, scopeAlloc() a new C-string from it and return
       that temp string's pointer.

     - Else return the value from the arg adapter defined for ptrIR.

     TODO? Permit an Int8Array/Uint8Array and convert it to a string?
     Would that be too much magic concentrated in one place, ready to
     backfire? We handle that at the client level in sqlite3 with a
     custom argument converter.
  */
  const __xArgString = function(v){
    if('string'===typeof v) return target.scopedAllocCString(v);
    return v ? __xArgPtr(v) : null;
  };
  xArg.set('string', __xArgString)
    .set('utf8', __xArgString)
    .set('pointer', __xArgString);
  //xArg.set('*', __xArgString);

  xResult.set('string', (i)=>target.cstrToJs(i))
    .set('utf8', xResult.get('string'))
    .set('string:dealloc', (i)=>{
      try { return i ? target.cstrToJs(i) : null }
      finally{ target.dealloc(i) }
    })
    .set('utf8:dealloc', xResult.get('string:dealloc'))
    .set('json', (i)=>JSON.parse(target.cstrToJs(i)))
    .set('json:dealloc', (i)=>{
      try{ return i ? JSON.parse(target.cstrToJs(i)) : null }
      finally{ target.dealloc(i) }
    });

  /**
     Internal-use-only base class for FuncPtrAdapter and potentially
     additional stateful argument adapter classes.

     Note that its main interface (convertArg()) is strictly
     internal, not to be exposed to client code, as it may still
     need re-shaping. Only the constructors of concrete subclasses
     should be exposed to clients, and those in such a way that
     does not hinder internal redesign of the convertArg()
     interface.
  */
  const AbstractArgAdapter = class {
    constructor(opt){
      this.name = opt.name || 'unnamed adapter';
    }
    /**
       Gets called via xWrap() to "convert" v to whatever type
       this specific class supports.

       argIndex is the argv index of _this_ argument in the
       being-xWrap()'d call. argv is the current argument list
       undergoing xWrap() argument conversion. argv entries to the
       left of argIndex will have already undergone transformation and
       those to the right will not have (they will have the values the
       client-level code passed in, awaiting conversion). The RHS
       indexes must never be relied upon for anything because their
       types are indeterminate, whereas the LHS values will be
       WASM-compatible values by the time this is called.
    */
    convertArg(v,argv,argIndex){
      toss("AbstractArgAdapter must be subclassed.");
    }
  };

  /**
     An attempt at adding function pointer conversion support to
     xWrap(). This type is recognized by xWrap() as a proxy for
     converting a JS function to a C-side function, either
     permanently, for the duration of a single call into the C layer,
     or semi-contextual, where it may keep track of a single binding
     for a given context and uninstall the binding if it's replaced.

     The constructor requires an options object with these properties:

     - name (optional): string describing the function binding. This
       is solely for debugging and error-reporting purposes. If not
       provided, an empty string is assumed.

     - signature: a function signature string compatible with
       jsFuncToWasm().

     - bindScope (string): one of ('transient', 'context',
       'singleton'). Bind scopes are:

       - 'transient': it will convert JS functions to WASM only for
         the duration of the xWrap()'d function call, using
         scopedInstallFunction(). Before that call returns, the
         WASM-side binding will be uninstalled.

       - 'singleton': holds one function-pointer binding for this
         instance. If it's called with a different function pointer,
         it uninstalls the previous one after converting the new
         value. This is only useful for use with "global" functions
         which do not rely on any state other than this function
         pointer. If the being-converted function pointer is intended
         to be mapped to some sort of state object (e.g. an
         `sqlite3*`) then "context" (see below) is the proper mode.

       - 'context': similar to singleton mode but for a given
         "context", where the context is a key provided by the user
         and possibly dependent on a small amount of call-time
         context. This mode is the default if bindScope is _not_ set
         but a property named contextKey (described below) is.

       - 'permanent': the function is installed and left there
         forever. There is no way to recover its pointer address
         later on.

     - callProxy (function): if set, this must be a function which
       will act as a proxy for any "converted" JS function. It is
       passed the being-converted function value and must return
       either that function or a function which acts on its
       behalf. The returned function will be the one which gets
       installed into the WASM function table. The proxy must perform
       any required argument conversion (noting that it will be called
       from C code, so will receive C-format arguments) before passing
       them on to the being-converted function. Whether or not the
       proxy itself must return a value depends on the context. If it
       does, it must be a WASM-friendly value, as it will be returning
       from a call made from native code.

     - contextKey (function): is only used if bindScope is 'context'
       or if bindScope is not set and this function is, in which case
       'context' is assumed. This function gets bound to this object,
       so its "this" is this object. It gets passed (argv,argIndex),
       where argIndex is the index of _this_ function pointer in its
       _wrapping_ function's arguments and argv is the _current_
       still-being-xWrap()-processed args array. All arguments to the
       left of argIndex will have been processed by xWrap() by the
       time this is called. argv[argIndex] will be the value the user
       passed in to the xWrap()'d function for the argument this
       FuncPtrAdapter is mapped to. Arguments to the right of
       argv[argIndex] will not yet have been converted before this is
       called. The function must return a key which uniquely
       identifies this function mapping context for _this_
       FuncPtrAdapter instance (other instances are not considered),
       taking into account that C functions often take some sort of
       state object as one or more of their arguments. As an example,
       if the xWrap()'d function takes `(int,T*,functionPtr,X*)` and
       this FuncPtrAdapter is the argv[2]nd arg, contextKey(argv,2)
       might return 'T@'+argv[1], or even just argv[1].  Note,
       however, that the (X*) argument will not yet have been
       processed by the time this is called and should not be used as
       part of that key because its pre-conversion data type might be
       unpredictable. Similarly, care must be taken with C-string-type
       arguments: those to the left in argv will, when this is called,
       be WASM pointers, whereas those to the right might (and likely
       do) have another data type. When using C-strings in keys, never
       use their pointers in the key because most C-strings in this
       constellation are transient.

     Yes, that ^^^ is quite awkward, but it's what we have.

     The constructor only saves the above state for later, and does
     not actually bind any functions. Its convertArg() method is
     called via xWrap() to perform any bindings.

     Shortcomings:

     - These "reverse" bindings, i.e. calling into a JS-defined
       function from a WASM-defined function (the generated proxy
       wrapper), lack all type conversion support. That means, for
       example, that...

     - Function pointers which include C-string arguments may still
       need a level of hand-written wrappers around them, depending on
       how they're used, in order to provide the client with JS
       strings. Alternately, clients will need to perform such conversions
       on their own, e.g. using cstrtojs(). Or maybe we can find a way
       to perform such conversions here, via addition of an xWrap()-style
       function signature to the options argument.
  */
  xArg.FuncPtrAdapter = class FuncPtrAdapter extends AbstractArgAdapter {
    constructor(opt) {
      super(opt);
      if(xArg.FuncPtrAdapter.warnOnUse){
        console.warn('xArg.FuncPtrAdapter is an internal-only API',
                     'and is not intended to be invoked from',
                     'client-level code. Invoked with:',opt);
      }
      this.name = opt.name || "unnamed";
      this.signature = opt.signature;
      if(opt.contextKey instanceof Function){
        this.contextKey = opt.contextKey;
        if(!opt.bindScope) opt.bindScope = 'context';
      }
      this.bindScope = opt.bindScope
        || toss("FuncPtrAdapter options requires a bindScope (explicit or implied).");
      if(FuncPtrAdapter.bindScopes.indexOf(opt.bindScope)<0){
        toss("Invalid options.bindScope ("+opt.bindMod+") for FuncPtrAdapter. "+
             "Expecting one of: ("+FuncPtrAdapter.bindScopes.join(', ')+')');
      }
      this.isTransient = 'transient'===this.bindScope;
      this.isContext = 'context'===this.bindScope;
      this.isPermanent = 'permanent'===this.bindScope;
      this.singleton = ('singleton'===this.bindScope) ? [] : undefined;
      //console.warn("FuncPtrAdapter()",opt,this);
      this.callProxy = (opt.callProxy instanceof Function)
        ? opt.callProxy : undefined;
    }

    /**
       Note that static class members are defined outside of the class
       to work around an emcc toolchain build problem: one of the
       tools in emsdk v3.1.42 does not support the static keyword.
    */

    /* Dummy impl. Overwritten per-instance as needed. */
    contextKey(argv,argIndex){
      return this;
    }

    /* Returns this objects mapping for the given context key, in the
       form of an an array, creating the mapping if needed. The key
       may be anything suitable for use in a Map. */
    contextMap(key){
      const cm = (this.__cmap || (this.__cmap = new Map));
      let rc = cm.get(key);
      if(undefined===rc) cm.set(key, (rc = []));
      return rc;
    }

    /**
       Gets called via xWrap() to "convert" v to a WASM-bound function
       pointer. If v is one of (a pointer, null, undefined) then
       (v||0) is returned and any earlier function installed by this
       mapping _might_, depending on how it's bound, be uninstalled.
       If v is not one of those types, it must be a Function, for
       which it creates (if needed) a WASM function binding and
       returns the WASM pointer to that binding. If this instance is
       not in 'transient' mode, it will remember the binding for at
       least the next call, to avoid recreating the function binding
       unnecessarily.

       If it's passed a pointer(ish) value for v, it does _not_
       perform any function binding, so this object's bindMode is
       irrelevant for such cases.

       See the parent class's convertArg() docs for details on what
       exactly the 2nd and 3rd arguments are.
    */
    convertArg(v,argv,argIndex){
      //FuncPtrAdapter.debugOut("FuncPtrAdapter.convertArg()",this.name,this.signature,this.transient,v);
      let pair = this.singleton;
      if(!pair && this.isContext){
        pair = this.contextMap(this.contextKey(argv,argIndex));
        //FuncPtrAdapter.debugOut(this.name, this.signature, "contextKey() =",this.contextKey(argv,argIndex), pair);
      }
      if(pair && pair[0]===v) return pair[1];
      if(v instanceof Function){
        /* Install a WASM binding and return its pointer. */
        //FuncPtrAdapter.debugOut("FuncPtrAdapter.convertArg()",this.name,this.signature,this.transient,v,pair);
        if(this.callProxy) v = this.callProxy(v);
        const fp = __installFunction(v, this.signature, this.isTransient);
        if(FuncPtrAdapter.debugFuncInstall){
          FuncPtrAdapter.debugOut("FuncPtrAdapter installed", this,
                                  this.contextKey(argv,argIndex), '@'+fp, v);
        }
        if(pair){
          /* Replace existing stashed mapping */
          if(pair[1]){
            if(FuncPtrAdapter.debugFuncInstall){
              FuncPtrAdapter.debugOut("FuncPtrAdapter uninstalling", this,
                                      this.contextKey(argv,argIndex), '@'+pair[1], v);
            }
            try{
              /* Because the pending native call might rely on the
                 pointer we're replacing, e.g. as is normally the case
                 with sqlite3's xDestroy() methods, we don't
                 immediately uninstall but instead add its pointer to
                 the scopedAlloc stack, which will be cleared when the
                 xWrap() mechanism is done calling the native
                 function. We're relying very much here on xWrap()
                 having pushed an alloc scope.
              */
              cache.scopedAlloc[cache.scopedAlloc.length-1].push(pair[1]);
            }
            catch(e){/*ignored*/}
          }
          pair[0] = v;
          pair[1] = fp;
        }
        return fp;
      }else if(target.isPtr(v) || null===v || undefined===v){
        //FuncPtrAdapter.debugOut("FuncPtrAdapter.convertArg()",this.name,this.signature,this.transient,v,pair);
        if(pair && pair[1] && pair[1]!==v){
          /* uninstall stashed mapping and replace stashed mapping with v. */
          if(FuncPtrAdapter.debugFuncInstall){
            FuncPtrAdapter.debugOut("FuncPtrAdapter uninstalling", this,
                                    this.contextKey(argv,argIndex), '@'+pair[1], v);
          }
          try{ cache.scopedAlloc[cache.scopedAlloc.length-1].push(pair[1]) }
          catch(e){/*ignored*/}
          pair[0] = pair[1] = (v | 0);
        }
        return v || 0;
      }else{
        throw new TypeError("Invalid FuncPtrAdapter argument type. "+
                            "Expecting a function pointer or a "+
                            (this.name ? this.name+' ' : '')+
                            "function matching signature "+
                            this.signature+".");
      }
    }/*convertArg()*/
  }/*FuncPtrAdapter*/;

  /** If true, the constructor emits a warning. The intent is that
      this be set to true after bootstrapping of the higher-level
      client library is complete, to warn downstream clients that
      they shouldn't be relying on this implemenation detail which
      does not have a stable interface. */
  xArg.FuncPtrAdapter.warnOnUse = false;

  /** If true, convertArg() will FuncPtrAdapter.debugOut() when it
      (un)installs a function binding to/from WASM. Note that
      deinstallation of bindScope=transient bindings happens
      via scopedAllocPop() so will not be output. */
  xArg.FuncPtrAdapter.debugFuncInstall = false;

  /** Function used for debug output. */
  xArg.FuncPtrAdapter.debugOut = console.debug.bind(console);

  xArg.FuncPtrAdapter.bindScopes = [
    'transient', 'context', 'singleton', 'permanent'
  ];

  const __xArgAdapterCheck =
        (t)=>xArg.get(t) || toss("Argument adapter not found:",t);

  const __xResultAdapterCheck =
        (t)=>xResult.get(t) || toss("Result adapter not found:",t);

  cache.xWrap.convertArg = (t,...args)=>__xArgAdapterCheck(t)(...args);
  cache.xWrap.convertArgNoCheck = (t,...args)=>xArg.get(t)(...args);

  cache.xWrap.convertResult =
    (t,v)=>(null===t ? v : (t ? __xResultAdapterCheck(t)(v) : undefined));
  cache.xWrap.convertResultNoCheck =
    (t,v)=>(null===t ? v : (t ? xResult.get(t)(v) : undefined));

  /**
     Creates a wrapper for another function which converts the arguments
     of the wrapper to argument types accepted by the wrapped function,
     then converts the wrapped function's result to another form
     for the wrapper.

     The first argument must be one of:

     - A JavaScript function.
     - The name of a WASM-exported function. In the latter case xGet()
       is used to fetch the exported function, which throws if it's not
       found.
     - A pointer into the indirect function table. e.g. a pointer
       returned from target.installFunction().

     It returns either the passed-in function or a wrapper for that
     function which converts the JS-side argument types into WASM-side
     types and converts the result type.

     The second argument, `resultType`, describes the conversion for
     the wrapped functions result. A literal `null` or the string
     `'null'` both mean to return the original function's value as-is
     (mnemonic: there is "null" conversion going on). Literal
     `undefined` or the string `"void"` both mean to ignore the
     function's result and return `undefined`. Aside from those two
     special cases, the `resultType` value may be one of the values
     described below or any mapping installed by the client using
     xWrap.resultAdapter().

     If passed 3 arguments and the final one is an array, that array
     must contain a list of type names (see below) for adapting the
     arguments from JS to WASM.  If passed 2 arguments, more than 3,
     or the 3rd is not an array, all arguments after the 2nd (if any)
     are treated as type names. i.e.:

     ```
     xWrap('funcname', 'i32', 'string', 'f64');
     // is equivalent to:
     xWrap('funcname', 'i32', ['string', 'f64']);
     ```

     This function enforces that the given list of arguments has the
     same arity as the being-wrapped function (as defined by its
     `length` property) and it will throw if that is not the case.
     Similarly, the created wrapper will throw if passed a differing
     argument count.

     Type names are symbolic names which map the arguments to an
     adapter function to convert, if needed, the value before passing
     it on to WASM or to convert a return result from WASM. The list
     of built-in names:

     - `i8`, `i16`, `i32` (args and results): all integer conversions
       which convert their argument to an integer and truncate it to
       the given bit length.

     - `N*` (args): a type name in the form `N*`, where N is a numeric
       type name, is treated the same as WASM pointer.

     - `*` and `pointer` (args): are assumed to be WASM pointer values
       and are returned coerced to an appropriately-sized pointer
       value (i32 or i64). Non-numeric values will coerce to 0 and
       out-of-range values will have undefined results (just as with
       any pointer misuse).

     - `*` and `pointer` (results): aliases for the current
       WASM pointer numeric type.

     - `**` (args): is simply a descriptive alias for the WASM pointer
       type. It's primarily intended to mark output-pointer arguments.

     - `i64` (args and results): passes the value to BigInt() to
       convert it to an int64. Only available if bigIntEnabled is
       true.

     - `f32` (`float`), `f64` (`double`) (args and results): pass
       their argument to Number(). i.e. the adapter does not currently
       distinguish between the two types of floating-point numbers.

     - `number` (results): converts the result to a JS Number using
       Number(theValue).valueOf(). Note that this is for result
       conversions only, as it's not possible to generically know
       which type of number to convert arguments to.

     Non-numeric conversions include:

     - `null` literal or `"null"` string (args and results): perform
       no translation and pass the arg on as-is. This is primarily
       useful for results but may have a use or two for arguments.

     - `string` or `utf8` (args): has two different semantics in order
       to accommodate various uses of certain C APIs
       (e.g. output-style strings)...

       - If the arg is a string, it creates a _temporary_
         UTF-8-encoded C-string to pass to the exported function,
         cleaning it up before the wrapper returns. If a long-lived
         C-string pointer is required, that requires client-side code
         to create the string, then pass its pointer to the function.

       - Else the arg is assumed to be a pointer to a string the
         client has already allocated and it's passed on as
         a WASM pointer.

     - `string` or `utf8` (results): treats the result value as a
       const C-string, encoded as UTF-8, copies it to a JS string,
       and returns that JS string.

     - `string:dealloc` or `utf8:dealloc) (results): treats the result value
       as a non-const UTF-8 C-string, ownership of which has just been
       transfered to the caller. It copies the C-string to a JS
       string, frees the C-string, and returns the JS string. If such
       a result value is NULL, the JS result is `null`. Achtung: when
       using an API which returns results from a specific allocator,
       e.g. `my_malloc()`, this conversion _is not legal_. Instead, an
       equivalent conversion which uses the appropriate deallocator is
       required. For example:

```js
   target.xWrap.resultAdapter('string:my_free',(i)=>{
      try { return i ? target.cstrToJs(i) : null }
      finally{ target.exports.my_free(i) }
   };
```

     - `json` (results): treats the result as a const C-string and
       returns the result of passing the converted-to-JS string to
       JSON.parse(). Returns `null` if the C-string is a NULL pointer.

     - `json:dealloc` (results): works exactly like `string:dealloc` but
       returns the same thing as the `json` adapter. Note the
       warning in `string:dealloc` regarding maching allocators and
       deallocators.

     The type names for results and arguments are validated when
     xWrap() is called and any unknown names will trigger an
     exception.

     Clients may map their own result and argument adapters using
     xWrap.resultAdapter() and xWrap.argAdapter(), noting that not all
     type conversions are valid for both arguments _and_ result types
     as they often have different memory ownership requirements.

     Design note: the ability to pass in a JS function as the first
     argument is of relatively limited use, primarily for testing
     argument and result converters. JS functions, by and large, will
     not want to deal with C-type arguments.

     TODOs:

     - Figure out how/whether we can (semi-)transparently handle
       pointer-type _output_ arguments. Those currently require
       explicit handling by allocating pointers, assigning them before
       the call using poke(), and fetching them with
       peek() after the call. We may be able to automate some
       or all of that.

     - Figure out whether it makes sense to extend the arg adapter
       interface such that each arg adapter gets an array containing
       the results of the previous arguments in the current call. That
       might allow some interesting type-conversion feature. Use case:
       handling of the final argument to sqlite3_prepare_v2() depends
       on the type (pointer vs JS string) of its 2nd
       argument. Currently that distinction requires hand-writing a
       wrapper for that function. That case is unusual enough that
       abstracting it into this API (and taking on the associated
       costs) may well not make good sense.
  */
  target.xWrap = function(fArg, resultType, ...argTypes){
    if(3===arguments.length && Array.isArray(arguments[2])){
      argTypes = arguments[2];
    }
    if(target.isPtr(fArg)){
      fArg = target.functionEntry(fArg)
        || toss("Function pointer not found in WASM function table.");
    }
    const fIsFunc = (fArg instanceof Function);
    const xf = fIsFunc ? fArg : target.xGet(fArg);
    if(fIsFunc) fArg = xf.name || 'unnamed function';
    if(argTypes.length!==xf.length) __argcMismatch(fArg, xf.length);
    if((null===resultType) && 0===xf.length){
      /* Func taking no args with an as-is return. We don't need a wrapper.
         We forego the argc check here, though. */
      return xf;
    }
    /*Verify the arg type conversions are valid...*/;
    if(undefined!==resultType && null!==resultType) __xResultAdapterCheck(resultType);
    for(const t of argTypes){
      if(t instanceof AbstractArgAdapter) xArg.set(t, (...args)=>t.convertArg(...args));
      else __xArgAdapterCheck(t);
    }
    const cxw = cache.xWrap;
    if(0===xf.length){
      // No args to convert, so we can create a simpler wrapper...
      return (...args)=>(args.length
                         ? __argcMismatch(fArg, xf.length)
                         : cxw.convertResult(resultType, xf.call(null)));
    }
    return function(...args){
      if(args.length!==xf.length) __argcMismatch(fArg, xf.length);
      const scope = target.scopedAllocPush();
      try{
        /*
          Maintenance reminder re. arguments passed to convertArg():
          The public interface of argument adapters is that they take
          ONE argument and return a (possibly) converted result for
          it. The passing-on of arguments after the first is an
          internal implementation detail for the sake of
          AbstractArgAdapter, and not to be relied on or documented
          for other cases. The fact that this is how
          AbstractArgAdapter.convertArgs() gets its 2nd+ arguments,
          and how FuncPtrAdapter.contextKey() gets its args, is also
          an implementation detail and subject to change. i.e. the
          public interface of 1 argument is stable.  The fact that any
          arguments may be passed in after that one, and what those
          arguments are, is _not_ part of the public interface and is
          _not_ stable.
        */
        for(const i in args) args[i] = cxw.convertArgNoCheck(
          argTypes[i], args[i], args, i
        );
        return cxw.convertResultNoCheck(resultType, xf.apply(null,args));
      }finally{
        target.scopedAllocPop(scope);
      }
    };
  }/*xWrap()*/;

  /** Internal impl for xWrap.resultAdapter() and argAdapter(). */
  const __xAdapter = function(func, argc, typeName, adapter, modeName, xcvPart){
    if('string'===typeof typeName){
      if(1===argc) return xcvPart.get(typeName);
      else if(2===argc){
        if(!adapter){
          delete xcvPart.get(typeName);
          return func;
        }else if(!(adapter instanceof Function)){
          toss(modeName,"requires a function argument.");
        }
        xcvPart.set(typeName, adapter);
        return func;
      }
    }
    toss("Invalid arguments to",modeName);
  };

  /**
     Gets, sets, or removes a result value adapter for use with
     xWrap(). If passed only 1 argument, the adapter function for the
     given type name is returned.  If the second argument is explicit
     falsy (as opposed to defaulted), the adapter named by the first
     argument is removed. If the 2nd argument is not falsy, it must be
     a function which takes one value and returns a value appropriate
     for the given type name. The adapter may throw if its argument is
     not of a type it can work with. This function throws for invalid
     arguments.

     Example:

     ```
     xWrap.resultAdapter('twice',(v)=>v+v);
     ```

     xWrap.resultAdapter() MUST NOT use the scopedAlloc() family of
     APIs to allocate a result value. xWrap()-generated wrappers run
     in the context of scopedAllocPush() so that argument adapters can
     easily convert, e.g., to C-strings, and have them cleaned up
     automatically before the wrapper returns to the caller. Likewise,
     if a _result_ adapter uses scoped allocation, the result will be
     freed before because they would be freed before the wrapper
     returns, leading to chaos and undefined behavior.

     Except when called as a getter, this function returns itself.
  */
  target.xWrap.resultAdapter = function f(typeName, adapter){
    return __xAdapter(f, arguments.length, typeName, adapter,
                      'resultAdapter()', xResult);
  };

  /**
     Functions identically to xWrap.resultAdapter() but applies to
     call argument conversions instead of result value conversions.

     xWrap()-generated wrappers perform argument conversion in the
     context of a scopedAllocPush(), so any memory allocation
     performed by argument adapters really, really, really should be
     made using the scopedAlloc() family of functions unless
     specifically necessary. For example:

     ```
     xWrap.argAdapter('my-string', function(v){
       return ('string'===typeof v)
         ? myWasmObj.scopedAllocCString(v) : null;
     };
     ```

     Contrariwise, xWrap.resultAdapter() must _not_ use scopedAlloc()
     to allocate its results because they would be freed before the
     xWrap()-created wrapper returns.

     Note that it is perfectly legitimate to use these adapters to
     perform argument validation, as opposed (or in addition) to
     conversion.
  */
  target.xWrap.argAdapter = function f(typeName, adapter){
    return __xAdapter(f, arguments.length, typeName, adapter,
                      'argAdapter()', xArg);
  };

  target.xWrap.FuncPtrAdapter = xArg.FuncPtrAdapter;

  /**
     Functions like xCall() but performs argument and result type
     conversions as for xWrap(). The first, second, and third
     arguments are as documented for xWrap(), except that the 3rd
     argument may be either a falsy value or empty array to represent
     nullary functions. The 4th+ arguments are arguments for the call,
     with the special case that if the 4th argument is an array, it is
     used as the arguments for the call. Returns the converted result
     of the call.

     This is just a thin wrapper around xWrap(). If the given function
     is to be called more than once, it's more efficient to use
     xWrap() to create a wrapper, then to call that wrapper as many
     times as needed. For one-shot calls, however, this variant is
     arguably more efficient because it will hypothetically free the
     wrapper function quickly.
  */
  target.xCallWrapped = function(fArg, resultType, argTypes, ...args){
    if(Array.isArray(arguments[3])) args = arguments[3];
    return target.xWrap(fArg, resultType, argTypes||[]).apply(null, args||[]);
  };

  /**
     This function is ONLY exposed in the public API to facilitate
     testing. It should not be used in application-level code, only
     in test code.

     Expects to be given (typeName, value) and returns a conversion
     of that value as has been registered using argAdapter().
     It throws if no adapter is found.

     ACHTUNG: the adapter may require that a scopedAllocPush() is
     active and it may allocate memory within that scope. It may also
     require additional arguments, depending on the type of
     conversion.
  */
  target.xWrap.testConvertArg = cache.xWrap.convertArg;

  /**
     This function is ONLY exposed in the public API to facilitate
     testing. It should not be used in application-level code, only
     in test code.

     Expects to be given (typeName, value) and returns a conversion
     of that value as has been registered using resultAdapter().
     It throws if no adapter is found.

     ACHTUNG: the adapter may allocate memory which the caller may need
     to know how to free.
  */
  target.xWrap.testConvertResult = cache.xWrap.convertResult;

  return target;
};

/**
   yawl (Yet Another Wasm Loader) provides very basic wasm loader.
   It requires a config object:

   - `uri`: required URI of the WASM file to load.

   - `onload(loadResult,config)`: optional callback. The first
     argument is the result object from
     WebAssembly.instantiate[Streaming](). The 2nd is the config
     object passed to this function. Described in more detail below.

   - `imports`: optional imports object for
     WebAssembly.instantiate[Streaming](). The default is an empty set
     of imports. If the module requires any imports, this object
     must include them.

   - `wasmUtilTarget`: optional object suitable for passing to
     WhWasmUtilInstaller(). If set, it gets passed to that function
     after the promise resolves. This function sets several properties
     on it before passing it on to that function (which sets many
     more):

     - `module`, `instance`: the properties from the
       instantiate[Streaming]() result.

     - If `instance.exports.memory` is _not_ set then it requires that
       `config.imports.env.memory` be set (else it throws), and
       assigns that to `target.memory`.

     - If `wasmUtilTarget.alloc` is not set and
       `instance.exports.malloc` is, it installs
       `wasmUtilTarget.alloc()` and `wasmUtilTarget.dealloc()`
       wrappers for the exports `malloc` and `free` functions.

   It returns a function which, when called, initiates loading of the
   module and returns a Promise. When that Promise resolves, it calls
   the `config.onload` callback (if set) and passes it
   `(loadResult,config)`, where `loadResult` is the result of
   WebAssembly.instantiate[Streaming](): an object in the form:

   ```
   {
     module: a WebAssembly.Module,
     instance: a WebAssembly.Instance
   }
   ```

   (Note that the initial `then()` attached to the promise gets only
   that object, and not the `config` one.)

   Error handling is up to the caller, who may attach a `catch()` call
   to the promise.
*/
globalThis.WhWasmUtilInstaller.yawl = function(config){
  const wfetch = ()=>fetch(config.uri, {credentials: 'same-origin'});
  const wui = this;
  const finalThen = function(arg){
    //log("finalThen()",arg);
    if(config.wasmUtilTarget){
      const toss = (...args)=>{throw new Error(args.join(' '))};
      const tgt = config.wasmUtilTarget;
      tgt.module = arg.module;
      tgt.instance = arg.instance;
      //tgt.exports = tgt.instance.exports;
      if(!tgt.instance.exports.memory){
        /**
           WhWasmUtilInstaller requires either tgt.exports.memory
           (exported from WASM) or tgt.memory (JS-provided memory
           imported into WASM).
        */
        tgt.memory = (config.imports && config.imports.env
                      && config.imports.env.memory)
          || toss("Missing 'memory' object!");
      }
      if(!tgt.alloc && arg.instance.exports.malloc){
        const exports = arg.instance.exports;
        tgt.alloc = function(n){
          return exports.malloc(n) || toss("Allocation of",n,"bytes failed.");
        };
        tgt.dealloc = function(m){exports.free(m)};
      }
      wui(tgt);
    }
    if(config.onload) config.onload(arg,config);
    return arg /* for any then() handler attached to
                  yetAnotherWasmLoader()'s return value */;
  };
  const loadWasm = WebAssembly.instantiateStreaming
        ? function loadWasmStreaming(){
          return WebAssembly.instantiateStreaming(wfetch(), config.imports||{})
            .then(finalThen);
        }
        : function loadWasmOldSchool(){ // Safari < v15
          return wfetch()
            .then(response => response.arrayBuffer())
            .then(bytes => WebAssembly.instantiate(bytes, config.imports||{}))
            .then(finalThen);
        };
  return loadWasm;
}.bind(globalThis.WhWasmUtilInstaller)/*yawl()*/;
/* END FILE: common/whwasmutil.js */
/* BEGIN FILE: jaccwabyt/jaccwabyt.js */
/**
  2022-06-30

  The author disclaims copyright to this source code.  In place of a
  legal notice, here is a blessing:

  *   May you do good and not evil.
  *   May you find forgiveness for yourself and forgive others.
  *   May you share freely, never taking more than you give.

  ***********************************************************************

  The Jaccwabyt API is documented in detail in an external file,
  _possibly_ called jaccwabyt.md in the same directory as this file.

  Project homes:
  - https://fossil.wanderinghorse.net/r/jaccwabyt
  - https://sqlite.org/src/dir/ext/wasm/jaccwabyt

*/
'use strict';
globalThis.Jaccwabyt = function StructBinderFactory(config){
/* ^^^^ it is recommended that clients move that object into wherever
   they'd like to have it and delete the self-held copy ("self" being
   the global window or worker object).  This API does not require the
   global reference - it is simply installed as a convenience for
   connecting these bits to other co-developed code before it gets
   removed from the global namespace.
*/

  /** Throws a new Error, the message of which is the concatenation
      all args with a space between each. */
  const toss = (...args)=>{throw new Error(args.join(' '))};

  /**
     Implementing function bindings revealed significant
     shortcomings in Emscripten's addFunction()/removeFunction()
     interfaces:

     https://github.com/emscripten-core/emscripten/issues/17323

     Until those are resolved, or a suitable replacement can be
     implemented, our function-binding API will be more limited
     and/or clumsier to use than initially hoped.
  */
  if(!(config.heap instanceof WebAssembly.Memory)
     && !(config.heap instanceof Function)){
    toss("config.heap must be WebAssembly.Memory instance or a function.");
  }
  ['alloc','dealloc'].forEach(function(k){
    (config[k] instanceof Function) ||
      toss("Config option '"+k+"' must be a function.");
  });
  const SBF = StructBinderFactory;
  const heap = (config.heap instanceof Function)
        ? config.heap : (()=>new Uint8Array(config.heap.buffer)),
        alloc = config.alloc,
        dealloc = config.dealloc,
        log = config.log || console.log.bind(console),
        memberPrefix = (config.memberPrefix || ""),
        memberSuffix = (config.memberSuffix || ""),
        bigIntEnabled = (undefined===config.bigIntEnabled
                         ? !!globalThis['BigInt64Array'] : !!config.bigIntEnabled),
        BigInt = globalThis['BigInt'],
        BigInt64Array = globalThis['BigInt64Array'],
        /* Undocumented (on purpose) config options: */
        ptrSizeof = config.ptrSizeof || 4,
        ptrIR = config.ptrIR || 'i32'
  ;

  if(!SBF.debugFlags){
    SBF.__makeDebugFlags = function(deriveFrom=null){
      /* This is disgustingly overengineered. :/ */
      if(deriveFrom && deriveFrom.__flags) deriveFrom = deriveFrom.__flags;
      const f = function f(flags){
        if(0===arguments.length){
          return f.__flags;
        }
        if(flags<0){
          delete f.__flags.getter; delete f.__flags.setter;
          delete f.__flags.alloc; delete f.__flags.dealloc;
        }else{
          f.__flags.getter  = 0!==(0x01 & flags);
          f.__flags.setter  = 0!==(0x02 & flags);
          f.__flags.alloc   = 0!==(0x04 & flags);
          f.__flags.dealloc = 0!==(0x08 & flags);
        }
        return f._flags;
      };
      Object.defineProperty(f,'__flags', {
        iterable: false, writable: false,
        value: Object.create(deriveFrom)
      });
      if(!deriveFrom) f(0);
      return f;
    };
    SBF.debugFlags = SBF.__makeDebugFlags();
  }/*static init*/

  const isLittleEndian = (function() {
    const buffer = new ArrayBuffer(2);
    new DataView(buffer).setInt16(0, 256, true /* littleEndian */);
    // Int16Array uses the platform's endianness.
    return new Int16Array(buffer)[0] === 256;
  })();
  /**
     Some terms used in the internal docs:

     StructType: a struct-wrapping class generated by this
     framework.
     DEF: struct description object.
     SIG: struct member signature string.
  */

  /** True if SIG s looks like a function signature, else
      false. */
  const isFuncSig = (s)=>'('===s[1];
  /** True if SIG s is-a pointer signature. */
  const isPtrSig = (s)=>'p'===s || 'P'===s;
  const isAutoPtrSig = (s)=>'P'===s /*EXPERIMENTAL*/;
  const sigLetter = (s)=>isFuncSig(s) ? 'p' : s[0];
  /** Returns the WASM IR form of the Emscripten-conventional letter
      at SIG s[0]. Throws for an unknown SIG. */
  const sigIR = function(s){
    switch(sigLetter(s)){
        case 'c': case 'C': return 'i8';
        case 'i': return 'i32';
        case 'p': case 'P': case 's': return ptrIR;
        case 'j': return 'i64';
        case 'f': return 'float';
        case 'd': return 'double';
    }
    toss("Unhandled signature IR:",s);
  };

  const affirmBigIntArray = BigInt64Array
        ? ()=>true : ()=>toss('BigInt64Array is not available.');
  /** Returns the name of a DataView getter method corresponding
      to the given SIG. */
  const sigDVGetter = function(s){
    switch(sigLetter(s)) {
        case 'p': case 'P': case 's': {
          switch(ptrSizeof){
              case 4: return 'getInt32';
              case 8: return affirmBigIntArray() && 'getBigInt64';
          }
          break;
        }
        case 'i': return 'getInt32';
        case 'c': return 'getInt8';
        case 'C': return 'getUint8';
        case 'j': return affirmBigIntArray() && 'getBigInt64';
        case 'f': return 'getFloat32';
        case 'd': return 'getFloat64';
    }
    toss("Unhandled DataView getter for signature:",s);
  };
  /** Returns the name of a DataView setter method corresponding
      to the given SIG. */
  const sigDVSetter = function(s){
    switch(sigLetter(s)){
        case 'p': case 'P': case 's': {
          switch(ptrSizeof){
              case 4: return 'setInt32';
              case 8: return affirmBigIntArray() && 'setBigInt64';
          }
          break;
        }
        case 'i': return 'setInt32';
        case 'c': return 'setInt8';
        case 'C': return 'setUint8';
        case 'j': return affirmBigIntArray() && 'setBigInt64';
        case 'f': return 'setFloat32';
        case 'd': return 'setFloat64';
    }
    toss("Unhandled DataView setter for signature:",s);
  };
  /**
     Returns either Number of BigInt, depending on the given
     SIG. This constructor is used in property setters to coerce
     the being-set value to the correct size.
  */
  const sigDVSetWrapper = function(s){
    switch(sigLetter(s)) {
        case 'i': case 'f': case 'c': case 'C': case 'd': return Number;
        case 'j': return affirmBigIntArray() && BigInt;
        case 'p': case 'P': case 's':
          switch(ptrSizeof){
              case 4: return Number;
              case 8: return affirmBigIntArray() && BigInt;
          }
          break;
    }
    toss("Unhandled DataView set wrapper for signature:",s);
  };

  /** Returns the given struct and member name in a form suitable for
      debugging and error output. */
  const sPropName = (s,k)=>s+'::'+k;

  const __propThrowOnSet = function(structName,propName){
    return ()=>toss(sPropName(structName,propName),"is read-only.");
  };

  /**
     In order to completely hide StructBinder-bound struct
     pointers from JS code, we store them in a scope-local
     WeakMap which maps the struct-bound objects to their WASM
     pointers. The pointers are accessible via
     boundObject.pointer, which is gated behind an accessor
     function, but are not exposed anywhere else in the
     object. The main intention of that is to make it impossible
     for stale copies to be made.
  */
  const __instancePointerMap = new WeakMap();

  /** Property name for the pointer-is-external marker. */
  const xPtrPropName = '(pointer-is-external)';

  /** Frees the obj.pointer memory and clears the pointer
      property. */
  const __freeStruct = function(ctor, obj, m){
    if(!m) m = __instancePointerMap.get(obj);
    if(m) {
      __instancePointerMap.delete(obj);
      if(Array.isArray(obj.ondispose)){
        let x;
        while((x = obj.ondispose.shift())){
          try{
            if(x instanceof Function) x.call(obj);
            else if(x instanceof StructType) x.dispose();
            else if('number' === typeof x) dealloc(x);
            // else ignore. Strings are permitted to annotate entries
            // to assist in debugging.
          }catch(e){
            console.warn("ondispose() for",ctor.structName,'@',
                         m,'threw. NOT propagating it.',e);
          }
        }
      }else if(obj.ondispose instanceof Function){
        try{obj.ondispose()}
        catch(e){
          /*do not rethrow: destructors must not throw*/
          console.warn("ondispose() for",ctor.structName,'@',
                       m,'threw. NOT propagating it.',e);
        }
      }
      delete obj.ondispose;
      if(ctor.debugFlags.__flags.dealloc){
        log("debug.dealloc:",(obj[xPtrPropName]?"EXTERNAL":""),
            ctor.structName,"instance:",
            ctor.structInfo.sizeof,"bytes @"+m);
      }
      if(!obj[xPtrPropName]) dealloc(m);
    }
  };

  /** Returns a skeleton for a read-only property accessor wrapping
      value v. */
  const rop = (v)=>{return {configurable: false, writable: false,
                            iterable: false, value: v}};

  /** Allocates obj's memory buffer based on the size defined in
      ctor.structInfo.sizeof. */
  const __allocStruct = function(ctor, obj, m){
    let fill = !m;
    if(m) Object.defineProperty(obj, xPtrPropName, rop(m));
    else{
      m = alloc(ctor.structInfo.sizeof);
      if(!m) toss("Allocation of",ctor.structName,"structure failed.");
    }
    try {
      if(ctor.debugFlags.__flags.alloc){
        log("debug.alloc:",(fill?"":"EXTERNAL"),
            ctor.structName,"instance:",
            ctor.structInfo.sizeof,"bytes @"+m);
      }
      if(fill) heap().fill(0, m, m + ctor.structInfo.sizeof);
      __instancePointerMap.set(obj, m);
    }catch(e){
      __freeStruct(ctor, obj, m);
      throw e;
    }
  };
  /** Gets installed as the memoryDump() method of all structs. */
  const __memoryDump = function(){
    const p = this.pointer;
    return p
      ? new Uint8Array(heap().slice(p, p+this.structInfo.sizeof))
      : null;
  };

  const __memberKey = (k)=>memberPrefix + k + memberSuffix;
  const __memberKeyProp = rop(__memberKey);

  /**
     Looks up a struct member in structInfo.members. Throws if found
     if tossIfNotFound is true, else returns undefined if not
     found. The given name may be either the name of the
     structInfo.members key (faster) or the key as modified by the
     memberPrefix and memberSuffix settings.
  */
  const __lookupMember = function(structInfo, memberName, tossIfNotFound=true){
    let m = structInfo.members[memberName];
    if(!m && (memberPrefix || memberSuffix)){
      // Check for a match on members[X].key
      for(const v of Object.values(structInfo.members)){
        if(v.key===memberName){ m = v; break; }
      }
      if(!m && tossIfNotFound){
        toss(sPropName(structInfo.name,memberName),'is not a mapped struct member.');
      }
    }
    return m;
  };

  /**
     Uses __lookupMember(obj.structInfo,memberName) to find a member,
     throwing if not found. Returns its signature, either in this
     framework's native format or in Emscripten format.
  */
  const __memberSignature = function f(obj,memberName,emscriptenFormat=false){
    if(!f._) f._ = (x)=>x.replace(/[^vipPsjrdcC]/g,"").replace(/[pPscC]/g,'i');
    const m = __lookupMember(obj.structInfo, memberName, true);
    return emscriptenFormat ? f._(m.signature) : m.signature;
  };

  const __ptrPropDescriptor = {
    configurable: false, enumerable: false,
    get: function(){return __instancePointerMap.get(this)},
    set: ()=>toss("Cannot assign the 'pointer' property of a struct.")
    // Reminder: leaving `set` undefined makes assignments
    // to the property _silently_ do nothing. Current unit tests
    // rely on it throwing, though.
  };

  /** Impl of X.memberKeys() for StructType and struct ctors. */
  const __structMemberKeys = rop(function(){
    const a = [];
    for(const k of Object.keys(this.structInfo.members)){
      a.push(this.memberKey(k));
    }
    return a;
  });

  const __utf8Decoder = new TextDecoder('utf-8');
  const __utf8Encoder = new TextEncoder();
  /** Internal helper to use in operations which need to distinguish
      between SharedArrayBuffer heap memory and non-shared heap. */
  const __SAB = ('undefined'===typeof SharedArrayBuffer)
        ? function(){} : SharedArrayBuffer;
  const __utf8Decode = function(arrayBuffer, begin, end){
    return __utf8Decoder.decode(
      (arrayBuffer.buffer instanceof __SAB)
        ? arrayBuffer.slice(begin, end)
        : arrayBuffer.subarray(begin, end)
    );
  };
  /**
     Uses __lookupMember() to find the given obj.structInfo key.
     Returns that member if it is a string, else returns false. If the
     member is not found, throws if tossIfNotFound is true, else
     returns false.
   */
  const __memberIsString = function(obj,memberName, tossIfNotFound=false){
    const m = __lookupMember(obj.structInfo, memberName, tossIfNotFound);
    return (m && 1===m.signature.length && 's'===m.signature[0]) ? m : false;
  };

  /**
     Given a member description object, throws if member.signature is
     not valid for assigning to or interpretation as a C-style string.
     It optimistically assumes that any signature of (i,p,s) is
     C-string compatible.
  */
  const __affirmCStringSignature = function(member){
    if('s'===member.signature) return;
    toss("Invalid member type signature for C-string value:",
         JSON.stringify(member));
  };

  /**
     Looks up the given member in obj.structInfo. If it has a
     signature of 's' then it is assumed to be a C-style UTF-8 string
     and a decoded copy of the string at its address is returned. If
     the signature is of any other type, it throws. If an s-type
     member's address is 0, `null` is returned.
  */
  const __memberToJsString = function f(obj,memberName){
    const m = __lookupMember(obj.structInfo, memberName, true);
    __affirmCStringSignature(m);
    const addr = obj[m.key];
    //log("addr =",addr,memberName,"m =",m);
    if(!addr) return null;
    let pos = addr;
    const mem = heap();
    for( ; mem[pos]!==0; ++pos ) {
      //log("mem[",pos,"]",mem[pos]);
    };
    //log("addr =",addr,"pos =",pos);
    return (addr===pos) ? "" : __utf8Decode(mem, addr, pos);
  };

  /**
     Adds value v to obj.ondispose, creating ondispose,
     or converting it to an array, if needed.
  */
  const __addOnDispose = function(obj, ...v){
    if(obj.ondispose){
      if(!Array.isArray(obj.ondispose)){
        obj.ondispose = [obj.ondispose];
      }
    }else{
      obj.ondispose = [];
    }
    obj.ondispose.push(...v);
  };

  /**
     Allocates a new UTF-8-encoded, NUL-terminated copy of the given
     JS string and returns its address relative to heap(). If
     allocation returns 0 this function throws. Ownership of the
     memory is transfered to the caller, who must eventually pass it
     to the configured dealloc() function.
  */
  const __allocCString = function(str){
    const u = __utf8Encoder.encode(str);
    const mem = alloc(u.length+1);
    if(!mem) toss("Allocation error while duplicating string:",str);
    const h = heap();
    //let i = 0;
    //for( ; i < u.length; ++i ) h[mem + i] = u[i];
    h.set(u, mem);
    h[mem + u.length] = 0;
    //log("allocCString @",mem," =",u);
    return mem;
  };

  /**
     Sets the given struct member of obj to a dynamically-allocated,
     UTF-8-encoded, NUL-terminated copy of str. It is up to the caller
     to free any prior memory, if appropriate. The newly-allocated
     string is added to obj.ondispose so will be freed when the object
     is disposed.

     The given name may be either the name of the structInfo.members
     key (faster) or the key as modified by the memberPrefix and
     memberSuffix settings.
  */
  const __setMemberCString = function(obj, memberName, str){
    const m = __lookupMember(obj.structInfo, memberName, true);
    __affirmCStringSignature(m);
    /* Potential TODO: if obj.ondispose contains obj[m.key] then
       dealloc that value and clear that ondispose entry */
    const mem = __allocCString(str);
    obj[m.key] = mem;
    __addOnDispose(obj, mem);
    return obj;
  };

  /**
     Prototype for all StructFactory instances (the constructors
     returned from StructBinder).
  */
  const StructType = function ctor(structName, structInfo){
    if(arguments[2]!==rop){
      toss("Do not call the StructType constructor",
           "from client-level code.");
    }
    Object.defineProperties(this,{
      //isA: rop((v)=>v instanceof ctor),
      structName: rop(structName),
      structInfo: rop(structInfo)
    });
  };

  /**
     Properties inherited by struct-type-specific StructType instances
     and (indirectly) concrete struct-type instances.
  */
  StructType.prototype = Object.create(null, {
    dispose: rop(function(){__freeStruct(this.constructor, this)}),
    lookupMember: rop(function(memberName, tossIfNotFound=true){
      return __lookupMember(this.structInfo, memberName, tossIfNotFound);
    }),
    memberToJsString: rop(function(memberName){
      return __memberToJsString(this, memberName);
    }),
    memberIsString: rop(function(memberName, tossIfNotFound=true){
      return __memberIsString(this, memberName, tossIfNotFound);
    }),
    memberKey: __memberKeyProp,
    memberKeys: __structMemberKeys,
    memberSignature: rop(function(memberName, emscriptenFormat=false){
      return __memberSignature(this, memberName, emscriptenFormat);
    }),
    memoryDump: rop(__memoryDump),
    pointer: __ptrPropDescriptor,
    setMemberCString: rop(function(memberName, str){
      return __setMemberCString(this, memberName, str);
    })
  });
  // Function-type non-Property inherited members 
  Object.assign(StructType.prototype,{
    addOnDispose: function(...v){
      __addOnDispose(this,...v);
      return this;
    }
  });

  /**
     "Static" properties for StructType.
  */
  Object.defineProperties(StructType, {
    allocCString: rop(__allocCString),
    isA: rop((v)=>v instanceof StructType),
    hasExternalPointer: rop((v)=>(v instanceof StructType) && !!v[xPtrPropName]),
    memberKey: __memberKeyProp
  });

  const isNumericValue = (v)=>Number.isFinite(v) || (v instanceof (BigInt || Number));

  /**
     Pass this a StructBinder-generated prototype, and the struct
     member description object. It will define property accessors for
     proto[memberKey] which read from/write to memory in
     this.pointer. It modifies descr to make certain downstream
     operations much simpler.
  */
  const makeMemberWrapper = function f(ctor,name, descr){
    if(!f._){
      /*cache all available getters/setters/set-wrappers for
        direct reuse in each accessor function. */
      f._ = {getters: {}, setters: {}, sw:{}};
      const a = ['i','c','C','p','P','s','f','d','v()'];
      if(bigIntEnabled) a.push('j');
      a.forEach(function(v){
        //const ir = sigIR(v);
        f._.getters[v] = sigDVGetter(v) /* DataView[MethodName] values for GETTERS */;
        f._.setters[v] = sigDVSetter(v) /* DataView[MethodName] values for SETTERS */;
        f._.sw[v] = sigDVSetWrapper(v)  /* BigInt or Number ctor to wrap around values
                                           for conversion */;
      });
      const rxSig1 = /^[ipPsjfdcC]$/,
            rxSig2 = /^[vipPsjfdcC]\([ipPsjfdcC]*\)$/;
      f.sigCheck = function(obj, name, key,sig){
        if(Object.prototype.hasOwnProperty.call(obj, key)){
          toss(obj.structName,'already has a property named',key+'.');
        }
        rxSig1.test(sig) || rxSig2.test(sig)
          || toss("Malformed signature for",
                  sPropName(obj.structName,name)+":",sig);
      };
    }
    const key = ctor.memberKey(name);
    f.sigCheck(ctor.prototype, name, key, descr.signature);
    descr.key = key;
    descr.name = name;
    const sigGlyph = sigLetter(descr.signature);
    const xPropName = sPropName(ctor.prototype.structName,key);
    const dbg = ctor.prototype.debugFlags.__flags;
    /*
      TODO?: set prototype of descr to an object which can set/fetch
      its prefered representation, e.g. conversion to string or mapped
      function. Advantage: we can avoid doing that via if/else if/else
      in the get/set methods.
    */
    const prop = Object.create(null);
    prop.configurable = false;
    prop.enumerable = false;
    prop.get = function(){
      if(dbg.getter){
        log("debug.getter:",f._.getters[sigGlyph],"for", sigIR(sigGlyph),
            xPropName,'@', this.pointer,'+',descr.offset,'sz',descr.sizeof);
      }
      let rc = (
        new DataView(heap().buffer, this.pointer + descr.offset, descr.sizeof)
      )[f._.getters[sigGlyph]](0, isLittleEndian);
      if(dbg.getter) log("debug.getter:",xPropName,"result =",rc);
      return rc;
    };
    if(descr.readOnly){
      prop.set = __propThrowOnSet(ctor.prototype.structName,key);
    }else{
      prop.set = function(v){
        if(dbg.setter){
          log("debug.setter:",f._.setters[sigGlyph],"for", sigIR(sigGlyph),
              xPropName,'@', this.pointer,'+',descr.offset,'sz',descr.sizeof, v);
        }
        if(!this.pointer){
          toss("Cannot set struct property on disposed instance.");
        }
        if(null===v) v = 0;
        else while(!isNumericValue(v)){
          if(isAutoPtrSig(descr.signature) && (v instanceof StructType)){
            // It's a struct instance: let's store its pointer value!
            v = v.pointer || 0;
            if(dbg.setter) log("debug.setter:",xPropName,"resolved to",v);
            break;
          }
          toss("Invalid value for pointer-type",xPropName+'.');
        }
        (
          new DataView(heap().buffer, this.pointer + descr.offset, descr.sizeof)
        )[f._.setters[sigGlyph]](0, f._.sw[sigGlyph](v), isLittleEndian);
      };
    }
    Object.defineProperty(ctor.prototype, key, prop);
  }/*makeMemberWrapper*/;
  
  /**
     The main factory function which will be returned to the
     caller.
  */
  const StructBinder = function StructBinder(structName, structInfo){
    if(1===arguments.length){
      structInfo = structName;
      structName = structInfo.name;
    }else if(!structInfo.name){
      structInfo.name = structName;
    }
    if(!structName) toss("Struct name is required.");
    let lastMember = false;
    Object.keys(structInfo.members).forEach((k)=>{
      // Sanity checks of sizeof/offset info...
      const m = structInfo.members[k];
      if(!m.sizeof) toss(structName,"member",k,"is missing sizeof.");
      else if(m.sizeof===1){
        (m.signature === 'c' || m.signature === 'C') ||
          toss("Unexpected sizeof==1 member",
               sPropName(structInfo.name,k),
               "with signature",m.signature);
      }else{
        // sizes and offsets of size-1 members may be odd values, but
        // others may not.
        if(0!==(m.sizeof%4)){
          console.warn("Invalid struct member description =",m,"from",structInfo);
          toss(structName,"member",k,"sizeof is not aligned. sizeof="+m.sizeof);
        }
        if(0!==(m.offset%4)){
          console.warn("Invalid struct member description =",m,"from",structInfo);
          toss(structName,"member",k,"offset is not aligned. offset="+m.offset);
        }
      }
      if(!lastMember || lastMember.offset < m.offset) lastMember = m;
    });
    if(!lastMember) toss("No member property descriptions found.");
    else if(structInfo.sizeof < lastMember.offset+lastMember.sizeof){
      toss("Invalid struct config:",structName,
           "max member offset ("+lastMember.offset+") ",
           "extends past end of struct (sizeof="+structInfo.sizeof+").");
    }
    const debugFlags = rop(SBF.__makeDebugFlags(StructBinder.debugFlags));
    /** Constructor for the StructCtor. */
    const StructCtor = function StructCtor(externalMemory){
      if(!(this instanceof StructCtor)){
        toss("The",structName,"constructor may only be called via 'new'.");
      }else if(arguments.length){
        if(externalMemory!==(externalMemory|0) || externalMemory<=0){
          toss("Invalid pointer value for",structName,"constructor.");
        }
        __allocStruct(StructCtor, this, externalMemory);
      }else{
        __allocStruct(StructCtor, this);
      }
    };
    Object.defineProperties(StructCtor,{
      debugFlags: debugFlags,
      isA: rop((v)=>v instanceof StructCtor),
      memberKey: __memberKeyProp,
      memberKeys: __structMemberKeys,
      methodInfoForKey: rop(function(mKey){
      }),
      structInfo: rop(structInfo),
      structName: rop(structName)
    });
    StructCtor.prototype = new StructType(structName, structInfo, rop);
    Object.defineProperties(StructCtor.prototype,{
      debugFlags: debugFlags,
      constructor: rop(StructCtor)
      /*if we assign StructCtor.prototype and don't do
        this then StructCtor!==instance.constructor!*/
    });
    Object.keys(structInfo.members).forEach(
      (name)=>makeMemberWrapper(StructCtor, name, structInfo.members[name])
    );
    return StructCtor;
  };
  StructBinder.StructType = StructType;
  StructBinder.config = config;
  StructBinder.allocCString = __allocCString;
  if(!StructBinder.debugFlags){
    StructBinder.debugFlags = SBF.__makeDebugFlags(SBF.debugFlags);
  }
  return StructBinder;
}/*StructBinderFactory*/;
/* END FILE: jaccwabyt/jaccwabyt.js */
/* BEGIN FILE: api/sqlite3-api-glue.js */
/*
  2022-07-22

  The author disclaims copyright to this source code.  In place of a
  legal notice, here is a blessing:

  *   May you do good and not evil.
  *   May you find forgiveness for yourself and forgive others.
  *   May you share freely, never taking more than you give.

  ***********************************************************************

  This file glues together disparate pieces of JS which are loaded in
  previous steps of the sqlite3-api.js bootstrapping process:
  sqlite3-api-prologue.js, whwasmutil.js, and jaccwabyt.js. It
  initializes the main API pieces so that the downstream components
  (e.g. sqlite3-api-oo1.js) have all that they need.
*/
globalThis.sqlite3ApiBootstrap.initializers.push(function(sqlite3){
  'use strict';
  const toss = (...args)=>{throw new Error(args.join(' '))};
  const toss3 = sqlite3.SQLite3Error.toss;
  const capi = sqlite3.capi, wasm = sqlite3.wasm, util = sqlite3.util;
  globalThis.WhWasmUtilInstaller(wasm);
  delete globalThis.WhWasmUtilInstaller;

  if(0){
    /**
       Please keep this block around as a maintenance reminder
       that we cannot rely on this type of check.

       This block fails on Safari, per a report at
       https://sqlite.org/forum/forumpost/e5b20e1feb.

       It turns out that what Safari serves from the indirect function
       table (e.g. wasm.functionEntry(X)) is anonymous functions which
       wrap the WASM functions, rather than returning the WASM
       functions themselves. That means comparison of such functions
       is useless for determining whether or not we have a specific
       function from wasm.exports. i.e. if function X is indirection
       function table entry N then wasm.exports.X is not equal to
       wasm.functionEntry(N) in Safari, despite being so in the other
       browsers.
    */
    /**
       Find a mapping for SQLITE_WASM_DEALLOC, which the API
       guarantees is a WASM pointer to the same underlying function as
       wasm.dealloc() (noting that wasm.dealloc() is permitted to be a
       JS wrapper around the WASM function). There is unfortunately no
       O(1) algorithm for finding this pointer: we have to walk the
       WASM indirect function table to find it. However, experience
       indicates that that particular function is always very close to
       the front of the table (it's been entry #3 in all relevant
       tests).
    */
    const dealloc = wasm.exports[sqlite3.config.deallocExportName];
    const nFunc = wasm.functionTable().length;
    let i;
    for(i = 0; i < nFunc; ++i){
      const e = wasm.functionEntry(i);
      if(dealloc === e){
        capi.SQLITE_WASM_DEALLOC = i;
        break;
      }
    }
    if(dealloc !== wasm.functionEntry(capi.SQLITE_WASM_DEALLOC)){
      toss("Internal error: cannot find function pointer for SQLITE_WASM_DEALLOC.");
    }
  }

  /**
     Signatures for the WASM-exported C-side functions. Each entry
     is an array with 2+ elements:

     [ "c-side name",
       "result type" (wasm.xWrap() syntax),
       [arg types in xWrap() syntax]
       // ^^^ this needn't strictly be an array: it can be subsequent
       // elements instead: [x,y,z] is equivalent to x,y,z
     ]

     Note that support for the API-specific data types in the
     result/argument type strings gets plugged in at a later phase in
     the API initialization process.
  */
  wasm.bindingSignatures = [
    // Please keep these sorted by function name!
    ["sqlite3_aggregate_context","void*", "sqlite3_context*", "int"],
    /* sqlite3_auto_extension() has a hand-written binding. */
    /* sqlite3_bind_blob() and sqlite3_bind_text() have hand-written
       bindings to permit more flexible inputs. */
    ["sqlite3_bind_double","int", "sqlite3_stmt*", "int", "f64"],
    ["sqlite3_bind_int","int", "sqlite3_stmt*", "int", "int"],
    ["sqlite3_bind_null",undefined, "sqlite3_stmt*", "int"],
    ["sqlite3_bind_parameter_count", "int", "sqlite3_stmt*"],
    ["sqlite3_bind_parameter_index","int", "sqlite3_stmt*", "string"],
    ["sqlite3_bind_pointer", "int",
     "sqlite3_stmt*", "int", "*", "string:static", "*"],
    ["sqlite3_busy_handler","int", [
      "sqlite3*",
      new wasm.xWrap.FuncPtrAdapter({
        signature: 'i(pi)',
        contextKey: (argv,argIndex)=>argv[0/* sqlite3* */]
      }),
      "*"
    ]],
    ["sqlite3_busy_timeout","int", "sqlite3*", "int"],
    /* sqlite3_cancel_auto_extension() has a hand-written binding. */
    /* sqlite3_close_v2() is implemented by hand to perform some
       extra work. */
    ["sqlite3_changes", "int", "sqlite3*"],
    ["sqlite3_clear_bindings","int", "sqlite3_stmt*"],
    ["sqlite3_collation_needed", "int", "sqlite3*", "*", "*"/*=>v(ppis)*/],
    ["sqlite3_column_blob","*", "sqlite3_stmt*", "int"],
    ["sqlite3_column_bytes","int", "sqlite3_stmt*", "int"],
    ["sqlite3_column_count", "int", "sqlite3_stmt*"],
    ["sqlite3_column_double","f64", "sqlite3_stmt*", "int"],
    ["sqlite3_column_int","int", "sqlite3_stmt*", "int"],
    ["sqlite3_column_name","string", "sqlite3_stmt*", "int"],
    ["sqlite3_column_text","string", "sqlite3_stmt*", "int"],
    ["sqlite3_column_type","int", "sqlite3_stmt*", "int"],
    ["sqlite3_column_value","sqlite3_value*", "sqlite3_stmt*", "int"],
    ["sqlite3_commit_hook", "void*", [
      "sqlite3*",
      new wasm.xWrap.FuncPtrAdapter({
        name: 'sqlite3_commit_hook',
        signature: 'i(p)',
        contextKey: (argv)=>argv[0/* sqlite3* */]
      }),
      '*'
    ]],
    ["sqlite3_compileoption_get", "string", "int"],
    ["sqlite3_compileoption_used", "int", "string"],
    ["sqlite3_complete", "int", "string:flexible"],
    ["sqlite3_context_db_handle", "sqlite3*", "sqlite3_context*"],

    /* sqlite3_create_function(), sqlite3_create_function_v2(), and
       sqlite3_create_window_function() use hand-written bindings to
       simplify handling of their function-type arguments. */
    /* sqlite3_create_collation() and sqlite3_create_collation_v2()
       use hand-written bindings to simplify passing of the callback
       function.
      ["sqlite3_create_collation", "int",
     "sqlite3*", "string", "int",//SQLITE_UTF8 is the only legal value
     "*", "*"],
    ["sqlite3_create_collation_v2", "int",
     "sqlite3*", "string", "int",//SQLITE_UTF8 is the only legal value
     "*", "*", "*"],
    */
    ["sqlite3_data_count", "int", "sqlite3_stmt*"],
    ["sqlite3_db_filename", "string", "sqlite3*", "string"],
    ["sqlite3_db_handle", "sqlite3*", "sqlite3_stmt*"],
    ["sqlite3_db_name", "string", "sqlite3*", "int"],
    ["sqlite3_db_status", "int", "sqlite3*", "int", "*", "*", "int"],
    ["sqlite3_errcode", "int", "sqlite3*"],
    ["sqlite3_errmsg", "string", "sqlite3*"],
    ["sqlite3_error_offset", "int", "sqlite3*"],
    ["sqlite3_errstr", "string", "int"],
    ["sqlite3_exec", "int", [
      "sqlite3*", "string:flexible",
      new wasm.xWrap.FuncPtrAdapter({
        signature: 'i(pipp)',
        bindScope: 'transient',
        callProxy: (callback)=>{
          let aNames;
          return (pVoid, nCols, pColVals, pColNames)=>{
            try {
              const aVals = wasm.cArgvToJs(nCols, pColVals);
              if(!aNames) aNames = wasm.cArgvToJs(nCols, pColNames);
              return callback(aVals, aNames) | 0;
            }catch(e){
              /* If we set the db error state here, the higher-level
                 exec() call replaces it with its own, so we have no way
                 of reporting the exception message except the console. We
                 must not propagate exceptions through the C API. Though
                 we make an effort to report OOM here, sqlite3_exec()
                 translates that into SQLITE_ABORT as well. */
              return e.resultCode || capi.SQLITE_ERROR;
            }
          }
        }
      }),
      "*", "**"
    ]],
    ["sqlite3_expanded_sql", "string", "sqlite3_stmt*"],
    ["sqlite3_extended_errcode", "int", "sqlite3*"],
    ["sqlite3_extended_result_codes", "int", "sqlite3*", "int"],
    ["sqlite3_file_control", "int", "sqlite3*", "string", "int", "*"],
    ["sqlite3_finalize", "int", "sqlite3_stmt*"],
    ["sqlite3_free", undefined,"*"],
    ["sqlite3_get_auxdata", "*", "sqlite3_context*", "int"],
    ["sqlite3_initialize", undefined],
    /*["sqlite3_interrupt", undefined, "sqlite3*"
       ^^^ we cannot actually currently support this because JS is
        single-threaded and we don't have a portable way to access a DB
        from 2 SharedWorkers concurrently. ],*/
    ["sqlite3_keyword_count", "int"],
    ["sqlite3_keyword_name", "int", ["int", "**", "*"]],
    ["sqlite3_keyword_check", "int", ["string", "int"]],
    ["sqlite3_libversion", "string"],
    ["sqlite3_libversion_number", "int"],
    ["sqlite3_limit", "int", ["sqlite3*", "int", "int"]],
    ["sqlite3_malloc", "*","int"],
    ["sqlite3_open", "int", "string", "*"],
    ["sqlite3_open_v2", "int", "string", "*", "int", "string"],
    /* sqlite3_prepare_v2() and sqlite3_prepare_v3() are handled
       separately due to us requiring two different sets of semantics
       for those, depending on how their SQL argument is provided. */
    /* sqlite3_randomness() uses a hand-written wrapper to extend
       the range of supported argument types. */
    ["sqlite3_progress_handler", undefined, [
      "sqlite3*", "int", new wasm.xWrap.FuncPtrAdapter({
        name: 'xProgressHandler',
        signature: 'i(p)',
        bindScope: 'context',
        contextKey: (argv,argIndex)=>argv[0/* sqlite3* */]
      }), "*"
    ]],
    ["sqlite3_realloc", "*","*","int"],
    ["sqlite3_reset", "int", "sqlite3_stmt*"],
    /* sqlite3_reset_auto_extension() has a hand-written binding. */
    ["sqlite3_result_blob", undefined, "sqlite3_context*", "*", "int", "*"],
    ["sqlite3_result_double", undefined, "sqlite3_context*", "f64"],
    ["sqlite3_result_error", undefined, "sqlite3_context*", "string", "int"],
    ["sqlite3_result_error_code", undefined, "sqlite3_context*", "int"],
    ["sqlite3_result_error_nomem", undefined, "sqlite3_context*"],
    ["sqlite3_result_error_toobig", undefined, "sqlite3_context*"],
    ["sqlite3_result_int", undefined, "sqlite3_context*", "int"],
    ["sqlite3_result_null", undefined, "sqlite3_context*"],
    ["sqlite3_result_pointer", undefined,
     "sqlite3_context*", "*", "string:static", "*"],
    ["sqlite3_result_subtype", undefined, "sqlite3_value*", "int"],
    ["sqlite3_result_text", undefined, "sqlite3_context*", "string", "int", "*"],
    ["sqlite3_result_zeroblob", undefined, "sqlite3_context*", "int"],
    ["sqlite3_rollback_hook", "void*", [
      "sqlite3*",
      new wasm.xWrap.FuncPtrAdapter({
        name: 'sqlite3_rollback_hook',
        signature: 'v(p)',
        contextKey: (argv)=>argv[0/* sqlite3* */]
      }),
      '*'
    ]],
    ["sqlite3_set_authorizer", "int", [
      "sqlite3*",
      new wasm.xWrap.FuncPtrAdapter({
        name: "sqlite3_set_authorizer::xAuth",
        signature: "i(pi"+"ssss)",
        contextKey: (argv, argIndex)=>argv[0/*(sqlite3*)*/],
        callProxy: (callback)=>{
          return (pV, iCode, s0, s1, s2, s3)=>{
            try{
              s0 = s0 && wasm.cstrToJs(s0); s1 = s1 && wasm.cstrToJs(s1);
              s2 = s2 && wasm.cstrToJs(s2); s3 = s3 && wasm.cstrToJs(s3);
              return callback(pV, iCode, s0, s1, s2, s3) || 0;
            }catch(e){
              return e.resultCode || capi.SQLITE_ERROR;
            }
          }
        }
      }),
      "*"/*pUserData*/
    ]],
    ["sqlite3_set_auxdata", undefined, [
      "sqlite3_context*", "int", "*",
      new wasm.xWrap.FuncPtrAdapter({
        name: 'xDestroyAuxData',
        signature: 'v(*)',
        contextKey: (argv, argIndex)=>argv[0/* sqlite3_context* */]
      })
    ]],
    ["sqlite3_shutdown", undefined],
    ["sqlite3_sourceid", "string"],
    ["sqlite3_sql", "string", "sqlite3_stmt*"],
    ["sqlite3_status", "int", "int", "*", "*", "int"],
    ["sqlite3_step", "int", "sqlite3_stmt*"],
    ["sqlite3_stmt_isexplain", "int", ["sqlite3_stmt*"]],
    ["sqlite3_stmt_readonly", "int", ["sqlite3_stmt*"]],
    ["sqlite3_stmt_status", "int", "sqlite3_stmt*", "int", "int"],
    ["sqlite3_strglob", "int", "string","string"],
    ["sqlite3_stricmp", "int", "string", "string"],
    ["sqlite3_strlike", "int", "string", "string","int"],
    ["sqlite3_strnicmp", "int", "string", "string", "int"],
    ["sqlite3_table_column_metadata", "int",
     "sqlite3*", "string", "string", "string",
     "**", "**", "*", "*", "*"],
    ["sqlite3_total_changes", "int", "sqlite3*"],
    ["sqlite3_trace_v2", "int", [
      "sqlite3*", "int",
      new wasm.xWrap.FuncPtrAdapter({
        name: 'sqlite3_trace_v2::callback',
        signature: 'i(ippp)',
        contextKey: (argv,argIndex)=>argv[0/* sqlite3* */]
      }),
      "*"
    ]],
    ["sqlite3_txn_state", "int", ["sqlite3*","string"]],
    /* Note that sqlite3_uri_...() have very specific requirements for
       their first C-string arguments, so we cannot perform any value
       conversion on those. */
    ["sqlite3_uri_boolean", "int", "sqlite3_filename", "string", "int"],
    ["sqlite3_uri_key", "string", "sqlite3_filename", "int"],
    ["sqlite3_uri_parameter", "string", "sqlite3_filename", "string"],
    ["sqlite3_user_data","void*", "sqlite3_context*"],
    ["sqlite3_value_blob", "*", "sqlite3_value*"],
    ["sqlite3_value_bytes","int", "sqlite3_value*"],
    ["sqlite3_value_double","f64", "sqlite3_value*"],
    ["sqlite3_value_dup", "sqlite3_value*", "sqlite3_value*"],
    ["sqlite3_value_free", undefined, "sqlite3_value*"],
    ["sqlite3_value_frombind", "int", "sqlite3_value*"],
    ["sqlite3_value_int","int", "sqlite3_value*"],
    ["sqlite3_value_nochange", "int", "sqlite3_value*"],
    ["sqlite3_value_numeric_type", "int", "sqlite3_value*"],
    ["sqlite3_value_pointer", "*", "sqlite3_value*", "string:static"],
    ["sqlite3_value_subtype", "int", "sqlite3_value*"],
    ["sqlite3_value_text", "string", "sqlite3_value*"],
    ["sqlite3_value_type", "int", "sqlite3_value*"],
    ["sqlite3_vfs_find", "*", "string"],
    ["sqlite3_vfs_register", "int", "sqlite3_vfs*", "int"],
    ["sqlite3_vfs_unregister", "int", "sqlite3_vfs*"]
  ]/*wasm.bindingSignatures*/;

  if(false && wasm.compileOptionUsed('SQLITE_ENABLE_NORMALIZE')){
    /* ^^^ "the problem" is that this is an option feature and the
       build-time function-export list does not currently take
       optional features into account. */
    wasm.bindingSignatures.push(["sqlite3_normalized_sql", "string", "sqlite3_stmt*"]);
  }

  if(wasm.exports.sqlite3_activate_see instanceof Function){
    wasm.bindingSignatures.push(
      ["sqlite3_key", "int", "sqlite3*", "string", "int"],
      ["sqlite3_key_v2","int","sqlite3*","string","*","int"],
      ["sqlite3_rekey", "int", "sqlite3*", "string", "int"],
      ["sqlite3_rekey_v2", "int", "sqlite3*", "string", "*", "int"],
      ["sqlite3_activate_see", undefined, "string"]
    );
  }
  /**
     Functions which require BigInt (int64) support are separated from
     the others because we need to conditionally bind them or apply
     dummy impls, depending on the capabilities of the environment.

     Note that not all of these functions directly require int64
     but are only for use with APIs which require int64. For example,
     the vtab-related functions.
  */
  wasm.bindingSignatures.int64 = [
    ["sqlite3_bind_int64","int", ["sqlite3_stmt*", "int", "i64"]],
    ["sqlite3_changes64","i64", ["sqlite3*"]],
    ["sqlite3_column_int64","i64", ["sqlite3_stmt*", "int"]],
    ["sqlite3_create_module", "int",
     ["sqlite3*","string","sqlite3_module*","*"]],
    ["sqlite3_create_module_v2", "int",
     ["sqlite3*","string","sqlite3_module*","*","*"]],
    ["sqlite3_declare_vtab", "int", ["sqlite3*", "string:flexible"]],
    ["sqlite3_deserialize", "int", "sqlite3*", "string", "*", "i64", "i64", "int"]
    /* Careful! Short version: de/serialize() are problematic because they
       might use a different allocator than the user for managing the
       deserialized block. de/serialize() are ONLY safe to use with
       sqlite3_malloc(), sqlite3_free(), and its 64-bit variants. */,
    ["sqlite3_drop_modules", "int", ["sqlite3*", "**"]],
    ["sqlite3_last_insert_rowid", "i64", ["sqlite3*"]],
    ["sqlite3_malloc64", "*","i64"],
    ["sqlite3_msize", "i64", "*"],
    ["sqlite3_overload_function", "int", ["sqlite3*","string","int"]],
    ["sqlite3_preupdate_blobwrite", "int", "sqlite3*"],
    ["sqlite3_preupdate_count", "int", "sqlite3*"],
    ["sqlite3_preupdate_depth", "int", "sqlite3*"],
    ["sqlite3_preupdate_hook", "*", [
      "sqlite3*",
      new wasm.xWrap.FuncPtrAdapter({
        name: 'sqlite3_preupdate_hook',
        signature: "v(ppippjj)",
        contextKey: (argv)=>argv[0/* sqlite3* */],
        callProxy: (callback)=>{
          return (p,db,op,zDb,zTbl,iKey1,iKey2)=>{
            callback(p, db, op, wasm.cstrToJs(zDb), wasm.cstrToJs(zTbl),
                     iKey1, iKey2);
          };
        }
      }),
      "*"
    ]],
    ["sqlite3_preupdate_new", "int", ["sqlite3*", "int", "**"]],
    ["sqlite3_preupdate_old", "int", ["sqlite3*", "int", "**"]],
    ["sqlite3_realloc64", "*","*", "i64"],
    ["sqlite3_result_int64", undefined, "*", "i64"],
    ["sqlite3_result_zeroblob64", "int", "*", "i64"],
    ["sqlite3_serialize","*", "sqlite3*", "string", "*", "int"],
    ["sqlite3_set_last_insert_rowid", undefined, ["sqlite3*", "i64"]],
    ["sqlite3_status64", "int", "int", "*", "*", "int"],
    ["sqlite3_total_changes64", "i64", ["sqlite3*"]],
    ["sqlite3_update_hook", "*", [
      "sqlite3*",
      new wasm.xWrap.FuncPtrAdapter({
        name: 'sqlite3_update_hook',
        signature: "v(iippj)",
        contextKey: (argv)=>argv[0/* sqlite3* */],
        callProxy: (callback)=>{
          return (p,op,z0,z1,rowid)=>{
            callback(p, op, wasm.cstrToJs(z0), wasm.cstrToJs(z1), rowid);
          };
        }
      }),
      "*"
    ]],
    ["sqlite3_uri_int64", "i64", ["sqlite3_filename", "string", "i64"]],
    ["sqlite3_value_int64","i64", "sqlite3_value*"],
    ["sqlite3_vtab_collation","string","sqlite3_index_info*","int"],
    ["sqlite3_vtab_distinct","int", "sqlite3_index_info*"],
    ["sqlite3_vtab_in","int", "sqlite3_index_info*", "int", "int"],
    ["sqlite3_vtab_in_first", "int", "sqlite3_value*", "**"],
    ["sqlite3_vtab_in_next", "int", "sqlite3_value*", "**"],
    /*["sqlite3_vtab_config" is variadic and requires a hand-written
      proxy.] */
    ["sqlite3_vtab_nochange","int", "sqlite3_context*"],
    ["sqlite3_vtab_on_conflict","int", "sqlite3*"],
    ["sqlite3_vtab_rhs_value","int", "sqlite3_index_info*", "int", "**"]
  ];

  // Add session/changeset APIs...
  if(wasm.bigIntEnabled && !!wasm.exports.sqlite3changegroup_add){
    /* ACHTUNG: 2022-12-23: the session/changeset API bindings are
       COMPLETELY UNTESTED. */
    /**
       FuncPtrAdapter options for session-related callbacks with the
       native signature "i(ps)". This proxy converts the 2nd argument
       from a C string to a JS string before passing the arguments on
       to the client-provided JS callback.
    */
    const __ipsProxy = {
      signature: 'i(ps)',
      callProxy:(callback)=>{
        return (p,s)=>{
          try{return callback(p, wasm.cstrToJs(s)) | 0}
          catch(e){return e.resultCode || capi.SQLITE_ERROR}
        }
      }
    };

    wasm.bindingSignatures.int64.push(...[
      ['sqlite3changegroup_add', 'int', ['sqlite3_changegroup*', 'int', 'void*']],
      ['sqlite3changegroup_add_strm', 'int', [
        'sqlite3_changegroup*',
        new wasm.xWrap.FuncPtrAdapter({
          name: 'xInput', signature: 'i(ppp)', bindScope: 'transient'
        }),
        'void*'
      ]],
      ['sqlite3changegroup_delete', undefined, ['sqlite3_changegroup*']],
      ['sqlite3changegroup_new', 'int', ['**']],
      ['sqlite3changegroup_output', 'int', ['sqlite3_changegroup*', 'int*', '**']],
      ['sqlite3changegroup_output_strm', 'int', [
        'sqlite3_changegroup*',
        new wasm.xWrap.FuncPtrAdapter({
          name: 'xOutput', signature: 'i(ppi)', bindScope: 'transient'
        }),
        'void*'
      ]],
      ['sqlite3changeset_apply', 'int', [
        'sqlite3*', 'int', 'void*',
        new wasm.xWrap.FuncPtrAdapter({
          name: 'xFilter', bindScope: 'transient', ...__ipsProxy
        }),
        new wasm.xWrap.FuncPtrAdapter({
          name: 'xConflict', signature: 'i(pip)', bindScope: 'transient'
        }),
        'void*'
      ]],
      ['sqlite3changeset_apply_strm', 'int', [
        'sqlite3*',
        new wasm.xWrap.FuncPtrAdapter({
          name: 'xInput', signature: 'i(ppp)', bindScope: 'transient'
        }),
        'void*',
        new wasm.xWrap.FuncPtrAdapter({
          name: 'xFilter', bindScope: 'transient', ...__ipsProxy
        }),
        new wasm.xWrap.FuncPtrAdapter({
          name: 'xConflict', signature: 'i(pip)', bindScope: 'transient'
        }),
        'void*'
      ]],
      ['sqlite3changeset_apply_v2', 'int', [
        'sqlite3*', 'int', 'void*',
        new wasm.xWrap.FuncPtrAdapter({
          name: 'xFilter', bindScope: 'transient', ...__ipsProxy
        }),
        new wasm.xWrap.FuncPtrAdapter({
          name: 'xConflict', signature: 'i(pip)', bindScope: 'transient'
        }),
        'void*', '**', 'int*', 'int'

      ]],
      ['sqlite3changeset_apply_v2_strm', 'int', [
        'sqlite3*',
        new wasm.xWrap.FuncPtrAdapter({
          name: 'xInput', signature: 'i(ppp)', bindScope: 'transient'
        }),
        'void*',
        new wasm.xWrap.FuncPtrAdapter({
          name: 'xFilter', bindScope: 'transient', ...__ipsProxy
        }),
        new wasm.xWrap.FuncPtrAdapter({
          name: 'xConflict', signature: 'i(pip)', bindScope: 'transient'
        }),
        'void*', '**', 'int*', 'int'
      ]],
      ['sqlite3changeset_concat', 'int', ['int','void*', 'int', 'void*', 'int*', '**']],
      ['sqlite3changeset_concat_strm', 'int', [
        new wasm.xWrap.FuncPtrAdapter({
          name: 'xInputA', signature: 'i(ppp)', bindScope: 'transient'
        }),
        'void*',
        new wasm.xWrap.FuncPtrAdapter({
          name: 'xInputB', signature: 'i(ppp)', bindScope: 'transient'
        }),
        'void*',
        new wasm.xWrap.FuncPtrAdapter({
          name: 'xOutput', signature: 'i(ppi)', bindScope: 'transient'
        }),
        'void*'
      ]],
      ['sqlite3changeset_conflict', 'int', ['sqlite3_changeset_iter*', 'int', '**']],
      ['sqlite3changeset_finalize', 'int', ['sqlite3_changeset_iter*']],
      ['sqlite3changeset_fk_conflicts', 'int', ['sqlite3_changeset_iter*', 'int*']],
      ['sqlite3changeset_invert', 'int', ['int', 'void*', 'int*', '**']],
      ['sqlite3changeset_invert_strm', 'int', [
        new wasm.xWrap.FuncPtrAdapter({
          name: 'xInput', signature: 'i(ppp)', bindScope: 'transient'
        }),
        'void*',
        new wasm.xWrap.FuncPtrAdapter({
          name: 'xOutput', signature: 'i(ppi)', bindScope: 'transient'
        }),
        'void*'
      ]],
      ['sqlite3changeset_new', 'int', ['sqlite3_changeset_iter*', 'int', '**']],
      ['sqlite3changeset_next', 'int', ['sqlite3_changeset_iter*']],
      ['sqlite3changeset_old', 'int', ['sqlite3_changeset_iter*', 'int', '**']],
      ['sqlite3changeset_op', 'int', [
        'sqlite3_changeset_iter*', '**', 'int*', 'int*','int*'
      ]],
      ['sqlite3changeset_pk', 'int', ['sqlite3_changeset_iter*', '**', 'int*']],
      ['sqlite3changeset_start', 'int', ['**', 'int', '*']],
      ['sqlite3changeset_start_strm', 'int', [
        '**',
        new wasm.xWrap.FuncPtrAdapter({
          name: 'xInput', signature: 'i(ppp)', bindScope: 'transient'
        }),
        'void*'
      ]],
      ['sqlite3changeset_start_v2', 'int', ['**', 'int', '*', 'int']],
      ['sqlite3changeset_start_v2_strm', 'int', [
        '**',
        new wasm.xWrap.FuncPtrAdapter({
          name: 'xInput', signature: 'i(ppp)', bindScope: 'transient'
        }),
        'void*', 'int'
      ]],
      ['sqlite3session_attach', 'int', ['sqlite3_session*', 'string']],
      ['sqlite3session_changeset', 'int', ['sqlite3_session*', 'int*', '**']],
      ['sqlite3session_changeset_size', 'i64', ['sqlite3_session*']],
      ['sqlite3session_changeset_strm', 'int', [
        'sqlite3_session*',
        new wasm.xWrap.FuncPtrAdapter({
          name: 'xOutput', signature: 'i(ppp)', bindScope: 'transient'
        }),
        'void*'
      ]],
      ['sqlite3session_config', 'int', ['int', 'void*']],
      ['sqlite3session_create', 'int', ['sqlite3*', 'string', '**']],
      //sqlite3session_delete() is bound manually
      ['sqlite3session_diff', 'int', ['sqlite3_session*', 'string', 'string', '**']],
      ['sqlite3session_enable', 'int', ['sqlite3_session*', 'int']],
      ['sqlite3session_indirect', 'int', ['sqlite3_session*', 'int']],
      ['sqlite3session_isempty', 'int', ['sqlite3_session*']],
      ['sqlite3session_memory_used', 'i64', ['sqlite3_session*']],
      ['sqlite3session_object_config', 'int', ['sqlite3_session*', 'int', 'void*']],
      ['sqlite3session_patchset', 'int', ['sqlite3_session*', '*', '**']],
      ['sqlite3session_patchset_strm', 'int', [
        'sqlite3_session*',
        new wasm.xWrap.FuncPtrAdapter({
          name: 'xOutput', signature: 'i(ppp)', bindScope: 'transient'
        }),
        'void*'
      ]],
      ['sqlite3session_table_filter', undefined, [
        'sqlite3_session*',
        new wasm.xWrap.FuncPtrAdapter({
          name: 'xFilter', ...__ipsProxy,
          contextKey: (argv,argIndex)=>argv[0/* (sqlite3_session*) */]
        }),
        '*'
      ]]
    ]);
  }/*session/changeset APIs*/

  /**
     Functions which are intended solely for API-internal use by the
     WASM components, not client code. These get installed into
     sqlite3.wasm. Some of them get exposed to clients via variants
     named sqlite3_js_...().
  */
  wasm.bindingSignatures.wasm = [
    ["sqlite3_wasm_db_reset", "int", "sqlite3*"],
    ["sqlite3_wasm_db_vfs", "sqlite3_vfs*", "sqlite3*","string"],
    ["sqlite3_wasm_vfs_create_file", "int",
     "sqlite3_vfs*","string","*", "int"],
    ["sqlite3_wasm_posix_create_file", "int", "string","*", "int"],
    ["sqlite3_wasm_vfs_unlink", "int", "sqlite3_vfs*","string"]
  ];

  /**
     Install JS<->C struct bindings for the non-opaque struct types we
     need... */
  sqlite3.StructBinder = globalThis.Jaccwabyt({
    heap: 0 ? wasm.memory : wasm.heap8u,
    alloc: wasm.alloc,
    dealloc: wasm.dealloc,
    bigIntEnabled: wasm.bigIntEnabled,
    memberPrefix: /* Never change this: this prefix is baked into any
                     amount of code and client-facing docs. */ '$'
  });
  delete globalThis.Jaccwabyt;

  {// wasm.xWrap() bindings...

    /* Convert Arrays and certain TypedArrays to strings for
       'string:flexible'-type arguments */
    const __xString = wasm.xWrap.argAdapter('string');
    wasm.xWrap.argAdapter(
      'string:flexible', (v)=>__xString(util.flexibleString(v))
    );

    /**
       The 'string:static' argument adapter treats its argument as
       either...

       - WASM pointer: assumed to be a long-lived C-string which gets
         returned as-is.

       - Anything else: gets coerced to a JS string for use as a map
         key. If a matching entry is found (as described next), it is
         returned, else wasm.allocCString() is used to create a a new
         string, map its pointer to (''+v) for the remainder of the
         application's life, and returns that pointer value for this
         call and all future calls which are passed a
         string-equivalent argument.

       Use case: sqlite3_bind_pointer() and sqlite3_result_pointer()
       call for "a static string and preferably a string
       literal". This converter is used to ensure that the string
       value seen by those functions is long-lived and behaves as they
       need it to.
    */
    wasm.xWrap.argAdapter(
      'string:static',
      function(v){
        if(wasm.isPtr(v)) return v;
        v = ''+v;
        let rc = this[v];
        return rc || (this[v] = wasm.allocCString(v));
      }.bind(Object.create(null))
    );

    /**
       Add some descriptive xWrap() aliases for '*' intended to (A)
       initially improve readability/correctness of
       wasm.bindingSignatures and (B) provide automatic conversion
       from higher-level representations, e.g. capi.sqlite3_vfs to
       `sqlite3_vfs*` via capi.sqlite3_vfs.pointer.
    */
    const __xArgPtr = wasm.xWrap.argAdapter('*');
    const nilType = function(){}/*a class no value can ever be an instance of*/;
    wasm.xWrap.argAdapter('sqlite3_filename', __xArgPtr)
    ('sqlite3_context*', __xArgPtr)
    ('sqlite3_value*', __xArgPtr)
    ('void*', __xArgPtr)
    ('sqlite3_changegroup*', __xArgPtr)
    ('sqlite3_changeset_iter*', __xArgPtr)
    //('sqlite3_rebaser*', __xArgPtr)
    ('sqlite3_session*', __xArgPtr)
    ('sqlite3_stmt*', (v)=>
      __xArgPtr((v instanceof (sqlite3?.oo1?.Stmt || nilType))
           ? v.pointer : v))
    ('sqlite3*', (v)=>
      __xArgPtr((v instanceof (sqlite3?.oo1?.DB || nilType))
           ? v.pointer : v))
    ('sqlite3_index_info*', (v)=>
      __xArgPtr((v instanceof (capi.sqlite3_index_info || nilType))
           ? v.pointer : v))
    ('sqlite3_module*', (v)=>
      __xArgPtr((v instanceof (capi.sqlite3_module || nilType))
           ? v.pointer : v))
    /**
       `sqlite3_vfs*`:

       - v is-a string: use the result of sqlite3_vfs_find(v) but
         throw if it returns 0.
       - v is-a capi.sqlite3_vfs: use v.pointer.
       - Else return the same as the `'*'` argument conversion.
    */
    ('sqlite3_vfs*', (v)=>{
      if('string'===typeof v){
        /* A NULL sqlite3_vfs pointer will be treated as the default
           VFS in many contexts. We specifically do not want that
           behavior here. */
        return capi.sqlite3_vfs_find(v)
          || sqlite3.SQLite3Error.toss(
            capi.SQLITE_NOTFOUND,
            "Unknown sqlite3_vfs name:", v
          );
      }
      return __xArgPtr((v instanceof (capi.sqlite3_vfs || nilType))
                       ? v.pointer : v);
    });

    const __xRcPtr = wasm.xWrap.resultAdapter('*');
    wasm.xWrap.resultAdapter('sqlite3*', __xRcPtr)
    ('sqlite3_context*', __xRcPtr)
    ('sqlite3_stmt*', __xRcPtr)
    ('sqlite3_value*', __xRcPtr)
    ('sqlite3_vfs*', __xRcPtr)
    ('void*', __xRcPtr);

    /**
       Populate api object with sqlite3_...() by binding the "raw" wasm
       exports into type-converting proxies using wasm.xWrap().
    */
    if(0 === wasm.exports.sqlite3_step.length){
      /* This environment wraps exports in nullary functions, which means
         we must disable the arg-count validation we otherwise perform
         on the wrappers. */
      wasm.xWrap.doArgcCheck = false;
      sqlite3.config.warn(
        "Disabling sqlite3.wasm.xWrap.doArgcCheck due to environmental quirks."
      );
    }
    for(const e of wasm.bindingSignatures){
      capi[e[0]] = wasm.xWrap.apply(null, e);
    }
    for(const e of wasm.bindingSignatures.wasm){
      wasm[e[0]] = wasm.xWrap.apply(null, e);
    }

    /* For C API functions which cannot work properly unless
       wasm.bigIntEnabled is true, install a bogus impl which throws
       if called when bigIntEnabled is false. The alternative would be
       to elide these functions altogether, which seems likely to
       cause more confusion. */
    const fI64Disabled = function(fname){
      return ()=>toss(fname+"() is unavailable due to lack",
                      "of BigInt support in this build.");
    };
    for(const e of wasm.bindingSignatures.int64){
      capi[e[0]] = wasm.bigIntEnabled
        ? wasm.xWrap.apply(null, e)
        : fI64Disabled(e[0]);
    }

    /* There's no need to expose bindingSignatures to clients,
       implicitly making it part of the public interface. */
    delete wasm.bindingSignatures;

    if(wasm.exports.sqlite3_wasm_db_error){
      const __db_err = wasm.xWrap(
        'sqlite3_wasm_db_error', 'int', 'sqlite3*', 'int', 'string'
      );
      /**
         Sets the given db's error state. Accepts:

         - (sqlite3*, int code, string msg)
         - (sqlite3*, Error e [,string msg = ''+e])

         If passed a WasmAllocError, the message is ignored and the
         result code is SQLITE_NOMEM. If passed any other Error type,
         the result code defaults to SQLITE_ERROR unless the Error
         object has a resultCode property, in which case that is used
         (e.g. SQLite3Error has that). If passed a non-WasmAllocError
         exception, the message string defaults to theError.message.

         Returns the resulting code. Pass (pDb,0,0) to clear the error
         state.
       */
      util.sqlite3_wasm_db_error = function(pDb, resultCode, message){
        if(resultCode instanceof sqlite3.WasmAllocError){
          resultCode = capi.SQLITE_NOMEM;
          message = 0 /*avoid allocating message string*/;
        }else if(resultCode instanceof Error){
          message = message || ''+resultCode;
          resultCode = (resultCode.resultCode || capi.SQLITE_ERROR);
        }
        return pDb ? __db_err(pDb, resultCode, message) : resultCode;
      };
    }else{
      util.sqlite3_wasm_db_error = function(pDb,errCode,msg){
        console.warn("sqlite3_wasm_db_error() is not exported.",arguments);
        return errCode;
      };
    }
  }/*xWrap() bindings*/

  {/* Import C-level constants and structs... */
    const cJson = wasm.xCall('sqlite3_wasm_enum_json');
    if(!cJson){
      toss("Maintenance required: increase sqlite3_wasm_enum_json()'s",
           "static buffer size!");
    }
    //console.debug('wasm.ctype length =',wasm.cstrlen(cJson));
    wasm.ctype = JSON.parse(wasm.cstrToJs(cJson));
    // Groups of SQLITE_xyz macros...
    const defineGroups = ['access', 'authorizer',
                          'blobFinalizers', 'changeset',
                          'config', 'dataTypes',
                          'dbConfig', 'dbStatus',
                          'encodings', 'fcntl', 'flock', 'ioCap',
                          'limits', 'openFlags',
                          'prepareFlags', 'resultCodes',
                          'sqlite3Status',
                          'stmtStatus', 'syncFlags',
                          'trace', 'txnState', 'udfFlags',
                          'version' ];
    if(wasm.bigIntEnabled){
      defineGroups.push('serialize', 'session', 'vtab');
    }
    for(const t of defineGroups){
      for(const e of Object.entries(wasm.ctype[t])){
        // ^^^ [k,v] there triggers a buggy code transformation via
        // one of the Emscripten-driven optimizers.
        capi[e[0]] = e[1];
      }
    }
    if(!wasm.functionEntry(capi.SQLITE_WASM_DEALLOC)){
      toss("Internal error: cannot resolve exported function",
           "entry SQLITE_WASM_DEALLOC (=="+capi.SQLITE_WASM_DEALLOC+").");
    }
    const __rcMap = Object.create(null);
    for(const t of ['resultCodes']){
      for(const e of Object.entries(wasm.ctype[t])){
        __rcMap[e[1]] = e[0];
      }
    }
    /**
       For the given integer, returns the SQLITE_xxx result code as a
       string, or undefined if no such mapping is found.
    */
    capi.sqlite3_js_rc_str = (rc)=>__rcMap[rc];
    /* Bind all registered C-side structs... */
    const notThese = Object.assign(Object.create(null),{
      // For each struct to NOT register, map its name to true:
      WasmTestStruct: true,
      /* We unregister the kvvfs VFS from Worker threads below. */
      sqlite3_kvvfs_methods: !util.isUIThread(),
      /* sqlite3_index_info and friends require int64: */
      sqlite3_index_info: !wasm.bigIntEnabled,
      sqlite3_index_constraint: !wasm.bigIntEnabled,
      sqlite3_index_orderby: !wasm.bigIntEnabled,
      sqlite3_index_constraint_usage: !wasm.bigIntEnabled
    });
    for(const s of wasm.ctype.structs){
      if(!notThese[s.name]){
        capi[s.name] = sqlite3.StructBinder(s);
      }
    }
    if(capi.sqlite3_index_info){
      /* Move these inner structs into sqlite3_index_info.  Binding
      ** them to WASM requires that we create global-scope structs to
      ** model them with, but those are no longer needed after we've
      ** passed them to StructBinder. */
      for(const k of ['sqlite3_index_constraint',
                      'sqlite3_index_orderby',
                      'sqlite3_index_constraint_usage']){
        capi.sqlite3_index_info[k] = capi[k];
        delete capi[k];
      }
      capi.sqlite3_vtab_config = wasm.xWrap(
        'sqlite3_wasm_vtab_config','int',[
          'sqlite3*', 'int', 'int']
      );
    }/* end vtab-related setup */
  }/*end C constant and struct imports*/

  /**
     Internal helper to assist in validating call argument counts in
     the hand-written sqlite3_xyz() wrappers. We do this only for
     consistency with non-special-case wrappings.
  */
  const __dbArgcMismatch = (pDb,f,n)=>{
    return util.sqlite3_wasm_db_error(pDb, capi.SQLITE_MISUSE,
                                      f+"() requires "+n+" argument"+
                                      (1===n?"":'s')+".");
  };

  /** Code duplication reducer for functions which take an encoding
      argument and require SQLITE_UTF8.  Sets the db error code to
      SQLITE_FORMAT and returns that code. */
  const __errEncoding = (pDb)=>{
    return util.sqlite3_wasm_db_error(
      pDb, capi.SQLITE_FORMAT, "SQLITE_UTF8 is the only supported encoding."
    );
  };

  /**
     __dbCleanupMap is infrastructure for recording registration of
     UDFs and collations so that sqlite3_close_v2() can clean up any
     automated JS-to-WASM function conversions installed by those.
  */
  const __argPDb = (pDb)=>wasm.xWrap.argAdapter('sqlite3*')(pDb);
  const __argStr = (str)=>wasm.isPtr(str) ? wasm.cstrToJs(str) : str;
  const __dbCleanupMap = function(
    pDb, mode/*0=remove, >0=create if needed, <0=do not create if missing*/
  ){
    pDb = __argPDb(pDb);
    let m = this.dbMap.get(pDb);
    if(!mode){
      this.dbMap.delete(pDb);
      return m;
    }else if(!m && mode>0){
      this.dbMap.set(pDb, (m = Object.create(null)));
    }
    return m;
  }.bind(Object.assign(Object.create(null),{
    dbMap: new Map
  }));

  __dbCleanupMap.addCollation = function(pDb, name){
    const m = __dbCleanupMap(pDb, 1);
    if(!m.collation) m.collation = new Set;
    m.collation.add(__argStr(name).toLowerCase());
  };

  __dbCleanupMap._addUDF = function(pDb, name, arity, map){
    /* Map UDF name to a Set of arity values */
    name = __argStr(name).toLowerCase();
    let u = map.get(name);
    if(!u) map.set(name, (u = new Set));
    u.add((arity<0) ? -1 : arity);
  };

  __dbCleanupMap.addFunction = function(pDb, name, arity){
    const m = __dbCleanupMap(pDb, 1);
    if(!m.udf) m.udf = new Map;
    this._addUDF(pDb, name, arity, m.udf);
  };

  __dbCleanupMap.addWindowFunc = function(pDb, name, arity){
    const m = __dbCleanupMap(pDb, 1);
    if(!m.wudf) m.wudf = new Map;
    this._addUDF(pDb, name, arity, m.wudf);
  };

  /**
     Intended to be called _only_ from sqlite3_close_v2(),
     passed its non-0 db argument.

     This function frees up certain automatically-installed WASM
     function bindings which were installed on behalf of the given db,
     as those may otherwise leak.

     Notable caveat: this is only ever run via
     sqlite3.capi.sqlite3_close_v2(). If a client, for whatever
     reason, uses sqlite3.wasm.exports.sqlite3_close_v2() (the
     function directly exported from WASM), this cleanup will not
     happen.

     This is not a silver bullet for avoiding automation-related
     leaks but represents "an honest effort."

     The issue being addressed here is covered at:

     https://sqlite.org/wasm/doc/trunk/api-c-style.md#convert-func-ptr
  */
  __dbCleanupMap.cleanup = function(pDb){
    pDb = __argPDb(pDb);
    //wasm.xWrap.FuncPtrAdapter.debugFuncInstall = false;
    /**
       Installing NULL functions in the C API will remove those
       bindings. The FuncPtrAdapter which sits between us and the C
       API will also treat that as an opportunity to
       wasm.uninstallFunction() any WASM function bindings it has
       installed for pDb.
    */
    const closeArgs = [pDb];
    for(const name of [
      'sqlite3_busy_handler',
      'sqlite3_commit_hook',
      'sqlite3_preupdate_hook',
      'sqlite3_progress_handler',
      'sqlite3_rollback_hook',
      'sqlite3_set_authorizer',
      'sqlite3_trace_v2',
      'sqlite3_update_hook'
    ]) {
      const x = wasm.exports[name];
      closeArgs.length = x.length/*==argument count*/
      /* recall that undefined entries translate to 0 when passed to
         WASM. */;
      try{ capi[name](...closeArgs) }
      catch(e){
        console.warn("close-time call of",name+"(",closeArgs,") threw:",e);
      }
    }
    const m = __dbCleanupMap(pDb, 0);
    if(!m) return;
    if(m.collation){
      for(const name of m.collation){
        try{
          capi.sqlite3_create_collation_v2(
            pDb, name, capi.SQLITE_UTF8, 0, 0, 0
          );
        }catch(e){
          /*ignored*/
        }
      }
      delete m.collation;
    }
    let i;
    for(i = 0; i < 2; ++i){ /* Clean up UDFs... */
      const fmap = i ? m.wudf : m.udf;
      if(!fmap) continue;
      const func = i
            ? capi.sqlite3_create_window_function
            : capi.sqlite3_create_function_v2;
      for(const e of fmap){
        const name = e[0], arities = e[1];
        const fargs = [pDb, name, 0/*arity*/, capi.SQLITE_UTF8, 0, 0, 0, 0, 0];
        if(i) fargs.push(0);
        for(const arity of arities){
          try{ fargs[2] = arity; func.apply(null, fargs); }
          catch(e){/*ignored*/}
        }
        arities.clear();
      }
      fmap.clear();
    }
    delete m.udf;
    delete m.wudf;
  }/*__dbCleanupMap.cleanup()*/;

  {/* Binding of sqlite3_close_v2() */
    const __sqlite3CloseV2 = wasm.xWrap("sqlite3_close_v2", "int", "sqlite3*");
    capi.sqlite3_close_v2 = function(pDb){
      if(1!==arguments.length) return __dbArgcMismatch(pDb, 'sqlite3_close_v2', 1);
      if(pDb){
        try{__dbCleanupMap.cleanup(pDb)} catch(e){/*ignored*/}
      }
      return __sqlite3CloseV2(pDb);
    };
  }/*sqlite3_close_v2()*/

  if(capi.sqlite3session_table_filter){
    const __sqlite3SessionDelete = wasm.xWrap(
      'sqlite3session_delete', undefined, ['sqlite3_session*']
    );
    capi.sqlite3session_delete = function(pSession){
      if(1!==arguments.length){
        return __dbArgcMismatch(pDb, 'sqlite3session_delete', 1);
        /* Yes, we're returning a value from a void function. That seems
           like the lesser evil compared to not maintaining arg-count
           consistency as we do with other similar bindings. */
      }
      else if(pSession){
        //wasm.xWrap.FuncPtrAdapter.debugFuncInstall = true;
        capi.sqlite3session_table_filter(pSession, 0, 0);
      }
      __sqlite3SessionDelete(pSession);
    };
  }

  {/* Bindings for sqlite3_create_collation[_v2]() */
    // contextKey() impl for wasm.xWrap.FuncPtrAdapter
    const contextKey = (argv,argIndex)=>{
      return 'argv['+argIndex+']:'+argv[0/* sqlite3* */]+
        ':'+wasm.cstrToJs(argv[1/* collation name */]).toLowerCase()
    };
    const __sqlite3CreateCollationV2 = wasm.xWrap(
      'sqlite3_create_collation_v2', 'int', [
        'sqlite3*', 'string', 'int', '*',
        new wasm.xWrap.FuncPtrAdapter({
          /* int(*xCompare)(void*,int,const void*,int,const void*) */
          name: 'xCompare', signature: 'i(pipip)', contextKey
        }),
        new wasm.xWrap.FuncPtrAdapter({
          /* void(*xDestroy(void*) */
          name: 'xDestroy', signature: 'v(p)', contextKey
        })
      ]
    );

    /**
       Works exactly like C's sqlite3_create_collation_v2() except that:

       1) It returns capi.SQLITE_FORMAT if the 3rd argument contains
          any encoding-related value other than capi.SQLITE_UTF8.  No
          other encodings are supported. As a special case, if the
          bottom 4 bits of that argument are 0, SQLITE_UTF8 is
          assumed.

       2) It accepts JS functions for its function-pointer arguments,
          for which it will install WASM-bound proxies. The bindings
          are "permanent," in that they will stay in the WASM environment
          until it shuts down unless the client calls this again with the
          same collation name and a value of 0 or null for the
          the function pointer(s).

       For consistency with the C API, it requires the same number of
       arguments. It returns capi.SQLITE_MISUSE if passed any other
       argument count.

       Returns 0 on success, non-0 on error, in which case the error
       state of pDb (of type `sqlite3*` or argument-convertible to it)
       may contain more information.
    */
    capi.sqlite3_create_collation_v2 = function(pDb,zName,eTextRep,pArg,xCompare,xDestroy){
      if(6!==arguments.length) return __dbArgcMismatch(pDb, 'sqlite3_create_collation_v2', 6);
      else if( 0 === (eTextRep & 0xf) ){
        eTextRep |= capi.SQLITE_UTF8;
      }else if( capi.SQLITE_UTF8 !== (eTextRep & 0xf) ){
        return __errEncoding(pDb);
      }
      try{
        const rc = __sqlite3CreateCollationV2(pDb, zName, eTextRep, pArg, xCompare, xDestroy);
        if(0===rc && xCompare instanceof Function){
          __dbCleanupMap.addCollation(pDb, zName);
        }
        return rc;
      }catch(e){
        return util.sqlite3_wasm_db_error(pDb, e);
      }
    };

    capi.sqlite3_create_collation = (pDb,zName,eTextRep,pArg,xCompare)=>{
      return (5===arguments.length)
        ? capi.sqlite3_create_collation_v2(pDb,zName,eTextRep,pArg,xCompare,0)
        : __dbArgcMismatch(pDb, 'sqlite3_create_collation', 5);
    };

  }/*sqlite3_create_collation() and friends*/

  {/* Special-case handling of sqlite3_create_function_v2()
      and sqlite3_create_window_function(). */
    /** FuncPtrAdapter for contextKey() for sqlite3_create_function()
        and friends. */
    const contextKey = function(argv,argIndex){
      return (
        argv[0/* sqlite3* */]
          +':'+(argv[2/*number of UDF args*/] < 0 ? -1 : argv[2])
          +':'+argIndex/*distinct for each xAbc callback type*/
          +':'+wasm.cstrToJs(argv[1]).toLowerCase()
      )
    };

    /**
       JS proxies for the various sqlite3_create[_window]_function()
       callbacks, structured in a form usable by wasm.xWrap.FuncPtrAdapter.
    */
    const __cfProxy = Object.assign(Object.create(null), {
      xInverseAndStep: {
        signature:'v(pip)', contextKey,
        callProxy: (callback)=>{
          return (pCtx, argc, pArgv)=>{
            try{ callback(pCtx, ...capi.sqlite3_values_to_js(argc, pArgv)) }
            catch(e){ capi.sqlite3_result_error_js(pCtx, e) }
          };
        }
      },
      xFinalAndValue: {
        signature:'v(p)', contextKey,
        callProxy: (callback)=>{
          return (pCtx)=>{
            try{ capi.sqlite3_result_js(pCtx, callback(pCtx)) }
            catch(e){ capi.sqlite3_result_error_js(pCtx, e) }
          };
        }
      },
      xFunc: {
        signature:'v(pip)', contextKey,
        callProxy: (callback)=>{
          return (pCtx, argc, pArgv)=>{
            try{
              capi.sqlite3_result_js(
                pCtx,
                callback(pCtx, ...capi.sqlite3_values_to_js(argc, pArgv))
              );
            }catch(e){
              //console.error('xFunc() caught:',e);
              capi.sqlite3_result_error_js(pCtx, e);
            }
          };
        }
      },
      xDestroy: {
        signature:'v(p)', contextKey,
        //Arguable: a well-behaved destructor doesn't require a proxy.
        callProxy: (callback)=>{
          return (pVoid)=>{
            try{ callback(pVoid) }
            catch(e){ console.error("UDF xDestroy method threw:",e) }
          };
        }
      }
    })/*__cfProxy*/;

    const __sqlite3CreateFunction = wasm.xWrap(
      "sqlite3_create_function_v2", "int", [
        "sqlite3*", "string"/*funcName*/, "int"/*nArg*/,
        "int"/*eTextRep*/, "*"/*pApp*/,
        new wasm.xWrap.FuncPtrAdapter({name: 'xFunc', ...__cfProxy.xFunc}),
        new wasm.xWrap.FuncPtrAdapter({name: 'xStep', ...__cfProxy.xInverseAndStep}),
        new wasm.xWrap.FuncPtrAdapter({name: 'xFinal', ...__cfProxy.xFinalAndValue}),
        new wasm.xWrap.FuncPtrAdapter({name: 'xDestroy', ...__cfProxy.xDestroy})
      ]
    );

    const __sqlite3CreateWindowFunction = wasm.xWrap(
      "sqlite3_create_window_function", "int", [
        "sqlite3*", "string"/*funcName*/, "int"/*nArg*/,
        "int"/*eTextRep*/, "*"/*pApp*/,
        new wasm.xWrap.FuncPtrAdapter({name: 'xStep', ...__cfProxy.xInverseAndStep}),
        new wasm.xWrap.FuncPtrAdapter({name: 'xFinal', ...__cfProxy.xFinalAndValue}),
        new wasm.xWrap.FuncPtrAdapter({name: 'xValue', ...__cfProxy.xFinalAndValue}),
        new wasm.xWrap.FuncPtrAdapter({name: 'xInverse', ...__cfProxy.xInverseAndStep}),
        new wasm.xWrap.FuncPtrAdapter({name: 'xDestroy', ...__cfProxy.xDestroy})
      ]
    );

    /* Documented in the api object's initializer. */
    capi.sqlite3_create_function_v2 = function f(
      pDb, funcName, nArg, eTextRep, pApp,
      xFunc,   //void (*xFunc)(sqlite3_context*,int,sqlite3_value**)
      xStep,   //void (*xStep)(sqlite3_context*,int,sqlite3_value**)
      xFinal,  //void (*xFinal)(sqlite3_context*)
      xDestroy //void (*xDestroy)(void*)
    ){
      if( f.length!==arguments.length ){
        return __dbArgcMismatch(pDb,"sqlite3_create_function_v2",f.length);
      }else if( 0 === (eTextRep & 0xf) ){
        eTextRep |= capi.SQLITE_UTF8;
      }else if( capi.SQLITE_UTF8 !== (eTextRep & 0xf) ){
        return __errEncoding(pDb);
      }
      try{
        const rc = __sqlite3CreateFunction(pDb, funcName, nArg, eTextRep,
                                           pApp, xFunc, xStep, xFinal, xDestroy);
        if(0===rc && (xFunc instanceof Function
                      || xStep instanceof Function
                      || xFinal instanceof Function
                      || xDestroy instanceof Function)){
          __dbCleanupMap.addFunction(pDb, funcName, nArg);
        }
        return rc;
      }catch(e){
        console.error("sqlite3_create_function_v2() setup threw:",e);
        return util.sqlite3_wasm_db_error(pDb, e, "Creation of UDF threw: "+e);
      }
    };

    /* Documented in the api object's initializer. */
    capi.sqlite3_create_function = function f(
      pDb, funcName, nArg, eTextRep, pApp,
      xFunc, xStep, xFinal
    ){
      return (f.length===arguments.length)
        ? capi.sqlite3_create_function_v2(pDb, funcName, nArg, eTextRep,
                                          pApp, xFunc, xStep, xFinal, 0)
        : __dbArgcMismatch(pDb,"sqlite3_create_function",f.length);
    };

    /* Documented in the api object's initializer. */
    capi.sqlite3_create_window_function = function f(
      pDb, funcName, nArg, eTextRep, pApp,
      xStep,   //void (*xStep)(sqlite3_context*,int,sqlite3_value**)
      xFinal,  //void (*xFinal)(sqlite3_context*)
      xValue,  //void (*xValue)(sqlite3_context*)
      xInverse,//void (*xInverse)(sqlite3_context*,int,sqlite3_value**)
      xDestroy //void (*xDestroy)(void*)
    ){
      if( f.length!==arguments.length ){
        return __dbArgcMismatch(pDb,"sqlite3_create_window_function",f.length);
      }else if( 0 === (eTextRep & 0xf) ){
        eTextRep |= capi.SQLITE_UTF8;
      }else if( capi.SQLITE_UTF8 !== (eTextRep & 0xf) ){
        return __errEncoding(pDb);
      }
      try{
        const rc = __sqlite3CreateWindowFunction(pDb, funcName, nArg, eTextRep,
                                                 pApp, xStep, xFinal, xValue,
                                                 xInverse, xDestroy);
        if(0===rc && (xStep instanceof Function
                      || xFinal instanceof Function
                      || xValue instanceof Function
                      || xInverse instanceof Function
                      || xDestroy instanceof Function)){
          __dbCleanupMap.addWindowFunc(pDb, funcName, nArg);
        }
        return rc;
      }catch(e){
        console.error("sqlite3_create_window_function() setup threw:",e);
        return util.sqlite3_wasm_db_error(pDb, e, "Creation of UDF threw: "+e);
      }
    };
    /**
       A _deprecated_ alias for capi.sqlite3_result_js() which
       predates the addition of that function in the public API.
    */
    capi.sqlite3_create_function_v2.udfSetResult =
      capi.sqlite3_create_function.udfSetResult =
      capi.sqlite3_create_window_function.udfSetResult = capi.sqlite3_result_js;

    /**
       A _deprecated_ alias for capi.sqlite3_values_to_js() which
       predates the addition of that function in the public API.
    */
    capi.sqlite3_create_function_v2.udfConvertArgs =
      capi.sqlite3_create_function.udfConvertArgs =
      capi.sqlite3_create_window_function.udfConvertArgs = capi.sqlite3_values_to_js;

    /**
       A _deprecated_ alias for capi.sqlite3_result_error_js() which
       predates the addition of that function in the public API.
    */
    capi.sqlite3_create_function_v2.udfSetError =
      capi.sqlite3_create_function.udfSetError =
      capi.sqlite3_create_window_function.udfSetError = capi.sqlite3_result_error_js;

  }/*sqlite3_create_function_v2() and sqlite3_create_window_function() proxies*/;

  {/* Special-case handling of sqlite3_prepare_v2() and
      sqlite3_prepare_v3() */

    /**
       Helper for string:flexible conversions which require a
       byte-length counterpart argument. Passed a value and its
       ostensible length, this function returns [V,N], where V is
       either v or a transformed copy of v and N is either n, -1, or
       the byte length of v (if it's a byte array or ArrayBuffer).
    */
    const __flexiString = (v,n)=>{
      if('string'===typeof v){
        n = -1;
      }else if(util.isSQLableTypedArray(v)){
        n = v.byteLength;
        v = util.typedArrayToString(
          (v instanceof ArrayBuffer) ? new Uint8Array(v) : v
        );
      }else if(Array.isArray(v)){
        v = v.join("");
        n = -1;
      }
      return [v, n];
    };

    /**
       Scope-local holder of the two impls of sqlite3_prepare_v2/v3().
    */
    const __prepare = {
      /**
         This binding expects a JS string as its 2nd argument and
         null as its final argument. In order to compile multiple
         statements from a single string, the "full" impl (see
         below) must be used.
      */
      basic: wasm.xWrap('sqlite3_prepare_v3',
                        "int", ["sqlite3*", "string",
                                "int"/*ignored for this impl!*/,
                                "int", "**",
                                "**"/*MUST be 0 or null or undefined!*/]),
      /**
         Impl which requires that the 2nd argument be a pointer
         to the SQL string, instead of being converted to a
         string. This variant is necessary for cases where we
         require a non-NULL value for the final argument
         (exec()'ing multiple statements from one input
         string). For simpler cases, where only the first
         statement in the SQL string is required, the wrapper
         named sqlite3_prepare_v2() is sufficient and easier to
         use because it doesn't require dealing with pointers.
      */
      full: wasm.xWrap('sqlite3_prepare_v3',
                       "int", ["sqlite3*", "*", "int", "int",
                               "**", "**"])
    };

    /* Documented in the capi object's initializer. */
    capi.sqlite3_prepare_v3 = function f(pDb, sql, sqlLen, prepFlags, ppStmt, pzTail){
      if(f.length!==arguments.length){
        return __dbArgcMismatch(pDb,"sqlite3_prepare_v3",f.length);
      }
      const [xSql, xSqlLen] = __flexiString(sql, sqlLen);
      switch(typeof xSql){
          case 'string': return __prepare.basic(pDb, xSql, xSqlLen, prepFlags, ppStmt, null);
          case 'number': return __prepare.full(pDb, xSql, xSqlLen, prepFlags, ppStmt, pzTail);
          default:
            return util.sqlite3_wasm_db_error(
              pDb, capi.SQLITE_MISUSE,
              "Invalid SQL argument type for sqlite3_prepare_v2/v3()."
            );
      }
    };

    /* Documented in the capi object's initializer. */
    capi.sqlite3_prepare_v2 = function f(pDb, sql, sqlLen, ppStmt, pzTail){
      return (f.length===arguments.length)
        ? capi.sqlite3_prepare_v3(pDb, sql, sqlLen, 0, ppStmt, pzTail)
        : __dbArgcMismatch(pDb,"sqlite3_prepare_v2",f.length);
    };

  }/*sqlite3_prepare_v2/v3()*/

  {/*sqlite3_bind_text/blob()*/
    const __bindText = wasm.xWrap("sqlite3_bind_text", "int", [
      "sqlite3_stmt*", "int", "string", "int", "*"
    ]);
    const __bindBlob = wasm.xWrap("sqlite3_bind_blob", "int", [
      "sqlite3_stmt*", "int", "*", "int", "*"
    ]);

    /** Documented in the capi object's initializer. */
    capi.sqlite3_bind_text = function f(pStmt, iCol, text, nText, xDestroy){
      if(f.length!==arguments.length){
        return __dbArgcMismatch(capi.sqlite3_db_handle(pStmt),
                                "sqlite3_bind_text", f.length);
      }else if(wasm.isPtr(text) || null===text){
        return __bindText(pStmt, iCol, text, nText, xDestroy);
      }else if(text instanceof ArrayBuffer){
        text = new Uint8Array(text);
      }else if(Array.isArray(pMem)){
        text = pMem.join('');
      }
      let p, n;
      try{
        if(util.isSQLableTypedArray(text)){
          p = wasm.allocFromTypedArray(text);
          n = text.byteLength;
        }else if('string'===typeof text){
          [p, n] = wasm.allocCString(text);
        }else{
          return util.sqlite3_wasm_db_error(
            capi.sqlite3_db_handle(pStmt), capi.SQLITE_MISUSE,
            "Invalid 3rd argument type for sqlite3_bind_text()."
          );
        }
        return __bindText(pStmt, iCol, p, n, capi.SQLITE_WASM_DEALLOC);
      }catch(e){
        wasm.dealloc(p);
        return util.sqlite3_wasm_db_error(
          capi.sqlite3_db_handle(pStmt), e
        );
      }
    }/*sqlite3_bind_text()*/;

    /** Documented in the capi object's initializer. */
    capi.sqlite3_bind_blob = function f(pStmt, iCol, pMem, nMem, xDestroy){
      if(f.length!==arguments.length){
        return __dbArgcMismatch(capi.sqlite3_db_handle(pStmt),
                                "sqlite3_bind_blob", f.length);
      }else if(wasm.isPtr(pMem) || null===pMem){
        return __bindBlob(pStmt, iCol, pMem, nMem, xDestroy);
      }else if(pMem instanceof ArrayBuffer){
        pMem = new Uint8Array(pMem);
      }else if(Array.isArray(pMem)){
        pMem = pMem.join('');
      }
      let p, n;
      try{
        if(util.isBindableTypedArray(pMem)){
          p = wasm.allocFromTypedArray(pMem);
          n = nMem>=0 ? nMem : pMem.byteLength;
        }else if('string'===typeof pMem){
          [p, n] = wasm.allocCString(pMem);
        }else{
          return util.sqlite3_wasm_db_error(
            capi.sqlite3_db_handle(pStmt), capi.SQLITE_MISUSE,
            "Invalid 3rd argument type for sqlite3_bind_blob()."
          );
        }
        return __bindBlob(pStmt, iCol, p, n, capi.SQLITE_WASM_DEALLOC);
      }catch(e){
        wasm.dealloc(p);
        return util.sqlite3_wasm_db_error(
          capi.sqlite3_db_handle(pStmt), e
        );
      }
    }/*sqlite3_bind_blob()*/;

  }/*sqlite3_bind_text/blob()*/

  {/* sqlite3_config() */
    /**
       Wraps a small subset of the C API's sqlite3_config() options.
       Unsupported options trigger the return of capi.SQLITE_NOTFOUND.
       Passing fewer than 2 arguments triggers return of
       capi.SQLITE_MISUSE.
    */
    capi.sqlite3_config = function(op, ...args){
      if(arguments.length<2) return capi.SQLITE_MISUSE;
      switch(op){
          case capi.SQLITE_CONFIG_COVERING_INDEX_SCAN: // 20  /* int */
          case capi.SQLITE_CONFIG_MEMSTATUS:// 9  /* boolean */
          case capi.SQLITE_CONFIG_SMALL_MALLOC: // 27  /* boolean */
          case capi.SQLITE_CONFIG_SORTERREF_SIZE: // 28  /* int nByte */
          case capi.SQLITE_CONFIG_STMTJRNL_SPILL: // 26  /* int nByte */
          case capi.SQLITE_CONFIG_URI:// 17  /* int */
            return wasm.exports.sqlite3_wasm_config_i(op, args[0]);
          case capi.SQLITE_CONFIG_LOOKASIDE: // 13  /* int int */
            return wasm.exports.sqlite3_wasm_config_ii(op, args[0], args[1]);
          case capi.SQLITE_CONFIG_MEMDB_MAXSIZE: // 29  /* sqlite3_int64 */
            return wasm.exports.sqlite3_wasm_config_j(op, args[0]);
          case capi.SQLITE_CONFIG_GETMALLOC: // 5 /* sqlite3_mem_methods* */
          case capi.SQLITE_CONFIG_GETMUTEX: // 11  /* sqlite3_mutex_methods* */
          case capi.SQLITE_CONFIG_GETPCACHE2: // 19  /* sqlite3_pcache_methods2* */
          case capi.SQLITE_CONFIG_GETPCACHE: // 15  /* no-op */
          case capi.SQLITE_CONFIG_HEAP: // 8  /* void*, int nByte, int min */
          case capi.SQLITE_CONFIG_LOG: // 16  /* xFunc, void* */
          case capi.SQLITE_CONFIG_MALLOC:// 4  /* sqlite3_mem_methods* */
          case capi.SQLITE_CONFIG_MMAP_SIZE: // 22  /* sqlite3_int64, sqlite3_int64 */
          case capi.SQLITE_CONFIG_MULTITHREAD: // 2 /* nil */
          case capi.SQLITE_CONFIG_MUTEX: // 10  /* sqlite3_mutex_methods* */
          case capi.SQLITE_CONFIG_PAGECACHE: // 7  /* void*, int sz, int N */
          case capi.SQLITE_CONFIG_PCACHE2: // 18  /* sqlite3_pcache_methods2* */
          case capi.SQLITE_CONFIG_PCACHE: // 14  /* no-op */
          case capi.SQLITE_CONFIG_PCACHE_HDRSZ: // 24  /* int *psz */
          case capi.SQLITE_CONFIG_PMASZ: // 25  /* unsigned int szPma */
          case capi.SQLITE_CONFIG_SERIALIZED: // 3 /* nil */
          case capi.SQLITE_CONFIG_SINGLETHREAD: // 1 /* nil */:
          case capi.SQLITE_CONFIG_SQLLOG: // 21  /* xSqllog, void* */
          case capi.SQLITE_CONFIG_WIN32_HEAPSIZE: // 23  /* int nByte */
          default:
            return capi.SQLITE_NOTFOUND;
      }
    };
  }/* sqlite3_config() */

  {/*auto-extension bindings.*/
    const __autoExtFptr = new Set;

    capi.sqlite3_auto_extension = function(fPtr){
      if( fPtr instanceof Function ){
        fPtr = wasm.installFunction('i(ppp)', fPtr);
      }else if( 1!==arguments.length || !wasm.isPtr(fPtr) ){
        return capi.SQLITE_MISUSE;
      }
      const rc = wasm.exports.sqlite3_auto_extension(fPtr);
      if( fPtr!==arguments[0] ){
        if(0===rc) __autoExtFptr.add(fPtr);
        else wasm.uninstallFunction(fPtr);
      }
      return rc;
    };

    capi.sqlite3_cancel_auto_extension = function(fPtr){
     /* We do not do an automatic JS-to-WASM function conversion here
        because it would be senseless: the converted pointer would
        never possibly match an already-installed one. */;
      if(!fPtr || 1!==arguments.length || !wasm.isPtr(fPtr)) return 0;
      return wasm.exports.sqlite3_cancel_auto_extension(fPtr);
      /* Note that it "cannot happen" that a client passes a pointer which
         is in __autoExtFptr because __autoExtFptr only contains automatic
         conversions created inside sqlite3_auto_extension() and
         never exposed to the client. */
    };

    capi.sqlite3_reset_auto_extension = function(){
      wasm.exports.sqlite3_reset_auto_extension();
      for(const fp of __autoExtFptr) wasm.uninstallFunction(fp);
      __autoExtFptr.clear();
    };
  }/* auto-extension */

  const pKvvfs = capi.sqlite3_vfs_find("kvvfs");
  if( pKvvfs ){/* kvvfs-specific glue */
    if(util.isUIThread()){
      const kvvfsMethods = new capi.sqlite3_kvvfs_methods(
        wasm.exports.sqlite3_wasm_kvvfs_methods()
      );
      delete capi.sqlite3_kvvfs_methods;

      const kvvfsMakeKey = wasm.exports.sqlite3_wasm_kvvfsMakeKeyOnPstack,
            pstack = wasm.pstack;

      const kvvfsStorage = (zClass)=>
            ((115/*=='s'*/===wasm.peek(zClass))
             ? sessionStorage : localStorage);

      /**
         Implementations for members of the object referred to by
         sqlite3_wasm_kvvfs_methods(). We swap out the native
         implementations with these, which use localStorage or
         sessionStorage for their backing store.
      */
      const kvvfsImpls = {
        xRead: (zClass, zKey, zBuf, nBuf)=>{
          const stack = pstack.pointer,
                astack = wasm.scopedAllocPush();
          try {
            const zXKey = kvvfsMakeKey(zClass,zKey);
            if(!zXKey) return -3/*OOM*/;
            const jKey = wasm.cstrToJs(zXKey);
            const jV = kvvfsStorage(zClass).getItem(jKey);
            if(!jV) return -1;
            const nV = jV.length /* Note that we are relying 100% on v being
                                    ASCII so that jV.length is equal to the
                                    C-string's byte length. */;
            if(nBuf<=0) return nV;
            else if(1===nBuf){
              wasm.poke(zBuf, 0);
              return nV;
            }
            const zV = wasm.scopedAllocCString(jV);
            if(nBuf > nV + 1) nBuf = nV + 1;
            wasm.heap8u().copyWithin(zBuf, zV, zV + nBuf - 1);
            wasm.poke(zBuf + nBuf - 1, 0);
            return nBuf - 1;
          }catch(e){
            console.error("kvstorageRead()",e);
            return -2;
          }finally{
            pstack.restore(stack);
            wasm.scopedAllocPop(astack);
          }
        },
        xWrite: (zClass, zKey, zData)=>{
          const stack = pstack.pointer;
          try {
            const zXKey = kvvfsMakeKey(zClass,zKey);
            if(!zXKey) return 1/*OOM*/;
            const jKey = wasm.cstrToJs(zXKey);
            kvvfsStorage(zClass).setItem(jKey, wasm.cstrToJs(zData));
            return 0;
          }catch(e){
            console.error("kvstorageWrite()",e);
            return capi.SQLITE_IOERR;
          }finally{
            pstack.restore(stack);
          }
        },
        xDelete: (zClass, zKey)=>{
          const stack = pstack.pointer;
          try {
            const zXKey = kvvfsMakeKey(zClass,zKey);
            if(!zXKey) return 1/*OOM*/;
            kvvfsStorage(zClass).removeItem(wasm.cstrToJs(zXKey));
            return 0;
          }catch(e){
            console.error("kvstorageDelete()",e);
            return capi.SQLITE_IOERR;
          }finally{
            pstack.restore(stack);
          }
        }
      }/*kvvfsImpls*/;
      for(const k of Object.keys(kvvfsImpls)){
        kvvfsMethods[kvvfsMethods.memberKey(k)] =
          wasm.installFunction(
            kvvfsMethods.memberSignature(k),
            kvvfsImpls[k]
          );
      }
    }else{
      /* Worker thread: unregister kvvfs to avoid it being used
         for anything other than local/sessionStorage. It "can"
         be used that way but it's not really intended to be. */
      capi.sqlite3_vfs_unregister(pKvvfs);
    }
  }/*pKvvfs*/

  wasm.xWrap.FuncPtrAdapter.warnOnUse = true;
});
/* END FILE: api/sqlite3-api-glue.js */
/* BEGIN FILE: ./bld/sqlite3-api-build-version.js */
globalThis.sqlite3ApiBootstrap.initializers.push(function(sqlite3){
  sqlite3.version = {"libVersion": "3.44.0", "libVersionNumber": 3044000, "sourceId": "2023-11-01 11:23:50 17129ba1ff7f0daf37100ee82d507aef7827cf38de1866e2633096ae6ad81301","downloadVersion": 3440000};
});
/* END FILE: ./bld/sqlite3-api-build-version.js */
/* BEGIN FILE: api/sqlite3-api-oo1.js */
/*
  2022-07-22

  The author disclaims copyright to this source code.  In place of a
  legal notice, here is a blessing:

  *   May you do good and not evil.
  *   May you find forgiveness for yourself and forgive others.
  *   May you share freely, never taking more than you give.

  ***********************************************************************

  This file contains the so-called OO #1 API wrapper for the sqlite3
  WASM build. It requires that sqlite3-api-glue.js has already run
  and it installs its deliverable as globalThis.sqlite3.oo1.
*/
globalThis.sqlite3ApiBootstrap.initializers.push(function(sqlite3){
  const toss = (...args)=>{throw new Error(args.join(' '))};
  const toss3 = (...args)=>{throw new sqlite3.SQLite3Error(...args)};

  const capi = sqlite3.capi, wasm = sqlite3.wasm, util = sqlite3.util;
  /* What follows is colloquially known as "OO API #1". It is a
     binding of the sqlite3 API which is designed to be run within
     the same thread (main or worker) as the one in which the
     sqlite3 WASM binding was initialized. This wrapper cannot use
     the sqlite3 binding if, e.g., the wrapper is in the main thread
     and the sqlite3 API is in a worker. */

  /**
     In order to keep clients from manipulating, perhaps
     inadvertently, the underlying pointer values of DB and Stmt
     instances, we'll gate access to them via the `pointer` property
     accessor and store their real values in this map. Keys = DB/Stmt
     objects, values = pointer values. This also unifies how those are
     accessed, for potential use downstream via custom
     wasm.xWrap() function signatures which know how to extract
     it.
  */
  const __ptrMap = new WeakMap();
  /**
     Map of DB instances to objects, each object being a map of Stmt
     wasm pointers to Stmt objects.
  */
  const __stmtMap = new WeakMap();

  /** If object opts has _its own_ property named p then that
      property's value is returned, else dflt is returned. */
  const getOwnOption = (opts, p, dflt)=>{
    const d = Object.getOwnPropertyDescriptor(opts,p);
    return d ? d.value : dflt;
  };

  // Documented in DB.checkRc()
  const checkSqlite3Rc = function(dbPtr, sqliteResultCode){
    if(sqliteResultCode){
      if(dbPtr instanceof DB) dbPtr = dbPtr.pointer;
      toss3(
        sqliteResultCode,
        "sqlite3 result code",sqliteResultCode+":",
        (dbPtr
         ? capi.sqlite3_errmsg(dbPtr)
         : capi.sqlite3_errstr(sqliteResultCode))
      );
    }
    return arguments[0];
  };

  /**
     sqlite3_trace_v2() callback which gets installed by the DB ctor
     if its open-flags contain "t".
  */
  const __dbTraceToConsole =
        wasm.installFunction('i(ippp)', function(t,c,p,x){
          if(capi.SQLITE_TRACE_STMT===t){
            // x == SQL, p == sqlite3_stmt*
            console.log("SQL TRACE #"+(++this.counter)+' via sqlite3@'+c+':',
                        wasm.cstrToJs(x));
          }
        }.bind({counter: 0}));

  /**
     A map of sqlite3_vfs pointers to SQL code or a callback function
     to run when the DB constructor opens a database with the given
     VFS. In the latter case, the call signature is (theDbObject,sqlite3Namespace)
     and the callback is expected to throw on error.
  */
  const __vfsPostOpenSql = Object.create(null);

  /**
     A proxy for DB class constructors. It must be called with the
     being-construct DB object as its "this". See the DB constructor
     for the argument docs. This is split into a separate function
     in order to enable simple creation of special-case DB constructors,
     e.g. JsStorageDb and OpfsDb.

     Expects to be passed a configuration object with the following
     properties:

     - `.filename`: the db filename. It may be a special name like ":memory:"
       or "".

     - `.flags`: as documented in the DB constructor.

     - `.vfs`: as documented in the DB constructor.

     It also accepts those as the first 3 arguments.
  */
  const dbCtorHelper = function ctor(...args){
    if(!ctor._name2vfs){
      /**
         Map special filenames which we handle here (instead of in C)
         to some helpful metadata...

         As of 2022-09-20, the C API supports the names :localStorage:
         and :sessionStorage: for kvvfs. However, C code cannot
         determine (without embedded JS code, e.g. via Emscripten's
         EM_JS()) whether the kvvfs is legal in the current browser
         context (namely the main UI thread). In order to help client
         code fail early on, instead of it being delayed until they
         try to read or write a kvvfs-backed db, we'll check for those
         names here and throw if they're not legal in the current
         context.
      */
      ctor._name2vfs = Object.create(null);
      const isWorkerThread = ('function'===typeof importScripts/*===running in worker thread*/)
            ? (n)=>toss3("The VFS for",n,"is only available in the main window thread.")
            : false;
      ctor._name2vfs[':localStorage:'] = {
        vfs: 'kvvfs', filename: isWorkerThread || (()=>'local')
      };
      ctor._name2vfs[':sessionStorage:'] = {
        vfs: 'kvvfs', filename: isWorkerThread || (()=>'session')
      };
    }
    const opt = ctor.normalizeArgs(...args);
    let fn = opt.filename, vfsName = opt.vfs, flagsStr = opt.flags;
    if(('string'!==typeof fn && 'number'!==typeof fn)
       || 'string'!==typeof flagsStr
       || (vfsName && ('string'!==typeof vfsName && 'number'!==typeof vfsName))){
      sqlite3.config.error("Invalid DB ctor args",opt,arguments);
      toss3("Invalid arguments for DB constructor.");
    }
    let fnJs = ('number'===typeof fn) ? wasm.cstrToJs(fn) : fn;
    const vfsCheck = ctor._name2vfs[fnJs];
    if(vfsCheck){
      vfsName = vfsCheck.vfs;
      fn = fnJs = vfsCheck.filename(fnJs);
    }
    let pDb, oflags = 0;
    if( flagsStr.indexOf('c')>=0 ){
      oflags |= capi.SQLITE_OPEN_CREATE | capi.SQLITE_OPEN_READWRITE;
    }
    if( flagsStr.indexOf('w')>=0 ) oflags |= capi.SQLITE_OPEN_READWRITE;
    if( 0===oflags ) oflags |= capi.SQLITE_OPEN_READONLY;
    oflags |= capi.SQLITE_OPEN_EXRESCODE;
    const stack = wasm.pstack.pointer;
    try {
      const pPtr = wasm.pstack.allocPtr() /* output (sqlite3**) arg */;
      let rc = capi.sqlite3_open_v2(fn, pPtr, oflags, vfsName || 0);
      pDb = wasm.peekPtr(pPtr);
      checkSqlite3Rc(pDb, rc);
      capi.sqlite3_extended_result_codes(pDb, 1);
      if(flagsStr.indexOf('t')>=0){
        capi.sqlite3_trace_v2(pDb, capi.SQLITE_TRACE_STMT,
                              __dbTraceToConsole, pDb);
      }
    }catch( e ){
      if( pDb ) capi.sqlite3_close_v2(pDb);
      throw e;
    }finally{
      wasm.pstack.restore(stack);
    }
    this.filename = fnJs;
    __ptrMap.set(this, pDb);
    __stmtMap.set(this, Object.create(null));
    try{
      // Check for per-VFS post-open SQL/callback...
      const pVfs = capi.sqlite3_js_db_vfs(pDb);
      if(!pVfs) toss3("Internal error: cannot get VFS for new db handle.");
      const postInitSql = __vfsPostOpenSql[pVfs];
      if(postInitSql instanceof Function){
        postInitSql(this, sqlite3);
      }else if(postInitSql){
        checkSqlite3Rc(
          pDb, capi.sqlite3_exec(pDb, postInitSql, 0, 0, 0)
        );
      }
    }catch(e){
      this.close();
      throw e;
    }
  };

  /**
     Sets SQL which should be exec()'d on a DB instance after it is
     opened with the given VFS pointer. The SQL may be any type
     supported by the "string:flexible" function argument conversion.
     Alternately, the 2nd argument may be a function, in which case it
     is called with (theOo1DbObject,sqlite3Namespace) at the end of
     the DB() constructor. The function must throw on error, in which
     case the db is closed and the exception is propagated.  This
     function is intended only for use by DB subclasses or sqlite3_vfs
     implementations.
  */
  dbCtorHelper.setVfsPostOpenSql = function(pVfs, sql){
    __vfsPostOpenSql[pVfs] = sql;
  };

  /**
     A helper for DB constructors. It accepts either a single
     config-style object or up to 3 arguments (filename, dbOpenFlags,
     dbVfsName). It returns a new object containing:

     { filename: ..., flags: ..., vfs: ... }

     If passed an object, any additional properties it has are copied
     as-is into the new object.
  */
  dbCtorHelper.normalizeArgs = function(filename=':memory:',flags = 'c',vfs = null){
    const arg = {};
    if(1===arguments.length && arguments[0] && 'object'===typeof arguments[0]){
      Object.assign(arg, arguments[0]);
      if(undefined===arg.flags) arg.flags = 'c';
      if(undefined===arg.vfs) arg.vfs = null;
      if(undefined===arg.filename) arg.filename = ':memory:';
    }else{
      arg.filename = filename;
      arg.flags = flags;
      arg.vfs = vfs;
    }
    return arg;
  };
  /**
     The DB class provides a high-level OO wrapper around an sqlite3
     db handle.

     The given db filename must be resolvable using whatever
     filesystem layer (virtual or otherwise) is set up for the default
     sqlite3 VFS.

     Note that the special sqlite3 db names ":memory:" and ""
     (temporary db) have their normal special meanings here and need
     not resolve to real filenames, but "" uses an on-storage
     temporary database and requires that the VFS support that.

     The second argument specifies the open/create mode for the
     database. It must be string containing a sequence of letters (in
     any order, but case sensitive) specifying the mode:

     - "c": create if it does not exist, else fail if it does not
       exist. Implies the "w" flag.

     - "w": write. Implies "r": a db cannot be write-only.

     - "r": read-only if neither "w" nor "c" are provided, else it
       is ignored.

     - "t": enable tracing of SQL executed on this database handle,
       sending it to `console.log()`. To disable it later, call
       `sqlite3.capi.sqlite3_trace_v2(thisDb.pointer, 0, 0, 0)`.

     If "w" is not provided, the db is implicitly read-only, noting
     that "rc" is meaningless

     Any other letters are currently ignored. The default is
     "c". These modes are ignored for the special ":memory:" and ""
     names and _may_ be ignored altogether for certain VFSes.

     The final argument is analogous to the final argument of
     sqlite3_open_v2(): the name of an sqlite3 VFS. Pass a falsy value,
     or none at all, to use the default. If passed a value, it must
     be the string name of a VFS.

     The constructor optionally (and preferably) takes its arguments
     in the form of a single configuration object with the following
     properties:

     - `filename`: database file name
     - `flags`: open-mode flags
     - `vfs`: the VFS fname

     The `filename` and `vfs` arguments may be either JS strings or
     C-strings allocated via WASM. `flags` is required to be a JS
     string (because it's specific to this API, which is specific
     to JS).

     For purposes of passing a DB instance to C-style sqlite3
     functions, the DB object's read-only `pointer` property holds its
     `sqlite3*` pointer value. That property can also be used to check
     whether this DB instance is still open.

     In the main window thread, the filenames `":localStorage:"` and
     `":sessionStorage:"` are special: they cause the db to use either
     localStorage or sessionStorage for storing the database using
     the kvvfs. If one of these names are used, they trump
     any vfs name set in the arguments.
  */
  const DB = function(...args){
    dbCtorHelper.apply(this, args);
  };
  DB.dbCtorHelper = dbCtorHelper;

  /**
     Internal-use enum for mapping JS types to DB-bindable types.
     These do not (and need not) line up with the SQLITE_type
     values. All values in this enum must be truthy and distinct
     but they need not be numbers.
  */
  const BindTypes = {
    null: 1,
    number: 2,
    string: 3,
    boolean: 4,
    blob: 5
  };
  BindTypes['undefined'] == BindTypes.null;
  if(wasm.bigIntEnabled){
    BindTypes.bigint = BindTypes.number;
  }

  /**
     This class wraps sqlite3_stmt. Calling this constructor
     directly will trigger an exception. Use DB.prepare() to create
     new instances.

     For purposes of passing a Stmt instance to C-style sqlite3
     functions, its read-only `pointer` property holds its `sqlite3_stmt*`
     pointer value.

     Other non-function properties include:

     - `db`: the DB object which created the statement.

     - `columnCount`: the number of result columns in the query, or 0
     for queries which cannot return results. This property is a proxy
     for sqlite3_column_count() and its use in loops should be avoided
     because of the call overhead associated with that. The
     `columnCount` is not cached when the Stmt is created because a
     schema change made via a separate db connection between this
     statement's preparation and when it is stepped may invalidate it.

     - `parameterCount`: the number of bindable parameters in the query.
  */
  const Stmt = function(){
    if(BindTypes!==arguments[2]){
      toss3(capi.SQLITE_MISUSE, "Do not call the Stmt constructor directly. Use DB.prepare().");
    }
    this.db = arguments[0];
    __ptrMap.set(this, arguments[1]);
    this.parameterCount = capi.sqlite3_bind_parameter_count(this.pointer);
  };

  /** Throws if the given DB has been closed, else it is returned. */
  const affirmDbOpen = function(db){
    if(!db.pointer) toss3("DB has been closed.");
    return db;
  };

  /** Throws if ndx is not an integer or if it is out of range
      for stmt.columnCount, else returns stmt.

      Reminder: this will also fail after the statement is finalized
      but the resulting error will be about an out-of-bounds column
      index rather than a statement-is-finalized error.
  */
  const affirmColIndex = function(stmt,ndx){
    if((ndx !== (ndx|0)) || ndx<0 || ndx>=stmt.columnCount){
      toss3("Column index",ndx,"is out of range.");
    }
    return stmt;
  };

  /**
     Expects to be passed the `arguments` object from DB.exec(). Does
     the argument processing/validation, throws on error, and returns
     a new object on success:

     { sql: the SQL, opt: optionsObj, cbArg: function}

     The opt object is a normalized copy of any passed to this
     function. The sql will be converted to a string if it is provided
     in one of the supported non-string formats.

     cbArg is only set if the opt.callback or opt.resultRows are set,
     in which case it's a function which expects to be passed the
     current Stmt and returns the callback argument of the type
     indicated by the input arguments.
  */
  const parseExecArgs = function(db, args){
    const out = Object.create(null);
    out.opt = Object.create(null);
    switch(args.length){
        case 1:
          if('string'===typeof args[0] || util.isSQLableTypedArray(args[0])){
            out.sql = args[0];
          }else if(Array.isArray(args[0])){
            out.sql = args[0];
          }else if(args[0] && 'object'===typeof args[0]){
            out.opt = args[0];
            out.sql = out.opt.sql;
          }
          break;
        case 2:
          out.sql = args[0];
          out.opt = args[1];
          break;
        default: toss3("Invalid argument count for exec().");
    };
    out.sql = util.flexibleString(out.sql);
    if('string'!==typeof out.sql){
      toss3("Missing SQL argument or unsupported SQL value type.");
    }
    const opt = out.opt;
    switch(opt.returnValue){
        case 'resultRows':
          if(!opt.resultRows) opt.resultRows = [];
          out.returnVal = ()=>opt.resultRows;
          break;
        case 'saveSql':
          if(!opt.saveSql) opt.saveSql = [];
          out.returnVal = ()=>opt.saveSql;
          break;
        case undefined:
        case 'this':
          out.returnVal = ()=>db;
          break;
        default:
          toss3("Invalid returnValue value:",opt.returnValue);
    }
    if(!opt.callback && !opt.returnValue && undefined!==opt.rowMode){
      if(!opt.resultRows) opt.resultRows = [];
      out.returnVal = ()=>opt.resultRows;
    }
    if(opt.callback || opt.resultRows){
      switch((undefined===opt.rowMode)
             ? 'array' : opt.rowMode) {
          case 'object': out.cbArg = (stmt)=>stmt.get(Object.create(null)); break;
          case 'array': out.cbArg = (stmt)=>stmt.get([]); break;
          case 'stmt':
            if(Array.isArray(opt.resultRows)){
              toss3("exec(): invalid rowMode for a resultRows array: must",
                    "be one of 'array', 'object',",
                    "a result column number, or column name reference.");
            }
            out.cbArg = (stmt)=>stmt;
            break;
          default:
            if(util.isInt32(opt.rowMode)){
              out.cbArg = (stmt)=>stmt.get(opt.rowMode);
              break;
            }else if('string'===typeof opt.rowMode
                     && opt.rowMode.length>1
                     && '$'===opt.rowMode[0]){
              /* "$X": fetch column named "X" (case-sensitive!). Prior
                 to 2022-12-14 ":X" and "@X" were also permitted, but
                 having so many options is unnecessary and likely to
                 cause confusion. */
              const $colName = opt.rowMode.substr(1);
              out.cbArg = (stmt)=>{
                const rc = stmt.get(Object.create(null))[$colName];
                return (undefined===rc)
                  ? toss3(capi.SQLITE_NOTFOUND,
                          "exec(): unknown result column:",$colName)
                  : rc;
              };
              break;
            }
            toss3("Invalid rowMode:",opt.rowMode);
      }
    }
    return out;
  };

  /**
     Internal impl of the DB.selectValue(), selectArray(), and
     selectObject() methods.
  */
  const __selectFirstRow = (db, sql, bind, ...getArgs)=>{
    const stmt = db.prepare(sql);
    try {
      const rc = stmt.bind(bind).step() ? stmt.get(...getArgs) : undefined;
      stmt.reset(/*for INSERT...RETURNING locking case*/);
      return rc;
    }finally{
      stmt.finalize();
    }
  };

  /**
     Internal impl of the DB.selectArrays() and selectObjects()
     methods.
  */
  const __selectAll =
        (db, sql, bind, rowMode)=>db.exec({
          sql, bind, rowMode, returnValue: 'resultRows'
        });

  /**
     Expects to be given a DB instance or an `sqlite3*` pointer (may
     be null) and an sqlite3 API result code. If the result code is
     not falsy, this function throws an SQLite3Error with an error
     message from sqlite3_errmsg(), using db (or, if db is-a DB,
     db.pointer) as the db handle, or sqlite3_errstr() if db is
     falsy. Note that if it's passed a non-error code like SQLITE_ROW
     or SQLITE_DONE, it will still throw but the error string might be
     "Not an error."  The various non-0 non-error codes need to be
     checked for in client code where they are expected.

     The thrown exception's `resultCode` property will be the value of
     the second argument to this function.

     If it does not throw, it returns its first argument.
  */
  DB.checkRc = (db,resultCode)=>checkSqlite3Rc(db,resultCode);

  DB.prototype = {
    /** Returns true if this db handle is open, else false. */
    isOpen: function(){
      return !!this.pointer;
    },
    /** Throws if this given DB has been closed, else returns `this`. */
    affirmOpen: function(){
      return affirmDbOpen(this);
    },
    /**
       Finalizes all open statements and closes this database
       connection. This is a no-op if the db has already been
       closed. After calling close(), `this.pointer` will resolve to
       `undefined`, so that can be used to check whether the db
       instance is still opened.

       If this.onclose.before is a function then it is called before
       any close-related cleanup.

       If this.onclose.after is a function then it is called after the
       db is closed but before auxiliary state like this.filename is
       cleared.

       Both onclose handlers are passed this object, with the onclose
       object as their "this," noting that the db will have been
       closed when onclose.after is called. If this db is not opened
       when close() is called, neither of the handlers are called. Any
       exceptions the handlers throw are ignored because "destructors
       must not throw."

       Note that garbage collection of a db handle, if it happens at
       all, will never trigger close(), so onclose handlers are not a
       reliable way to implement close-time cleanup or maintenance of
       a db.
    */
    close: function(){
      if(this.pointer){
        if(this.onclose && (this.onclose.before instanceof Function)){
          try{this.onclose.before(this)}
          catch(e){/*ignore*/}
        }
        const pDb = this.pointer;
        Object.keys(__stmtMap.get(this)).forEach((k,s)=>{
          if(s && s.pointer){
            try{s.finalize()}
            catch(e){/*ignore*/}
          }
        });
        __ptrMap.delete(this);
        __stmtMap.delete(this);
        capi.sqlite3_close_v2(pDb);
        if(this.onclose && (this.onclose.after instanceof Function)){
          try{this.onclose.after(this)}
          catch(e){/*ignore*/}
        }
        delete this.filename;
      }
    },
    /**
       Returns the number of changes, as per sqlite3_changes()
       (if the first argument is false) or sqlite3_total_changes()
       (if it's true). If the 2nd argument is true, it uses
       sqlite3_changes64() or sqlite3_total_changes64(), which
       will trigger an exception if this build does not have
       BigInt support enabled.
    */
    changes: function(total=false,sixtyFour=false){
      const p = affirmDbOpen(this).pointer;
      if(total){
        return sixtyFour
          ? capi.sqlite3_total_changes64(p)
          : capi.sqlite3_total_changes(p);
      }else{
        return sixtyFour
          ? capi.sqlite3_changes64(p)
          : capi.sqlite3_changes(p);
      }
    },
    /**
       Similar to the this.filename but returns the
       sqlite3_db_filename() value for the given database name,
       defaulting to "main".  The argument may be either a JS string
       or a pointer to a WASM-allocated C-string.
    */
    dbFilename: function(dbName='main'){
      return capi.sqlite3_db_filename(affirmDbOpen(this).pointer, dbName);
    },
    /**
       Returns the name of the given 0-based db number, as documented
       for sqlite3_db_name().
    */
    dbName: function(dbNumber=0){
      return capi.sqlite3_db_name(affirmDbOpen(this).pointer, dbNumber);
    },
    /**
       Returns the name of the sqlite3_vfs used by the given database
       of this connection (defaulting to 'main'). The argument may be
       either a JS string or a WASM C-string. Returns undefined if the
       given db name is invalid. Throws if this object has been
       close()d.
    */
    dbVfsName: function(dbName=0){
      let rc;
      const pVfs = capi.sqlite3_js_db_vfs(
        affirmDbOpen(this).pointer, dbName
      );
      if(pVfs){
        const v = new capi.sqlite3_vfs(pVfs);
        try{ rc = wasm.cstrToJs(v.$zName) }
        finally { v.dispose() }
      }
      return rc;
    },
    /**
       Compiles the given SQL and returns a prepared Stmt. This is
       the only way to create new Stmt objects. Throws on error.

       The given SQL must be a string, a Uint8Array holding SQL, a
       WASM pointer to memory holding the NUL-terminated SQL string,
       or an array of strings. In the latter case, the array is
       concatenated together, with no separators, to form the SQL
       string (arrays are often a convenient way to formulate long
       statements).  If the SQL contains no statements, an
       SQLite3Error is thrown.

       Design note: the C API permits empty SQL, reporting it as a 0
       result code and a NULL stmt pointer. Supporting that case here
       would cause extra work for all clients: any use of the Stmt API
       on such a statement will necessarily throw, so clients would be
       required to check `stmt.pointer` after calling `prepare()` in
       order to determine whether the Stmt instance is empty or not.
       Long-time practice (with other sqlite3 script bindings)
       suggests that the empty-prepare case is sufficiently rare that
       supporting it here would simply hurt overall usability.
    */
    prepare: function(sql){
      affirmDbOpen(this);
      const stack = wasm.pstack.pointer;
      let ppStmt, pStmt;
      try{
        ppStmt = wasm.pstack.alloc(8)/* output (sqlite3_stmt**) arg */;
        DB.checkRc(this, capi.sqlite3_prepare_v2(this.pointer, sql, -1, ppStmt, null));
        pStmt = wasm.peekPtr(ppStmt);
      }
      finally {
        wasm.pstack.restore(stack);
      }
      if(!pStmt) toss3("Cannot prepare empty SQL.");
      const stmt = new Stmt(this, pStmt, BindTypes);
      __stmtMap.get(this)[pStmt] = stmt;
      return stmt;
    },
    /**
       Executes one or more SQL statements in the form of a single
       string. Its arguments must be either (sql,optionsObject) or
       (optionsObject). In the latter case, optionsObject.sql must
       contain the SQL to execute. By default it returns this object
       but that can be changed via the `returnValue` option as
       described below. Throws on error.

       If no SQL is provided, or a non-string is provided, an
       exception is triggered. Empty SQL, on the other hand, is
       simply a no-op.

       The optional options object may contain any of the following
       properties:

       - `sql` = the SQL to run (unless it's provided as the first
       argument). This must be of type string, Uint8Array, or an array
       of strings. In the latter case they're concatenated together
       as-is, _with no separator_ between elements, before evaluation.
       The array form is often simpler for long hand-written queries.

       - `bind` = a single value valid as an argument for
       Stmt.bind(). This is _only_ applied to the _first_ non-empty
       statement in the SQL which has any bindable parameters. (Empty
       statements are skipped entirely.)

       - `saveSql` = an optional array. If set, the SQL of each
       executed statement is appended to this array before the
       statement is executed (but after it is prepared - we don't have
       the string until after that). Empty SQL statements are elided
       but can have odd effects in the output. e.g. SQL of: `"select
       1; -- empty\n; select 2"` will result in an array containing
       `["select 1;", "--empty \n; select 2"]`. That's simply how
       sqlite3 records the SQL for the 2nd statement.

       ==================================================================
       The following options apply _only_ to the _first_ statement
       which has a non-zero result column count, regardless of whether
       the statement actually produces any result rows.
       ==================================================================

       - `columnNames`: if this is an array, the column names of the
       result set are stored in this array before the callback (if
       any) is triggered (regardless of whether the query produces any
       result rows). If no statement has result columns, this value is
       unchanged. Achtung: an SQL result may have multiple columns
       with identical names.

       - `callback` = a function which gets called for each row of the
       result set, but only if that statement has any result rows. The
       callback's "this" is the options object, noting that this
       function synthesizes one if the caller does not pass one to
       exec(). The second argument passed to the callback is always
       the current Stmt object, as it's needed if the caller wants to
       fetch the column names or some such (noting that they could
       also be fetched via `this.columnNames`, if the client provides
       the `columnNames` option). If the callback returns a literal
       `false` (as opposed to any other falsy value, e.g. an implicit
       `undefined` return), any ongoing statement-`step()` iteration
       stops without an error. The return value of the callback is
       otherwise ignored.

       ACHTUNG: The callback MUST NOT modify the Stmt object. Calling
       any of the Stmt.get() variants, Stmt.getColumnName(), or
       similar, is legal, but calling step() or finalize() is
       not. Member methods which are illegal in this context will
       trigger an exception, but clients must also refrain from using
       any lower-level (C-style) APIs which might modify the
       statement.

       The first argument passed to the callback defaults to an array of
       values from the current result row but may be changed with ...

       - `rowMode` = specifies the type of he callback's first argument.
       It may be any of...

       A) A string describing what type of argument should be passed
       as the first argument to the callback:

         A.1) `'array'` (the default) causes the results of
         `stmt.get([])` to be passed to the `callback` and/or appended
         to `resultRows`.

         A.2) `'object'` causes the results of
         `stmt.get(Object.create(null))` to be passed to the
         `callback` and/or appended to `resultRows`.  Achtung: an SQL
         result may have multiple columns with identical names. In
         that case, the right-most column will be the one set in this
         object!

         A.3) `'stmt'` causes the current Stmt to be passed to the
         callback, but this mode will trigger an exception if
         `resultRows` is an array because appending the transient
         statement to the array would be downright unhelpful.

       B) An integer, indicating a zero-based column in the result
       row. Only that one single value will be passed on.

       C) A string with a minimum length of 2 and leading character of
       '$' will fetch the row as an object, extract that one field,
       and pass that field's value to the callback. Note that these
       keys are case-sensitive so must match the case used in the
       SQL. e.g. `"select a A from t"` with a `rowMode` of `'$A'`
       would work but `'$a'` would not. A reference to a column not in
       the result set will trigger an exception on the first row (as
       the check is not performed until rows are fetched).  Note also
       that `$` is a legal identifier character in JS so need not be
       quoted.

       Any other `rowMode` value triggers an exception.

       - `resultRows`: if this is an array, it functions similarly to
       the `callback` option: each row of the result set (if any),
       with the exception that the `rowMode` 'stmt' is not legal. It
       is legal to use both `resultRows` and `callback`, but
       `resultRows` is likely much simpler to use for small data sets
       and can be used over a WebWorker-style message interface.
       exec() throws if `resultRows` is set and `rowMode` is 'stmt'.

       - `returnValue`: is a string specifying what this function
       should return:

         A) The default value is (usually) `"this"`, meaning that the
            DB object itself should be returned. The exception is if
            the caller passes neither of `callback` nor `returnValue`
            but does pass an explicit `rowMode` then the default
            `returnValue` is `"resultRows"`, described below.

         B) `"resultRows"` means to return the value of the
            `resultRows` option. If `resultRows` is not set, this
            function behaves as if it were set to an empty array.

         C) `"saveSql"` means to return the value of the
            `saveSql` option. If `saveSql` is not set, this
            function behaves as if it were set to an empty array.

       Potential TODOs:

       - `bind`: permit an array of arrays/objects to bind. The first
       sub-array would act on the first statement which has bindable
       parameters (as it does now). The 2nd would act on the next such
       statement, etc.

       - `callback` and `resultRows`: permit an array entries with
       semantics similar to those described for `bind` above.

    */
    exec: function(/*(sql [,obj]) || (obj)*/){
      affirmDbOpen(this);
      const arg = parseExecArgs(this, arguments);
      if(!arg.sql){
        return toss3("exec() requires an SQL string.");
      }
      const opt = arg.opt;
      const callback = opt.callback;
      const resultRows =
            Array.isArray(opt.resultRows) ? opt.resultRows : undefined;
      let stmt;
      let bind = opt.bind;
      let evalFirstResult = !!(
        arg.cbArg || opt.columnNames || resultRows
      ) /* true to step through the first result-returning statement */;
      const stack = wasm.scopedAllocPush();
      const saveSql = Array.isArray(opt.saveSql) ? opt.saveSql : undefined;
      try{
        const isTA = util.isSQLableTypedArray(arg.sql)
        /* Optimization: if the SQL is a TypedArray we can save some string
           conversion costs. */;
        /* Allocate the two output pointers (ppStmt, pzTail) and heap
           space for the SQL (pSql). When prepare_v2() returns, pzTail
           will point to somewhere in pSql. */
        let sqlByteLen = isTA ? arg.sql.byteLength : wasm.jstrlen(arg.sql);
        const ppStmt  = wasm.scopedAlloc(
          /* output (sqlite3_stmt**) arg and pzTail */
          (2 * wasm.ptrSizeof) + (sqlByteLen + 1/* SQL + NUL */)
        );
        const pzTail = ppStmt + wasm.ptrSizeof /* final arg to sqlite3_prepare_v2() */;
        let pSql = pzTail + wasm.ptrSizeof;
        const pSqlEnd = pSql + sqlByteLen;
        if(isTA) wasm.heap8().set(arg.sql, pSql);
        else wasm.jstrcpy(arg.sql, wasm.heap8(), pSql, sqlByteLen, false);
        wasm.poke(pSql + sqlByteLen, 0/*NUL terminator*/);
        while(pSql && wasm.peek(pSql, 'i8')
              /* Maintenance reminder:^^^ _must_ be 'i8' or else we
                 will very likely cause an endless loop. What that's
                 doing is checking for a terminating NUL byte. If we
                 use i32 or similar then we read 4 bytes, read stuff
                 around the NUL terminator, and get stuck in and
                 endless loop at the end of the SQL, endlessly
                 re-preparing an empty statement. */ ){
          wasm.pokePtr([ppStmt, pzTail], 0);
          DB.checkRc(this, capi.sqlite3_prepare_v3(
            this.pointer, pSql, sqlByteLen, 0, ppStmt, pzTail
          ));
          const pStmt = wasm.peekPtr(ppStmt);
          pSql = wasm.peekPtr(pzTail);
          sqlByteLen = pSqlEnd - pSql;
          if(!pStmt) continue;
          if(saveSql) saveSql.push(capi.sqlite3_sql(pStmt).trim());
          stmt = new Stmt(this, pStmt, BindTypes);
          if(bind && stmt.parameterCount){
            stmt.bind(bind);
            bind = null;
          }
          if(evalFirstResult && stmt.columnCount){
            /* Only forward SELECT-style results for the FIRST query
               in the SQL which potentially has them. */
            let gotColNames = Array.isArray(
              opt.columnNames
              /* As reported in
                 https://sqlite.org/forum/forumpost/7774b773937cbe0a
                 we need to delay fetching of the column names until
                 after the first step() (if we step() at all) because
                 a schema change between the prepare() and step(), via
                 another connection, may invalidate the column count
                 and names. */) ? 0 : 1;
            evalFirstResult = false;
            if(arg.cbArg || resultRows){
              for(; stmt.step(); stmt._lockedByExec = false){
                if(0===gotColNames++) stmt.getColumnNames(opt.columnNames);
                stmt._lockedByExec = true;
                const row = arg.cbArg(stmt);
                if(resultRows) resultRows.push(row);
                if(callback && false === callback.call(opt, row, stmt)){
                  break;
                }
              }
              stmt._lockedByExec = false;
            }
            if(0===gotColNames){
              /* opt.columnNames was provided but we visited no result rows */
              stmt.getColumnNames(opt.columnNames);
            }
          }else{
            stmt.step();
          }
          stmt.reset(
            /* In order to trigger an exception in the
               INSERT...RETURNING locking scenario:
               https://sqlite.org/forum/forumpost/36f7a2e7494897df
            */).finalize();
          stmt = null;
        }/*prepare() loop*/
      }/*catch(e){
        sqlite3.config.warn("DB.exec() is propagating exception",opt,e);
        throw e;
      }*/finally{
        wasm.scopedAllocPop(stack);
        if(stmt){
          delete stmt._lockedByExec;
          stmt.finalize();
        }
      }
      return arg.returnVal();
    }/*exec()*/,

    /**
       Creates a new UDF (User-Defined Function) which is accessible
       via SQL code. This function may be called in any of the
       following forms:

       - (name, function)
       - (name, function, optionsObject)
       - (name, optionsObject)
       - (optionsObject)

       In the final two cases, the function must be defined as the
       `callback` property of the options object (optionally called
       `xFunc` to align with the C API documentation). In the final
       case, the function's name must be the 'name' property.

       The first two call forms can only be used for creating scalar
       functions. Creating an aggregate or window function requires
       the options-object form (see below for details).

       UDFs can be removed as documented for
       sqlite3_create_function_v2() and
       sqlite3_create_window_function(), but doing so will "leak" the
       JS-created WASM binding of those functions (meaning that their
       entries in the WASM indirect function table still
       exist). Eliminating that potential leak is a pending TODO.

       On success, returns this object. Throws on error.

       When called from SQL arguments to the UDF, and its result,
       will be converted between JS and SQL with as much fidelity as
       is feasible, triggering an exception if a type conversion
       cannot be determined. The docs for sqlite3_create_function_v2()
       describe the conversions in more detail.

       The values set in the options object differ for scalar and
       aggregate functions:

       - Scalar: set the `xFunc` function-type property to the UDF
         function.

       - Aggregate: set the `xStep` and `xFinal` function-type
         properties to the "step" and "final" callbacks for the
         aggregate. Do not set the `xFunc` property.

       - Window: set the `xStep`, `xFinal`, `xValue`, and `xInverse`
         function-type properties. Do not set the `xFunc` property.

       The options object may optionally have an `xDestroy`
       function-type property, as per sqlite3_create_function_v2().
       Its argument will be the WASM-pointer-type value of the `pApp`
       property, and this function will throw if `pApp` is defined but
       is not null, undefined, or a numeric (WASM pointer)
       value. i.e. `pApp`, if set, must be value suitable for use as a
       WASM pointer argument, noting that `null` or `undefined` will
       translate to 0 for that purpose.

       The options object may contain flags to modify how
       the function is defined:

       - `arity`: the number of arguments which SQL calls to this
       function expect or require. The default value is `xFunc.length`
       or `xStep.length` (i.e. the number of declared parameters it
       has) **MINUS 1** (see below for why). As a special case, if the
       `length` is 0, its arity is also 0 instead of -1. A negative
       arity value means that the function is variadic and may accept
       any number of arguments, up to sqlite3's compile-time
       limits. sqlite3 will enforce the argument count if is zero or
       greater. The callback always receives a pointer to an
       `sqlite3_context` object as its first argument. Any arguments
       after that are from SQL code. The leading context argument does
       _not_ count towards the function's arity. See the docs for
       sqlite3.capi.sqlite3_create_function_v2() for why that argument
       is needed in the interface.

       The following options-object properties correspond to flags
       documented at:

       https://sqlite.org/c3ref/create_function.html

       - `deterministic` = sqlite3.capi.SQLITE_DETERMINISTIC
       - `directOnly` = sqlite3.capi.SQLITE_DIRECTONLY
       - `innocuous` = sqlite3.capi.SQLITE_INNOCUOUS

       Sidebar: the ability to add new WASM-accessible functions to
       the runtime requires that the WASM build is compiled with the
       equivalent functionality as that provided by Emscripten's
       `-sALLOW_TABLE_GROWTH` flag.
    */
    createFunction: function f(name, xFunc, opt){
      const isFunc = (f)=>(f instanceof Function);
      switch(arguments.length){
          case 1: /* (optionsObject) */
            opt = name;
            name = opt.name;
            xFunc = opt.xFunc || 0;
            break;
          case 2: /* (name, callback|optionsObject) */
            if(!isFunc(xFunc)){
              opt = xFunc;
              xFunc = opt.xFunc || 0;
            }
            break;
          case 3: /* name, xFunc, opt */
            break;
          default: break;
      }
      if(!opt) opt = {};
      if('string' !== typeof name){
        toss3("Invalid arguments: missing function name.");
      }
      let xStep = opt.xStep || 0;
      let xFinal = opt.xFinal || 0;
      const xValue = opt.xValue || 0;
      const xInverse = opt.xInverse || 0;
      let isWindow = undefined;
      if(isFunc(xFunc)){
        isWindow = false;
        if(isFunc(xStep) || isFunc(xFinal)){
          toss3("Ambiguous arguments: scalar or aggregate?");
        }
        xStep = xFinal = null;
      }else if(isFunc(xStep)){
        if(!isFunc(xFinal)){
          toss3("Missing xFinal() callback for aggregate or window UDF.");
        }
        xFunc = null;
      }else if(isFunc(xFinal)){
        toss3("Missing xStep() callback for aggregate or window UDF.");
      }else{
        toss3("Missing function-type properties.");
      }
      if(false === isWindow){
        if(isFunc(xValue) || isFunc(xInverse)){
          toss3("xValue and xInverse are not permitted for non-window UDFs.");
        }
      }else if(isFunc(xValue)){
        if(!isFunc(xInverse)){
          toss3("xInverse must be provided if xValue is.");
        }
        isWindow = true;
      }else if(isFunc(xInverse)){
        toss3("xValue must be provided if xInverse is.");
      }
      const pApp = opt.pApp;
      if(undefined!==pApp &&
         null!==pApp &&
         (('number'!==typeof pApp) || !util.isInt32(pApp))){
        toss3("Invalid value for pApp property. Must be a legal WASM pointer value.");
      }
      const xDestroy = opt.xDestroy || 0;
      if(xDestroy && !isFunc(xDestroy)){
        toss3("xDestroy property must be a function.");
      }
      let fFlags = 0 /*flags for sqlite3_create_function_v2()*/;
      if(getOwnOption(opt, 'deterministic')) fFlags |= capi.SQLITE_DETERMINISTIC;
      if(getOwnOption(opt, 'directOnly')) fFlags |= capi.SQLITE_DIRECTONLY;
      if(getOwnOption(opt, 'innocuous')) fFlags |= capi.SQLITE_INNOCUOUS;
      name = name.toLowerCase();
      const xArity = xFunc || xStep;
      const arity = getOwnOption(opt, 'arity');
      const arityArg = ('number'===typeof arity
                        ? arity
                        : (xArity.length ? xArity.length-1/*for pCtx arg*/ : 0));
      let rc;
      if( isWindow ){
        rc = capi.sqlite3_create_window_function(
          this.pointer, name, arityArg,
          capi.SQLITE_UTF8 | fFlags, pApp || 0,
          xStep, xFinal, xValue, xInverse, xDestroy);
      }else{
        rc = capi.sqlite3_create_function_v2(
          this.pointer, name, arityArg,
          capi.SQLITE_UTF8 | fFlags, pApp || 0,
          xFunc, xStep, xFinal, xDestroy);
      }
      DB.checkRc(this, rc);
      return this;
    }/*createFunction()*/,
    /**
       Prepares the given SQL, step()s it one time, and returns
       the value of the first result column. If it has no results,
       undefined is returned.

       If passed a second argument, it is treated like an argument
       to Stmt.bind(), so may be any type supported by that
       function. Passing the undefined value is the same as passing
       no value, which is useful when...

       If passed a 3rd argument, it is expected to be one of the
       SQLITE_{typename} constants. Passing the undefined value is
       the same as not passing a value.

       Throws on error (e.g. malformed SQL).
    */
    selectValue: function(sql,bind,asType){
      return __selectFirstRow(this, sql, bind, 0, asType);
    },

    /**
       Runs the given query and returns an array of the values from
       the first result column of each row of the result set. The 2nd
       argument is an optional value for use in a single-argument call
       to Stmt.bind(). The 3rd argument may be any value suitable for
       use as the 2nd argument to Stmt.get(). If a 3rd argument is
       desired but no bind data are needed, pass `undefined` for the 2nd
       argument.

       If there are no result rows, an empty array is returned.
    */
    selectValues: function(sql,bind,asType){
      const stmt = this.prepare(sql), rc = [];
      try {
        stmt.bind(bind);
        while(stmt.step()) rc.push(stmt.get(0,asType));
        stmt.reset(/*for INSERT...RETURNING locking case*/);
      }finally{
        stmt.finalize();
      }
      return rc;
    },

    /**
       Prepares the given SQL, step()s it one time, and returns an
       array containing the values of the first result row. If it has
       no results, `undefined` is returned.

       If passed a second argument other than `undefined`, it is
       treated like an argument to Stmt.bind(), so may be any type
       supported by that function.

       Throws on error (e.g. malformed SQL).
    */
    selectArray: function(sql,bind){
      return __selectFirstRow(this, sql, bind, []);
    },

    /**
       Prepares the given SQL, step()s it one time, and returns an
       object containing the key/value pairs of the first result
       row. If it has no results, `undefined` is returned.

       Note that the order of returned object's keys is not guaranteed
       to be the same as the order of the fields in the query string.

       If passed a second argument other than `undefined`, it is
       treated like an argument to Stmt.bind(), so may be any type
       supported by that function.

       Throws on error (e.g. malformed SQL).
    */
    selectObject: function(sql,bind){
      return __selectFirstRow(this, sql, bind, {});
    },

    /**
       Runs the given SQL and returns an array of all results, with
       each row represented as an array, as per the 'array' `rowMode`
       option to `exec()`. An empty result set resolves
       to an empty array. The second argument, if any, is treated as
       the 'bind' option to a call to exec().
    */
    selectArrays: function(sql,bind){
      return __selectAll(this, sql, bind, 'array');
    },

    /**
       Works identically to selectArrays() except that each value
       in the returned array is an object, as per the 'object' `rowMode`
       option to `exec()`.
    */
    selectObjects: function(sql,bind){
      return __selectAll(this, sql, bind, 'object');
    },

    /**
       Returns the number of currently-opened Stmt handles for this db
       handle, or 0 if this DB instance is closed. Note that only
       handles prepared via this.prepare() are counted, and not
       handles prepared using capi.sqlite3_prepare_v3() (or
       equivalent).
    */
    openStatementCount: function(){
      return this.pointer ? Object.keys(__stmtMap.get(this)).length : 0;
    },

    /**
       Starts a transaction, calls the given callback, and then either
       rolls back or commits the savepoint, depending on whether the
       callback throws. The callback is passed this db object as its
       only argument. On success, returns the result of the
       callback. Throws on error.

       Note that transactions may not be nested, so this will throw if
       it is called recursively. For nested transactions, use the
       savepoint() method or manually manage SAVEPOINTs using exec().

       If called with 2 arguments, the first must be a keyword which
       is legal immediately after a BEGIN statement, e.g. one of
       "DEFERRED", "IMMEDIATE", or "EXCLUSIVE". Though the exact list
       of supported keywords is not hard-coded here, in order to be
       future-compatible, if the argument does not look like a single
       keyword then an exception is triggered with a description of
       the problem.
     */
    transaction: function(/* [beginQualifier,] */callback){
      let opener = 'BEGIN';
      if(arguments.length>1){
        if(/[^a-zA-Z]/.test(arguments[0])){
          toss3(capi.SQLITE_MISUSE, "Invalid argument for BEGIN qualifier.");
        }
        opener += ' '+arguments[0];
        callback = arguments[1];
      }
      affirmDbOpen(this).exec(opener);
      try {
        const rc = callback(this);
        this.exec("COMMIT");
        return rc;
      }catch(e){
        this.exec("ROLLBACK");
        throw e;
      }
    },

    /**
       This works similarly to transaction() but uses sqlite3's SAVEPOINT
       feature. This function starts a savepoint (with an unspecified name)
       and calls the given callback function, passing it this db object.
       If the callback returns, the savepoint is released (committed). If
       the callback throws, the savepoint is rolled back. If it does not
       throw, it returns the result of the callback.
    */
    savepoint: function(callback){
      affirmDbOpen(this).exec("SAVEPOINT oo1");
      try {
        const rc = callback(this);
        this.exec("RELEASE oo1");
        return rc;
      }catch(e){
        this.exec("ROLLBACK to SAVEPOINT oo1; RELEASE SAVEPOINT oo1");
        throw e;
      }
    },

    /**
       A convenience form of DB.checkRc(this,resultCode). If it does
       not throw, it returns this object.
    */
    checkRc: function(resultCode){
      return checkSqlite3Rc(this, resultCode);
    }
  }/*DB.prototype*/;


  /** Throws if the given Stmt has been finalized, else stmt is
      returned. */
  const affirmStmtOpen = function(stmt){
    if(!stmt.pointer) toss3("Stmt has been closed.");
    return stmt;
  };

  /** Returns an opaque truthy value from the BindTypes
      enum if v's type is a valid bindable type, else
      returns a falsy value. As a special case, a value of
      undefined is treated as a bind type of null. */
  const isSupportedBindType = function(v){
    let t = BindTypes[(null===v||undefined===v) ? 'null' : typeof v];
    switch(t){
        case BindTypes.boolean:
        case BindTypes.null:
        case BindTypes.number:
        case BindTypes.string:
          return t;
        case BindTypes.bigint:
          if(wasm.bigIntEnabled) return t;
          /* else fall through */
        default:
          return util.isBindableTypedArray(v) ? BindTypes.blob : undefined;
    }
  };

  /**
     If isSupportedBindType(v) returns a truthy value, this
     function returns that value, else it throws.
  */
  const affirmSupportedBindType = function(v){
    //sqlite3.config.log('affirmSupportedBindType',v);
    return isSupportedBindType(v) || toss3("Unsupported bind() argument type:",typeof v);
  };

  /**
     If key is a number and within range of stmt's bound parameter
     count, key is returned.

     If key is not a number then it is checked against named
     parameters. If a match is found, its index is returned.

     Else it throws.
  */
  const affirmParamIndex = function(stmt,key){
    const n = ('number'===typeof key)
          ? key : capi.sqlite3_bind_parameter_index(stmt.pointer, key);
    if(0===n || !util.isInt32(n)){
      toss3("Invalid bind() parameter name: "+key);
    }
    else if(n<1 || n>stmt.parameterCount) toss3("Bind index",key,"is out of range.");
    return n;
  };

  /**
     If stmt._lockedByExec is truthy, this throws an exception
     complaining that the 2nd argument (an operation name,
     e.g. "bind()") is not legal while the statement is "locked".
     Locking happens before an exec()-like callback is passed a
     statement, to ensure that the callback does not mutate or
     finalize the statement. If it does not throw, it returns stmt.
  */
  const affirmNotLockedByExec = function(stmt,currentOpName){
    if(stmt._lockedByExec){
      toss3("Operation is illegal when statement is locked:",currentOpName);
    }
    return stmt;
  };

  /**
     Binds a single bound parameter value on the given stmt at the
     given index (numeric or named) using the given bindType (see
     the BindTypes enum) and value. Throws on error. Returns stmt on
     success.
  */
  const bindOne = function f(stmt,ndx,bindType,val){
    affirmNotLockedByExec(affirmStmtOpen(stmt), 'bind()');
    if(!f._){
      f._tooBigInt = (v)=>toss3(
        "BigInt value is too big to store without precision loss:", v
      );
      f._ = {
        string: function(stmt, ndx, val, asBlob){
          const [pStr, n] = wasm.allocCString(val, true);
          const f = asBlob ? capi.sqlite3_bind_blob : capi.sqlite3_bind_text;
          return f(stmt.pointer, ndx, pStr, n, capi.SQLITE_WASM_DEALLOC);
        }
      };
    }/* static init */
    affirmSupportedBindType(val);
    ndx = affirmParamIndex(stmt,ndx);
    let rc = 0;
    switch((null===val || undefined===val) ? BindTypes.null : bindType){
        case BindTypes.null:
          rc = capi.sqlite3_bind_null(stmt.pointer, ndx);
          break;
        case BindTypes.string:
          rc = f._.string(stmt, ndx, val, false);
          break;
        case BindTypes.number: {
          let m;
          if(util.isInt32(val)) m = capi.sqlite3_bind_int;
          else if('bigint'===typeof val){
            if(!util.bigIntFits64(val)){
              f._tooBigInt(val);
            }else if(wasm.bigIntEnabled){
              m = capi.sqlite3_bind_int64;
            }else if(util.bigIntFitsDouble(val)){
              val = Number(val);
              m = capi.sqlite3_bind_double;
            }else{
              f._tooBigInt(val);
            }
          }else{ // !int32, !bigint
            val = Number(val);
            if(wasm.bigIntEnabled && Number.isInteger(val)){
              m = capi.sqlite3_bind_int64;
            }else{
              m = capi.sqlite3_bind_double;
            }
          }
          rc = m(stmt.pointer, ndx, val);
          break;
        }
        case BindTypes.boolean:
          rc = capi.sqlite3_bind_int(stmt.pointer, ndx, val ? 1 : 0);
          break;
        case BindTypes.blob: {
          if('string'===typeof val){
            rc = f._.string(stmt, ndx, val, true);
            break;
          }else if(val instanceof ArrayBuffer){
            val = new Uint8Array(val);
          }else if(!util.isBindableTypedArray(val)){
            toss3("Binding a value as a blob requires",
                  "that it be a string, Uint8Array, Int8Array, or ArrayBuffer.");
          }
          const pBlob = wasm.alloc(val.byteLength || 1);
          wasm.heap8().set(val.byteLength ? val : [0], pBlob)
          rc = capi.sqlite3_bind_blob(stmt.pointer, ndx, pBlob, val.byteLength,
                                      capi.SQLITE_WASM_DEALLOC);
          break;
        }
        default:
          sqlite3.config.warn("Unsupported bind() argument type:",val);
          toss3("Unsupported bind() argument type: "+(typeof val));
    }
    if(rc) DB.checkRc(stmt.db.pointer, rc);
    stmt._mayGet = false;
    return stmt;
  };

  Stmt.prototype = {
    /**
       "Finalizes" this statement. This is a no-op if the statement
       has already been finalized. Returns the result of
       sqlite3_finalize() (0 on success, non-0 on error), or the
       undefined value if the statement has already been
       finalized. Regardless of success or failure, most methods in
       this class will throw if called after this is.

       This method always throws if called when it is illegal to do
       so. Namely, when triggered via a per-row callback handler of a
       DB.exec() call.
    */
    finalize: function(){
      if(this.pointer){
        affirmNotLockedByExec(this,'finalize()');
        const rc = capi.sqlite3_finalize(this.pointer);
        delete __stmtMap.get(this.db)[this.pointer];
        __ptrMap.delete(this);
        delete this._mayGet;
        delete this.parameterCount;
        delete this._lockedByExec;
        delete this.db;
        return rc;
      }
    },
    /**
       Clears all bound values. Returns this object.  Throws if this
       statement has been finalized or if modification of the
       statement is currently illegal (e.g. in the per-row callback of
       a DB.exec() call).
    */
    clearBindings: function(){
      affirmNotLockedByExec(affirmStmtOpen(this), 'clearBindings()')
      capi.sqlite3_clear_bindings(this.pointer);
      this._mayGet = false;
      return this;
    },
    /**
       Resets this statement so that it may be step()ed again from the
       beginning. Returns this object. Throws if this statement has
       been finalized, if it may not legally be reset because it is
       currently being used from a DB.exec() callback, or if the
       underlying call to sqlite3_reset() returns non-0.

       If passed a truthy argument then this.clearBindings() is
       also called, otherwise any existing bindings, along with
       any memory allocated for them, are retained.

       In versions 3.42.0 and earlier, this function did not throw if
       sqlite3_reset() returns non-0, but it was discovered that
       throwing (or significant extra client-side code) is necessary
       in order to avoid certain silent failure scenarios, as
       discussed at:

       https://sqlite.org/forum/forumpost/36f7a2e7494897df
    */
    reset: function(alsoClearBinds){
      affirmNotLockedByExec(this,'reset()');
      if(alsoClearBinds) this.clearBindings();
      const rc = capi.sqlite3_reset(affirmStmtOpen(this).pointer);
      this._mayGet = false;
      checkSqlite3Rc(this.db, rc);
      return this;
    },
    /**
       Binds one or more values to its bindable parameters. It
       accepts 1 or 2 arguments:

       If passed a single argument, it must be either an array, an
       object, or a value of a bindable type (see below).

       If passed 2 arguments, the first one is the 1-based bind
       index or bindable parameter name and the second one must be
       a value of a bindable type.

       Bindable value types:

       - null is bound as NULL.

       - undefined as a standalone value is a no-op intended to
         simplify certain client-side use cases: passing undefined as
         a value to this function will not actually bind anything and
         this function will skip confirmation that binding is even
         legal. (Those semantics simplify certain client-side uses.)
         Conversely, a value of undefined as an array or object
         property when binding an array/object (see below) is treated
         the same as null.

       - Numbers are bound as either doubles or integers: doubles if
         they are larger than 32 bits, else double or int32, depending
         on whether they have a fractional part. Booleans are bound as
         integer 0 or 1. It is not expected the distinction of binding
         doubles which have no fractional parts is integers is
         significant for the majority of clients due to sqlite3's data
         typing model. If [BigInt] support is enabled then this
         routine will bind BigInt values as 64-bit integers if they'll
         fit in 64 bits. If that support disabled, it will store the
         BigInt as an int32 or a double if it can do so without loss
         of precision. If the BigInt is _too BigInt_ then it will
         throw.

       - Strings are bound as strings (use bindAsBlob() to force
         blob binding).

       - Uint8Array, Int8Array, and ArrayBuffer instances are bound as
         blobs.

       If passed an array, each element of the array is bound at
       the parameter index equal to the array index plus 1
       (because arrays are 0-based but binding is 1-based).

       If passed an object, each object key is treated as a
       bindable parameter name. The object keys _must_ match any
       bindable parameter names, including any `$`, `@`, or `:`
       prefix. Because `$` is a legal identifier chararacter in
       JavaScript, that is the suggested prefix for bindable
       parameters: `stmt.bind({$a: 1, $b: 2})`.

       It returns this object on success and throws on
       error. Errors include:

       - Any bind index is out of range, a named bind parameter
       does not match, or this statement has no bindable
       parameters.

       - Any value to bind is of an unsupported type.

       - Passed no arguments or more than two.

       - The statement has been finalized.
    */
    bind: function(/*[ndx,] arg*/){
      affirmStmtOpen(this);
      let ndx, arg;
      switch(arguments.length){
          case 1: ndx = 1; arg = arguments[0]; break;
          case 2: ndx = arguments[0]; arg = arguments[1]; break;
          default: toss3("Invalid bind() arguments.");
      }
      if(undefined===arg){
        /* It might seem intuitive to bind undefined as NULL
           but this approach simplifies certain client-side
           uses when passing on arguments between 2+ levels of
           functions. */
        return this;
      }else if(!this.parameterCount){
        toss3("This statement has no bindable parameters.");
      }
      this._mayGet = false;
      if(null===arg){
        /* bind NULL */
        return bindOne(this, ndx, BindTypes.null, arg);
      }
      else if(Array.isArray(arg)){
        /* bind each entry by index */
        if(1!==arguments.length){
          toss3("When binding an array, an index argument is not permitted.");
        }
        arg.forEach((v,i)=>bindOne(this, i+1, affirmSupportedBindType(v), v));
        return this;
      }else if(arg instanceof ArrayBuffer){
        arg = new Uint8Array(arg);
      }
      if('object'===typeof arg/*null was checked above*/
              && !util.isBindableTypedArray(arg)){
        /* Treat each property of arg as a named bound parameter. */
        if(1!==arguments.length){
          toss3("When binding an object, an index argument is not permitted.");
        }
        Object.keys(arg)
          .forEach(k=>bindOne(this, k,
                              affirmSupportedBindType(arg[k]),
                              arg[k]));
        return this;
      }else{
        return bindOne(this, ndx, affirmSupportedBindType(arg), arg);
      }
      toss3("Should not reach this point.");
    },
    /**
       Special case of bind() which binds the given value using the
       BLOB binding mechanism instead of the default selected one for
       the value. The ndx may be a numbered or named bind index. The
       value must be of type string, null/undefined (both get treated
       as null), or a TypedArray of a type supported by the bind()
       API. This API cannot bind numbers as blobs.

       If passed a single argument, a bind index of 1 is assumed and
       the first argument is the value.
    */
    bindAsBlob: function(ndx,arg){
      affirmStmtOpen(this);
      if(1===arguments.length){
        arg = ndx;
        ndx = 1;
      }
      const t = affirmSupportedBindType(arg);
      if(BindTypes.string !== t && BindTypes.blob !== t
         && BindTypes.null !== t){
        toss3("Invalid value type for bindAsBlob()");
      }
      return bindOne(this, ndx, BindTypes.blob, arg);
    },
    /**
       Steps the statement one time. If the result indicates that a
       row of data is available, a truthy value is returned.
       If no row of data is available, a falsy
       value is returned.  Throws on error.
    */
    step: function(){
      affirmNotLockedByExec(this, 'step()');
      const rc = capi.sqlite3_step(affirmStmtOpen(this).pointer);
      switch(rc){
          case capi.SQLITE_DONE: return this._mayGet = false;
          case capi.SQLITE_ROW: return this._mayGet = true;
          default:
            this._mayGet = false;
            sqlite3.config.warn("sqlite3_step() rc=",rc,
                         capi.sqlite3_js_rc_str(rc),
                         "SQL =", capi.sqlite3_sql(this.pointer));
            DB.checkRc(this.db.pointer, rc);
      }
    },
    /**
       Functions exactly like step() except that...

       1) On success, it calls this.reset() and returns this object.
       2) On error, it throws and does not call reset().

       This is intended to simplify constructs like:

       ```
       for(...) {
         stmt.bind(...).stepReset();
       }
       ```

       Note that the reset() call makes it illegal to call this.get()
       after the step.
    */
    stepReset: function(){
      this.step();
      return this.reset();
    },
    /**
       Functions like step() except that it calls finalize() on this
       statement immediately after stepping, even if the step() call
       throws.

       On success, it returns true if the step indicated that a row of
       data was available, else it returns false.

       This is intended to simplify use cases such as:

       ```
       aDb.prepare("insert into foo(a) values(?)").bind(123).stepFinalize();
       ```
    */
    stepFinalize: function(){
      try{
        const rc = this.step();
        this.reset(/*for INSERT...RETURNING locking case*/);
        return rc;
      }finally{
        try{this.finalize()}
        catch(e){/*ignored*/}
      }
    },
    /**
       Fetches the value from the given 0-based column index of
       the current data row, throwing if index is out of range.

       Requires that step() has just returned a truthy value, else
       an exception is thrown.

       By default it will determine the data type of the result
       automatically. If passed a second arugment, it must be one
       of the enumeration values for sqlite3 types, which are
       defined as members of the sqlite3 module: SQLITE_INTEGER,
       SQLITE_FLOAT, SQLITE_TEXT, SQLITE_BLOB. Any other value,
       except for undefined, will trigger an exception. Passing
       undefined is the same as not passing a value. It is legal
       to, e.g., fetch an integer value as a string, in which case
       sqlite3 will convert the value to a string.

       If ndx is an array, this function behaves a differently: it
       assigns the indexes of the array, from 0 to the number of
       result columns, to the values of the corresponding column,
       and returns that array.

       If ndx is a plain object, this function behaves even
       differentlier: it assigns the properties of the object to
       the values of their corresponding result columns.

       Blobs are returned as Uint8Array instances.

       Potential TODO: add type ID SQLITE_JSON, which fetches the
       result as a string and passes it (if it's not null) to
       JSON.parse(), returning the result of that. Until then,
       getJSON() can be used for that.
    */
    get: function(ndx,asType){
      if(!affirmStmtOpen(this)._mayGet){
        toss3("Stmt.step() has not (recently) returned true.");
      }
      if(Array.isArray(ndx)){
        let i = 0;
        const n = this.columnCount;
        while(i<n){
          ndx[i] = this.get(i++);
        }
        return ndx;
      }else if(ndx && 'object'===typeof ndx){
        let i = 0;
        const n = this.columnCount;
        while(i<n){
          ndx[capi.sqlite3_column_name(this.pointer,i)] = this.get(i++);
        }
        return ndx;
      }
      affirmColIndex(this, ndx);
      switch(undefined===asType
             ? capi.sqlite3_column_type(this.pointer, ndx)
             : asType){
          case capi.SQLITE_NULL: return null;
          case capi.SQLITE_INTEGER:{
            if(wasm.bigIntEnabled){
              const rc = capi.sqlite3_column_int64(this.pointer, ndx);
              if(rc>=Number.MIN_SAFE_INTEGER && rc<=Number.MAX_SAFE_INTEGER){
                /* Coerce "normal" number ranges to normal number values,
                   and only return BigInt-type values for numbers out of this
                   range. */
                return Number(rc).valueOf();
              }
              return rc;
            }else{
              const rc = capi.sqlite3_column_double(this.pointer, ndx);
              if(rc>Number.MAX_SAFE_INTEGER || rc<Number.MIN_SAFE_INTEGER){
                /* Throwing here is arguable but, since we're explicitly
                   extracting an SQLITE_INTEGER-type value, it seems fair to throw
                   if the extracted number is out of range for that type.
                   This policy may be laxened to simply pass on the number and
                   hope for the best, as the C API would do. */
                toss3("Integer is out of range for JS integer range: "+rc);
              }
              //sqlite3.config.log("get integer rc=",rc,isInt32(rc));
              return util.isInt32(rc) ? (rc | 0) : rc;
            }
          }
          case capi.SQLITE_FLOAT:
            return capi.sqlite3_column_double(this.pointer, ndx);
          case capi.SQLITE_TEXT:
            return capi.sqlite3_column_text(this.pointer, ndx);
          case capi.SQLITE_BLOB: {
            const n = capi.sqlite3_column_bytes(this.pointer, ndx),
                  ptr = capi.sqlite3_column_blob(this.pointer, ndx),
                  rc = new Uint8Array(n);
            //heap = n ? wasm.heap8() : false;
            if(n) rc.set(wasm.heap8u().slice(ptr, ptr+n), 0);
            //for(let i = 0; i < n; ++i) rc[i] = heap[ptr + i];
            if(n && this.db._blobXfer instanceof Array){
              /* This is an optimization soley for the
                 Worker-based API. These values will be
                 transfered to the main thread directly
                 instead of being copied. */
              this.db._blobXfer.push(rc.buffer);
            }
            return rc;
          }
          default: toss3("Don't know how to translate",
                         "type of result column #"+ndx+".");
      }
      toss3("Not reached.");
    },
    /** Equivalent to get(ndx) but coerces the result to an
        integer. */
    getInt: function(ndx){return this.get(ndx,capi.SQLITE_INTEGER)},
    /** Equivalent to get(ndx) but coerces the result to a
        float. */
    getFloat: function(ndx){return this.get(ndx,capi.SQLITE_FLOAT)},
    /** Equivalent to get(ndx) but coerces the result to a
        string. */
    getString: function(ndx){return this.get(ndx,capi.SQLITE_TEXT)},
    /** Equivalent to get(ndx) but coerces the result to a
        Uint8Array. */
    getBlob: function(ndx){return this.get(ndx,capi.SQLITE_BLOB)},
    /**
       A convenience wrapper around get() which fetches the value
       as a string and then, if it is not null, passes it to
       JSON.parse(), returning that result. Throws if parsing
       fails. If the result is null, null is returned. An empty
       string, on the other hand, will trigger an exception.
    */
    getJSON: function(ndx){
      const s = this.get(ndx, capi.SQLITE_STRING);
      return null===s ? s : JSON.parse(s);
    },
    // Design note: the only reason most of these getters have a 'get'
    // prefix is for consistency with getVALUE_TYPE().  The latter
    // arguably really need that prefix for API readability and the
    // rest arguably don't, but consistency is a powerful thing.
    /**
       Returns the result column name of the given index, or
       throws if index is out of bounds or this statement has been
       finalized. This can be used without having run step()
       first.
    */
    getColumnName: function(ndx){
      return capi.sqlite3_column_name(
        affirmColIndex(affirmStmtOpen(this),ndx).pointer, ndx
      );
    },
    /**
       If this statement potentially has result columns, this function
       returns an array of all such names. If passed an array, it is
       used as the target and all names are appended to it. Returns
       the target array. Throws if this statement cannot have result
       columns. This object's columnCount property holds the number of
       columns.
    */
    getColumnNames: function(tgt=[]){
      affirmColIndex(affirmStmtOpen(this),0);
      const n = this.columnCount;
      for(let i = 0; i < n; ++i){
        tgt.push(capi.sqlite3_column_name(this.pointer, i));
      }
      return tgt;
    },
    /**
       If this statement has named bindable parameters and the
       given name matches one, its 1-based bind index is
       returned. If no match is found, 0 is returned. If it has no
       bindable parameters, the undefined value is returned.
    */
    getParamIndex: function(name){
      return (affirmStmtOpen(this).parameterCount
              ? capi.sqlite3_bind_parameter_index(this.pointer, name)
              : undefined);
    }
  }/*Stmt.prototype*/;

  {/* Add the `pointer` property to DB and Stmt. */
    const prop = {
      enumerable: true,
      get: function(){return __ptrMap.get(this)},
      set: ()=>toss3("The pointer property is read-only.")
    }
    Object.defineProperty(Stmt.prototype, 'pointer', prop);
    Object.defineProperty(DB.prototype, 'pointer', prop);
  }
  /**
     Stmt.columnCount is an interceptor for sqlite3_column_count().

     This requires an unfortunate performance hit compared to caching
     columnCount when the Stmt is created/prepared (as was done in
     SQLite <=3.42.0), but is necessary in order to handle certain
     corner cases, as described in
     https://sqlite.org/forum/forumpost/7774b773937cbe0a.
  */
  Object.defineProperty(Stmt.prototype, 'columnCount', {
    enumerable: false,
    get: function(){return capi.sqlite3_column_count(this.pointer)},
    set: ()=>toss3("The columnCount property is read-only.")
  });

  /** The OO API's public namespace. */
  sqlite3.oo1 = {
    DB,
    Stmt
  }/*oo1 object*/;

  if(util.isUIThread()){
    /**
       Functionally equivalent to DB(storageName,'c','kvvfs') except
       that it throws if the given storage name is not one of 'local'
       or 'session'.
    */
    sqlite3.oo1.JsStorageDb = function(storageName='session'){
      if('session'!==storageName && 'local'!==storageName){
        toss3("JsStorageDb db name must be one of 'session' or 'local'.");
      }
      dbCtorHelper.call(this, {
        filename: storageName,
        flags: 'c',
        vfs: "kvvfs"
      });
    };
    const jdb = sqlite3.oo1.JsStorageDb;
    jdb.prototype = Object.create(DB.prototype);
    /** Equivalent to sqlite3_js_kvvfs_clear(). */
    jdb.clearStorage = capi.sqlite3_js_kvvfs_clear;
    /**
       Clears this database instance's storage or throws if this
       instance has been closed. Returns the number of
       database blocks which were cleaned up.
    */
    jdb.prototype.clearStorage = function(){
      return jdb.clearStorage(affirmDbOpen(this).filename);
    };
    /** Equivalent to sqlite3_js_kvvfs_size(). */
    jdb.storageSize = capi.sqlite3_js_kvvfs_size;
    /**
       Returns the _approximate_ number of bytes this database takes
       up in its storage or throws if this instance has been closed.
    */
    jdb.prototype.storageSize = function(){
      return jdb.storageSize(affirmDbOpen(this).filename);
    };
  }/*main-window-only bits*/

});

/* END FILE: api/sqlite3-api-oo1.js */
/* BEGIN FILE: api/sqlite3-api-worker1.js */
/**
  2022-07-22

  The author disclaims copyright to this source code.  In place of a
  legal notice, here is a blessing:

  *   May you do good and not evil.
  *   May you find forgiveness for yourself and forgive others.
  *   May you share freely, never taking more than you give.

  ***********************************************************************

  This file implements the initializer for SQLite's "Worker API #1", a
  very basic DB access API intended to be scripted from a main window
  thread via Worker-style messages. Because of limitations in that
  type of communication, this API is minimalistic and only capable of
  serving relatively basic DB requests (e.g. it cannot process nested
  query loops concurrently).

  This file requires that the core C-style sqlite3 API and OO API #1
  have been loaded.
*/

/**
  sqlite3.initWorker1API() implements a Worker-based wrapper around
  SQLite3 OO API #1, colloquially known as "Worker API #1".

  In order to permit this API to be loaded in worker threads without
  automatically registering onmessage handlers, initializing the
  worker API requires calling initWorker1API(). If this function is
  called from a non-worker thread then it throws an exception.  It
  must only be called once per Worker.

  When initialized, it installs message listeners to receive Worker
  messages and then it posts a message in the form:

  ```
  {type:'sqlite3-api', result:'worker1-ready'}
  ```

  to let the client know that it has been initialized. Clients may
  optionally depend on this function not returning until
  initialization is complete, as the initialization is synchronous.
  In some contexts, however, listening for the above message is
  a better fit.

  Note that the worker-based interface can be slightly quirky because
  of its async nature. In particular, any number of messages may be posted
  to the worker before it starts handling any of them. If, e.g., an
  "open" operation fails, any subsequent messages will fail. The
  Promise-based wrapper for this API (`sqlite3-worker1-promiser.js`)
  is more comfortable to use in that regard.

  The documentation for the input and output worker messages for
  this API follows...

  ====================================================================
  Common message format...

  Each message posted to the worker has an operation-independent
  envelope and operation-dependent arguments:

  ```
  {
    type: string, // one of: 'open', 'close', 'exec', 'config-get'

    messageId: OPTIONAL arbitrary value. The worker will copy it as-is
    into response messages to assist in client-side dispatching.

    dbId: a db identifier string (returned by 'open') which tells the
    operation which database instance to work on. If not provided, the
    first-opened db is used. This is an "opaque" value, with no
    inherently useful syntax or information. Its value is subject to
    change with any given build of this API and cannot be used as a
    basis for anything useful beyond its one intended purpose.

    args: ...operation-dependent arguments...

    // the framework may add other properties for testing or debugging
    // purposes.

  }
  ```

  Response messages, posted back to the main thread, look like:

  ```
  {
    type: string. Same as above except for error responses, which have the type
    'error',

    messageId: same value, if any, provided by the inbound message

    dbId: the id of the db which was operated on, if any, as returned
    by the corresponding 'open' operation.

    result: ...operation-dependent result...

  }
  ```

  ====================================================================
  Error responses

  Errors are reported messages in an operation-independent format:

  ```
  {
    type: "error",

    messageId: ...as above...,

    dbId: ...as above...

    result: {

      operation: type of the triggering operation: 'open', 'close', ...

      message: ...error message text...

      errorClass: string. The ErrorClass.name property from the thrown exception.

      input: the message object which triggered the error.

      stack: _if available_, a stack trace array.

    }

  }
  ```


  ====================================================================
  "config-get"

  This operation fetches the serializable parts of the sqlite3 API
  configuration.

  Message format:

  ```
  {
    type: "config-get",
    messageId: ...as above...,
    args: currently ignored and may be elided.
  }
  ```

  Response:

  ```
  {
    type: "config-get",
    messageId: ...as above...,
    result: {

      version: sqlite3.version object

      bigIntEnabled: bool. True if BigInt support is enabled.

      vfsList: result of sqlite3.capi.sqlite3_js_vfs_list()
   }
  }
  ```


  ====================================================================
  "open" a database

  Message format:

  ```
  {
    type: "open",
    messageId: ...as above...,
    args:{

      filename [=":memory:" or "" (unspecified)]: the db filename.
      See the sqlite3.oo1.DB constructor for peculiarities and
      transformations,

      vfs: sqlite3_vfs name. Ignored if filename is ":memory:" or "".
           This may change how the given filename is resolved.
    }
  }
  ```

  Response:

  ```
  {
    type: "open",
    messageId: ...as above...,
    result: {
      filename: db filename, possibly differing from the input.

      dbId: an opaque ID value which must be passed in the message
      envelope to other calls in this API to tell them which db to
      use. If it is not provided to future calls, they will default to
      operating on the least-recently-opened db. This property is, for
      API consistency's sake, also part of the containing message
      envelope.  Only the `open` operation includes it in the `result`
      property.

      persistent: true if the given filename resides in the
      known-persistent storage, else false.

      vfs: name of the VFS the "main" db is using.
   }
  }
  ```

  ====================================================================
  "close" a database

  Message format:

  ```
  {
    type: "close",
    messageId: ...as above...
    dbId: ...as above...
    args: OPTIONAL {unlink: boolean}
  }
  ```

  If the `dbId` does not refer to an opened ID, this is a no-op. If
  the `args` object contains a truthy `unlink` value then the database
  will be unlinked (deleted) after closing it. The inability to close a
  db (because it's not opened) or delete its file does not trigger an
  error.

  Response:

  ```
  {
    type: "close",
    messageId: ...as above...,
    result: {

      filename: filename of closed db, or undefined if no db was closed

    }
  }
  ```

  ====================================================================
  "exec" SQL

  All SQL execution is processed through the exec operation. It offers
  most of the features of the oo1.DB.exec() method, with a few limitations
  imposed by the state having to cross thread boundaries.

  Message format:

  ```
  {
    type: "exec",
    messageId: ...as above...
    dbId: ...as above...
    args: string (SQL) or {... see below ...}
  }
  ```

  Response:

  ```
  {
    type: "exec",
    messageId: ...as above...,
    dbId: ...as above...
    result: {
      input arguments, possibly modified. See below.
    }
  }
  ```

  The arguments are in the same form accepted by oo1.DB.exec(), with
  the exceptions noted below.

  If the `countChanges` arguments property (added in version 3.43) is
  truthy then the `result` property contained by the returned object
  will have a `changeCount` property which holds the number of changes
  made by the provided SQL. Because the SQL may contain an arbitrary
  number of statements, the `changeCount` is calculated by calling
  `sqlite3_total_changes()` before and after the SQL is evaluated. If
  the value of `countChanges` is 64 then the `changeCount` property
  will be returned as a 64-bit integer in the form of a BigInt (noting
  that that will trigger an exception if used in a BigInt-incapable
  build).  In the latter case, the number of changes is calculated by
  calling `sqlite3_total_changes64()` before and after the SQL is
  evaluated.

  A function-type args.callback property cannot cross
  the window/Worker boundary, so is not useful here. If
  args.callback is a string then it is assumed to be a
  message type key, in which case a callback function will be
  applied which posts each row result via:

  postMessage({type: thatKeyType,
               rowNumber: 1-based-#,
               row: theRow,
               columnNames: anArray
               })

  And, at the end of the result set (whether or not any result rows
  were produced), it will post an identical message with
  (row=undefined, rowNumber=null) to alert the caller than the result
  set is completed. Note that a row value of `null` is a legal row
  result for certain arg.rowMode values.

    (Design note: we don't use (row=undefined, rowNumber=undefined) to
    indicate end-of-results because fetching those would be
    indistinguishable from fetching from an empty object unless the
    client used hasOwnProperty() (or similar) to distinguish "missing
    property" from "property with the undefined value".  Similarly,
    `null` is a legal value for `row` in some case , whereas the db
    layer won't emit a result value of `undefined`.)

  The callback proxy must not recurse into this interface. An exec()
  call will tie up the Worker thread, causing any recursion attempt
  to wait until the first exec() is completed.

  The response is the input options object (or a synthesized one if
  passed only a string), noting that options.resultRows and
  options.columnNames may be populated by the call to db.exec().

*/
globalThis.sqlite3ApiBootstrap.initializers.push(function(sqlite3){
sqlite3.initWorker1API = function(){
  'use strict';
  const toss = (...args)=>{throw new Error(args.join(' '))};
  if(!(globalThis.WorkerGlobalScope instanceof Function)){
    toss("initWorker1API() must be run from a Worker thread.");
  }
  const sqlite3 = this.sqlite3 || toss("Missing this.sqlite3 object.");
  const DB = sqlite3.oo1.DB;

  /**
     Returns the app-wide unique ID for the given db, creating one if
     needed.
  */
  const getDbId = function(db){
    let id = wState.idMap.get(db);
    if(id) return id;
    id = 'db#'+(++wState.idSeq)+'@'+db.pointer;
    /** ^^^ can't simply use db.pointer b/c closing/opening may re-use
        the same address, which could map pending messages to a wrong
        instance. */
    wState.idMap.set(db, id);
    return id;
  };

  /**
     Internal helper for managing Worker-level state.
  */
  const wState = {
    /**
       Each opened DB is added to this.dbList, and the first entry in
       that list is the default db. As each db is closed, its entry is
       removed from the list.
    */
    dbList: [],
    /** Sequence number of dbId generation. */
    idSeq: 0,
    /** Map of DB instances to dbId. */
    idMap: new WeakMap,
    /** Temp holder for "transferable" postMessage() state. */
    xfer: [],
    open: function(opt){
      const db = new DB(opt);
      this.dbs[getDbId(db)] = db;
      if(this.dbList.indexOf(db)<0) this.dbList.push(db);
      return db;
    },
    close: function(db,alsoUnlink){
      if(db){
        delete this.dbs[getDbId(db)];
        const filename = db.filename;
        const pVfs = sqlite3.wasm.sqlite3_wasm_db_vfs(db.pointer, 0);
        db.close();
        const ddNdx = this.dbList.indexOf(db);
        if(ddNdx>=0) this.dbList.splice(ddNdx, 1);
        if(alsoUnlink && filename && pVfs){
          sqlite3.wasm.sqlite3_wasm_vfs_unlink(pVfs, filename);
        }
      }
    },
    /**
       Posts the given worker message value. If xferList is provided,
       it must be an array, in which case a copy of it passed as
       postMessage()'s second argument and xferList.length is set to
       0.
    */
    post: function(msg,xferList){
      if(xferList && xferList.length){
        globalThis.postMessage( msg, Array.from(xferList) );
        xferList.length = 0;
      }else{
        globalThis.postMessage(msg);
      }
    },
    /** Map of DB IDs to DBs. */
    dbs: Object.create(null),
    /** Fetch the DB for the given id. Throw if require=true and the
        id is not valid, else return the db or undefined. */
    getDb: function(id,require=true){
      return this.dbs[id]
        || (require ? toss("Unknown (or closed) DB ID:",id) : undefined);
    }
  };

  /** Throws if the given db is falsy or not opened, else returns its
      argument. */
  const affirmDbOpen = function(db = wState.dbList[0]){
    return (db && db.pointer) ? db : toss("DB is not opened.");
  };

  /** Extract dbId from the given message payload. */
  const getMsgDb = function(msgData,affirmExists=true){
    const db = wState.getDb(msgData.dbId,false) || wState.dbList[0];
    return affirmExists ? affirmDbOpen(db) : db;
  };

  const getDefaultDbId = function(){
    return wState.dbList[0] && getDbId(wState.dbList[0]);
  };

  const guessVfs = function(filename){
    const m = /^file:.+(vfs=(\w+))/.exec(filename);
    return sqlite3.capi.sqlite3_vfs_find(m ? m[2] : 0);
  };

  const isSpecialDbFilename = (n)=>{
    return ""===n || ':'===n[0];
  };

  /**
     A level of "organizational abstraction" for the Worker1
     API. Each method in this object must map directly to a Worker1
     message type key. The onmessage() dispatcher attempts to
     dispatch all inbound messages to a method of this object,
     passing it the event.data part of the inbound event object. All
     methods must return a plain Object containing any result
     state, which the dispatcher may amend. All methods must throw
     on error.
  */
  const wMsgHandler = {
    open: function(ev){
      const oargs = Object.create(null), args = (ev.args || Object.create(null));
      if(args.simulateError){ // undocumented internal testing option
        toss("Throwing because of simulateError flag.");
      }
      const rc = Object.create(null);
      let byteArray, pVfs;
      oargs.vfs = args.vfs;
      if(isSpecialDbFilename(args.filename)){
        oargs.filename = args.filename || "";
      }else{
        oargs.filename = args.filename;
        byteArray = args.byteArray;
        if(byteArray) pVfs = guessVfs(args.filename);
      }
      if(pVfs){
        /* 2022-11-02: this feature is as-yet untested except that
           sqlite3_wasm_vfs_create_file() has been tested from the
           browser dev console. */
        let pMem;
        try{
          pMem = sqlite3.wasm.allocFromTypedArray(byteArray);
          const rc = sqlite3.wasm.sqlite3_wasm_vfs_create_file(
            pVfs, oargs.filename, pMem, byteArray.byteLength
          );
          if(rc) sqlite3.SQLite3Error.toss(rc);
        }catch(e){
          throw new sqlite3.SQLite3Error(
            e.name+' creating '+args.filename+": "+e.message, {
              cause: e
            }
          );
        }finally{
          if(pMem) sqlite3.wasm.dealloc(pMem);
        }
      }
      const db = wState.open(oargs);
      rc.filename = db.filename;
      rc.persistent = !!sqlite3.capi.sqlite3_js_db_uses_vfs(db.pointer, "opfs");
      rc.dbId = getDbId(db);
      rc.vfs = db.dbVfsName();
      return rc;
    },

    close: function(ev){
      const db = getMsgDb(ev,false);
      const response = {
        filename: db && db.filename
      };
      if(db){
        const doUnlink = ((ev.args && 'object'===typeof ev.args)
                         ? !!ev.args.unlink : false);
        wState.close(db, doUnlink);
      }
      return response;
    },

    exec: function(ev){
      const rc = (
        'string'===typeof ev.args
      ) ? {sql: ev.args} : (ev.args || Object.create(null));
      if('stmt'===rc.rowMode){
        toss("Invalid rowMode for 'exec': stmt mode",
             "does not work in the Worker API.");
      }else if(!rc.sql){
        toss("'exec' requires input SQL.");
      }
      const db = getMsgDb(ev);
      if(rc.callback || Array.isArray(rc.resultRows)){
        // Part of a copy-avoidance optimization for blobs
        db._blobXfer = wState.xfer;
      }
      const theCallback = rc.callback;
      let rowNumber = 0;
      const hadColNames = !!rc.columnNames;
      if('string' === typeof theCallback){
        if(!hadColNames) rc.columnNames = [];
        /* Treat this as a worker message type and post each
           row as a message of that type. */
        rc.callback = function(row,stmt){
          wState.post({
            type: theCallback,
            columnNames: rc.columnNames,
            rowNumber: ++rowNumber,
            row: row
          }, wState.xfer);
        }
      }
      try {
        const changeCount = !!rc.countChanges
              ? db.changes(true,(64===rc.countChanges))
              : undefined;
        db.exec(rc);
        if(undefined !== changeCount){
          rc.changeCount = db.changes(true,64===rc.countChanges) - changeCount;
        }
        if(rc.callback instanceof Function){
          rc.callback = theCallback;
          /* Post a sentinel message to tell the client that the end
             of the result set has been reached (possibly with zero
             rows). */
          wState.post({
            type: theCallback,
            columnNames: rc.columnNames,
            rowNumber: null /*null to distinguish from "property not set"*/,
            row: undefined /*undefined because null is a legal row value
                             for some rowType values, but undefined is not*/
          });
        }
      }finally{
        delete db._blobXfer;
        if(rc.callback) rc.callback = theCallback;
      }
      return rc;
    }/*exec()*/,

    'config-get': function(){
      const rc = Object.create(null), src = sqlite3.config;
      [
        'bigIntEnabled'
      ].forEach(function(k){
        if(Object.getOwnPropertyDescriptor(src, k)) rc[k] = src[k];
      });
      rc.version = sqlite3.version;
      rc.vfsList = sqlite3.capi.sqlite3_js_vfs_list();
      rc.opfsEnabled = !!sqlite3.opfs;
      return rc;
    },

    /**
       Exports the database to a byte array, as per
       sqlite3_serialize(). Response is an object:

       {
         byteArray:  Uint8Array (db file contents),
         filename: the current db filename,
         mimetype: 'application/x-sqlite3'
       }
    */
    export: function(ev){
      const db = getMsgDb(ev);
      const response = {
        byteArray: sqlite3.capi.sqlite3_js_db_export(db.pointer),
        filename: db.filename,
        mimetype: 'application/x-sqlite3'
      };
      wState.xfer.push(response.byteArray.buffer);
      return response;
    }/*export()*/,

    toss: function(ev){
      toss("Testing worker exception");
    },

    'opfs-tree': async function(ev){
      if(!sqlite3.opfs) toss("OPFS support is unavailable.");
      const response = await sqlite3.opfs.treeList();
      return response;
    }
  }/*wMsgHandler*/;

  globalThis.onmessage = async function(ev){
    ev = ev.data;
    let result, dbId = ev.dbId, evType = ev.type;
    const arrivalTime = performance.now();
    try {
      if(wMsgHandler.hasOwnProperty(evType) &&
         wMsgHandler[evType] instanceof Function){
        result = await wMsgHandler[evType](ev);
      }else{
        toss("Unknown db worker message type:",ev.type);
      }
    }catch(err){
      evType = 'error';
      result = {
        operation: ev.type,
        message: err.message,
        errorClass: err.name,
        input: ev
      };
      if(err.stack){
        result.stack = ('string'===typeof err.stack)
          ? err.stack.split(/\n\s*/) : err.stack;
      }
      if(0) sqlite3.config.warn("Worker is propagating an exception to main thread.",
                                "Reporting it _here_ for the stack trace:",err,result);
    }
    if(!dbId){
      dbId = result.dbId/*from 'open' cmd*/
        || getDefaultDbId();
    }
    // Timing info is primarily for use in testing this API. It's not part of
    // the public API. arrivalTime = when the worker got the message.
    wState.post({
      type: evType,
      dbId: dbId,
      messageId: ev.messageId,
      workerReceivedTime: arrivalTime,
      workerRespondTime: performance.now(),
      departureTime: ev.departureTime,
      // TODO: move the timing bits into...
      //timing:{
      //  departure: ev.departureTime,
      //  workerReceived: arrivalTime,
      //  workerResponse: performance.now();
      //},
      result: result
    }, wState.xfer);
  };
  globalThis.postMessage({type:'sqlite3-api',result:'worker1-ready'});
}.bind({sqlite3});
});
/* END FILE: api/sqlite3-api-worker1.js */
/* BEGIN FILE: api/sqlite3-v-helper.js */
/*
** 2022-11-30
**
** The author disclaims copyright to this source code.  In place of a
** legal notice, here is a blessing:
**
** *   May you do good and not evil.
** *   May you find forgiveness for yourself and forgive others.
** *   May you share freely, never taking more than you give.
*/

/**
   This file installs sqlite3.vfs, and object which exists to assist
   in the creation of JavaScript implementations of sqlite3_vfs, along
   with its virtual table counterpart, sqlite3.vtab.
*/
'use strict';
globalThis.sqlite3ApiBootstrap.initializers.push(function(sqlite3){
  const wasm = sqlite3.wasm, capi = sqlite3.capi, toss = sqlite3.util.toss3;
  const vfs = Object.create(null), vtab = Object.create(null);

  const StructBinder = sqlite3.StructBinder
  /* we require a local alias b/c StructBinder is removed from the sqlite3
     object during the final steps of the API cleanup. */;
  sqlite3.vfs = vfs;
  sqlite3.vtab = vtab;

  const sii = capi.sqlite3_index_info;
  /**
     If n is >=0 and less than this.$nConstraint, this function
     returns either a WASM pointer to the 0-based nth entry of
     this.$aConstraint (if passed a truthy 2nd argument) or an
     sqlite3_index_info.sqlite3_index_constraint object wrapping that
     address (if passed a falsy value or no 2nd argument). Returns a
     falsy value if n is out of range.
  */
  sii.prototype.nthConstraint = function(n, asPtr=false){
    if(n<0 || n>=this.$nConstraint) return false;
    const ptr = this.$aConstraint + (
      sii.sqlite3_index_constraint.structInfo.sizeof * n
    );
    return asPtr ? ptr : new sii.sqlite3_index_constraint(ptr);
  };

  /**
     Works identically to nthConstraint() but returns state from
     this.$aConstraintUsage, so returns an
     sqlite3_index_info.sqlite3_index_constraint_usage instance
     if passed no 2nd argument or a falsy 2nd argument.
  */
  sii.prototype.nthConstraintUsage = function(n, asPtr=false){
    if(n<0 || n>=this.$nConstraint) return false;
    const ptr = this.$aConstraintUsage + (
      sii.sqlite3_index_constraint_usage.structInfo.sizeof * n
    );
    return asPtr ? ptr : new sii.sqlite3_index_constraint_usage(ptr);
  };

  /**
     If n is >=0 and less than this.$nOrderBy, this function
     returns either a WASM pointer to the 0-based nth entry of
     this.$aOrderBy (if passed a truthy 2nd argument) or an
     sqlite3_index_info.sqlite3_index_orderby object wrapping that
     address (if passed a falsy value or no 2nd argument). Returns a
     falsy value if n is out of range.
  */
  sii.prototype.nthOrderBy = function(n, asPtr=false){
    if(n<0 || n>=this.$nOrderBy) return false;
    const ptr = this.$aOrderBy + (
      sii.sqlite3_index_orderby.structInfo.sizeof * n
    );
    return asPtr ? ptr : new sii.sqlite3_index_orderby(ptr);
  };

  /**
     Installs a StructBinder-bound function pointer member of the
     given name and function in the given StructType target object.

     It creates a WASM proxy for the given function and arranges for
     that proxy to be cleaned up when tgt.dispose() is called. Throws
     on the slightest hint of error, e.g. tgt is-not-a StructType,
     name does not map to a struct-bound member, etc.

     As a special case, if the given function is a pointer, then
     `wasm.functionEntry()` is used to validate that it is a known
     function. If so, it is used as-is with no extra level of proxying
     or cleanup, else an exception is thrown. It is legal to pass a
     value of 0, indicating a NULL pointer, with the caveat that 0
     _is_ a legal function pointer in WASM but it will not be accepted
     as such _here_. (Justification: the function at address zero must
     be one which initially came from the WASM module, not a method we
     want to bind to a virtual table or VFS.)

     This function returns a proxy for itself which is bound to tgt
     and takes 2 args (name,func). That function returns the same
     thing as this one, permitting calls to be chained.

     If called with only 1 arg, it has no side effects but returns a
     func with the same signature as described above.

     ACHTUNG: because we cannot generically know how to transform JS
     exceptions into result codes, the installed functions do no
     automatic catching of exceptions. It is critical, to avoid
     undefined behavior in the C layer, that methods mapped via
     this function do not throw. The exception, as it were, to that
     rule is...

     If applyArgcCheck is true then each JS function (as opposed to
     function pointers) gets wrapped in a proxy which asserts that it
     is passed the expected number of arguments, throwing if the
     argument count does not match expectations. That is only intended
     for dev-time usage for sanity checking, and will leave the C
     environment in an undefined state.
  */
  const installMethod = function callee(
    tgt, name, func, applyArgcCheck = callee.installMethodArgcCheck
  ){
    if(!(tgt instanceof StructBinder.StructType)){
      toss("Usage error: target object is-not-a StructType.");
    }else if(!(func instanceof Function) && !wasm.isPtr(func)){
      toss("Usage errror: expecting a Function or WASM pointer to one.");
    }
    if(1===arguments.length){
      return (n,f)=>callee(tgt, n, f, applyArgcCheck);
    }
    if(!callee.argcProxy){
      callee.argcProxy = function(tgt, funcName, func,sig){
        return function(...args){
          if(func.length!==arguments.length){
            toss("Argument mismatch for",
                 tgt.structInfo.name+"::"+funcName
                 +": Native signature is:",sig);
          }
          return func.apply(this, args);
        }
      };
      /* An ondispose() callback for use with
         StructBinder-created types. */
      callee.removeFuncList = function(){
        if(this.ondispose.__removeFuncList){
          this.ondispose.__removeFuncList.forEach(
            (v,ndx)=>{
              if('number'===typeof v){
                try{wasm.uninstallFunction(v)}
                catch(e){/*ignore*/}
              }
              /* else it's a descriptive label for the next number in
                 the list. */
            }
          );
          delete this.ondispose.__removeFuncList;
        }
      };
    }/*static init*/
    const sigN = tgt.memberSignature(name);
    if(sigN.length<2){
      toss("Member",name,"does not have a function pointer signature:",sigN);
    }
    const memKey = tgt.memberKey(name);
    const fProxy = (applyArgcCheck && !wasm.isPtr(func))
    /** This middle-man proxy is only for use during development, to
        confirm that we always pass the proper number of
        arguments. We know that the C-level code will always use the
        correct argument count. */
          ? callee.argcProxy(tgt, memKey, func, sigN)
          : func;
    if(wasm.isPtr(fProxy)){
      if(fProxy && !wasm.functionEntry(fProxy)){
        toss("Pointer",fProxy,"is not a WASM function table entry.");
      }
      tgt[memKey] = fProxy;
    }else{
      const pFunc = wasm.installFunction(fProxy, tgt.memberSignature(name, true));
      tgt[memKey] = pFunc;
      if(!tgt.ondispose || !tgt.ondispose.__removeFuncList){
        tgt.addOnDispose('ondispose.__removeFuncList handler',
                         callee.removeFuncList);
        tgt.ondispose.__removeFuncList = [];
      }
      tgt.ondispose.__removeFuncList.push(memKey, pFunc);
    }
    return (n,f)=>callee(tgt, n, f, applyArgcCheck);
  }/*installMethod*/;
  installMethod.installMethodArgcCheck = false;

  /**
     Installs methods into the given StructType-type instance. Each
     entry in the given methods object must map to a known member of
     the given StructType, else an exception will be triggered.  See
     installMethod() for more details, including the semantics of the
     3rd argument.

     As an exception to the above, if any two or more methods in the
     2nd argument are the exact same function, installMethod() is
     _not_ called for the 2nd and subsequent instances, and instead
     those instances get assigned the same method pointer which is
     created for the first instance. This optimization is primarily to
     accommodate special handling of sqlite3_module::xConnect and
     xCreate methods.

     On success, returns its first argument. Throws on error.
  */
  const installMethods = function(
    structInstance, methods, applyArgcCheck = installMethod.installMethodArgcCheck
  ){
    const seen = new Map /* map of <Function, memberName> */;
    for(const k of Object.keys(methods)){
      const m = methods[k];
      const prior = seen.get(m);
      if(prior){
        const mkey = structInstance.memberKey(k);
        structInstance[mkey] = structInstance[structInstance.memberKey(prior)];
      }else{
        installMethod(structInstance, k, m, applyArgcCheck);
        seen.set(m, k);
      }
    }
    return structInstance;
  };

  /**
     Equivalent to calling installMethod(this,...arguments) with a
     first argument of this object. If called with 1 or 2 arguments
     and the first is an object, it's instead equivalent to calling
     installMethods(this,...arguments).
  */
  StructBinder.StructType.prototype.installMethod = function callee(
    name, func, applyArgcCheck = installMethod.installMethodArgcCheck
  ){
    return (arguments.length < 3 && name && 'object'===typeof name)
      ? installMethods(this, ...arguments)
      : installMethod(this, ...arguments);
  };

  /**
     Equivalent to calling installMethods() with a first argument
     of this object.
  */
  StructBinder.StructType.prototype.installMethods = function(
    methods, applyArgcCheck = installMethod.installMethodArgcCheck
  ){
    return installMethods(this, methods, applyArgcCheck);
  };

  /**
     Uses sqlite3_vfs_register() to register this
     sqlite3.capi.sqlite3_vfs. This object must have already been
     filled out properly. If the first argument is truthy, the VFS is
     registered as the default VFS, else it is not.

     On success, returns this object. Throws on error.
  */
  capi.sqlite3_vfs.prototype.registerVfs = function(asDefault=false){
    if(!(this instanceof sqlite3.capi.sqlite3_vfs)){
      toss("Expecting a sqlite3_vfs-type argument.");
    }
    const rc = capi.sqlite3_vfs_register(this, asDefault ? 1 : 0);
    if(rc){
      toss("sqlite3_vfs_register(",this,") failed with rc",rc);
    }
    if(this.pointer !== capi.sqlite3_vfs_find(this.$zName)){
      toss("BUG: sqlite3_vfs_find(vfs.$zName) failed for just-installed VFS",
           this);
    }
    return this;
  };

  /**
     A wrapper for installMethods() or registerVfs() to reduce
     installation of a VFS and/or its I/O methods to a single
     call.

     Accepts an object which contains the properties "io" and/or
     "vfs", each of which is itself an object with following properties:

     - `struct`: an sqlite3.StructType-type struct. This must be a
       populated (except for the methods) object of type
       sqlite3_io_methods (for the "io" entry) or sqlite3_vfs (for the
       "vfs" entry).

     - `methods`: an object mapping sqlite3_io_methods method names
       (e.g. 'xClose') to JS implementations of those methods. The JS
       implementations must be call-compatible with their native
       counterparts.

     For each of those object, this function passes its (`struct`,
     `methods`, (optional) `applyArgcCheck`) properties to
     installMethods().

     If the `vfs` entry is set then:

     - Its `struct` property's registerVfs() is called. The
       `vfs` entry may optionally have an `asDefault` property, which
       gets passed as the argument to registerVfs().

     - If `struct.$zName` is falsy and the entry has a string-type
       `name` property, `struct.$zName` is set to the C-string form of
       that `name` value before registerVfs() is called. That string
       gets added to the on-dispose state of the struct.

     On success returns this object. Throws on error.
  */
  vfs.installVfs = function(opt){
    let count = 0;
    const propList = ['io','vfs'];
    for(const key of propList){
      const o = opt[key];
      if(o){
        ++count;
        installMethods(o.struct, o.methods, !!o.applyArgcCheck);
        if('vfs'===key){
          if(!o.struct.$zName && 'string'===typeof o.name){
            o.struct.addOnDispose(
              o.struct.$zName = wasm.allocCString(o.name)
            );
          }
          o.struct.registerVfs(!!o.asDefault);
        }
      }
    }
    if(!count) toss("Misuse: installVfs() options object requires at least",
                    "one of:", propList);
    return this;
  };

  /**
     Internal factory function for xVtab and xCursor impls.
  */
  const __xWrapFactory = function(methodName,StructType){
    return function(ptr,removeMapping=false){
      if(0===arguments.length) ptr = new StructType;
      if(ptr instanceof StructType){
        //T.assert(!this.has(ptr.pointer));
        this.set(ptr.pointer, ptr);
        return ptr;
      }else if(!wasm.isPtr(ptr)){
        sqlite3.SQLite3Error.toss("Invalid argument to",methodName+"()");
      }
      let rc = this.get(ptr);
      if(removeMapping) this.delete(ptr);
      return rc;
    }.bind(new Map);
  };

  /**
     A factory function which implements a simple lifetime manager for
     mappings between C struct pointers and their JS-level wrappers.
     The first argument must be the logical name of the manager
     (e.g. 'xVtab' or 'xCursor'), which is only used for error
     reporting. The second must be the capi.XYZ struct-type value,
     e.g. capi.sqlite3_vtab or capi.sqlite3_vtab_cursor.

     Returns an object with 4 methods: create(), get(), unget(), and
     dispose(), plus a StructType member with the value of the 2nd
     argument. The methods are documented in the body of this
     function.
  */
  const StructPtrMapper = function(name, StructType){
    const __xWrap = __xWrapFactory(name,StructType);
    /**
       This object houses a small API for managing mappings of (`T*`)
       to StructType<T> objects, specifically within the lifetime
       requirements of sqlite3_module methods.
    */
    return Object.assign(Object.create(null),{
      /** The StructType object for this object's API. */
      StructType,
      /**
         Creates a new StructType object, writes its `pointer`
         value to the given output pointer, and returns that
         object. Its intended usage depends on StructType:

         sqlite3_vtab: to be called from sqlite3_module::xConnect()
         or xCreate() implementations.

         sqlite3_vtab_cursor: to be called from xOpen().

         This will throw if allocation of the StructType instance
         fails or if ppOut is not a pointer-type value.
      */
      create: (ppOut)=>{
        const rc = __xWrap();
        wasm.pokePtr(ppOut, rc.pointer);
        return rc;
      },
      /**
         Returns the StructType object previously mapped to the
         given pointer using create(). Its intended usage depends
         on StructType:

         sqlite3_vtab: to be called from sqlite3_module methods which
         take a (sqlite3_vtab*) pointer _except_ for
         xDestroy()/xDisconnect(), in which case unget() or dispose().

         sqlite3_vtab_cursor: to be called from any sqlite3_module methods
         which take a `sqlite3_vtab_cursor*` argument except xClose(),
         in which case use unget() or dispose().

         Rule to remember: _never_ call dispose() on an instance
         returned by this function.
      */
      get: (pCObj)=>__xWrap(pCObj),
      /**
         Identical to get() but also disconnects the mapping between the
         given pointer and the returned StructType object, such that
         future calls to this function or get() with the same pointer
         will return the undefined value. Its intended usage depends
         on StructType:

         sqlite3_vtab: to be called from sqlite3_module::xDisconnect() or
         xDestroy() implementations or in error handling of a failed
         xCreate() or xConnect().

         sqlite3_vtab_cursor: to be called from xClose() or during
         cleanup in a failed xOpen().

         Calling this method obligates the caller to call dispose() on
         the returned object when they're done with it.
      */
      unget: (pCObj)=>__xWrap(pCObj,true),
      /**
         Works like unget() plus it calls dispose() on the
         StructType object.
      */
      dispose: (pCObj)=>{
        const o = __xWrap(pCObj,true);
        if(o) o.dispose();
      }
    });
  };

  /**
     A lifetime-management object for mapping `sqlite3_vtab*`
     instances in sqlite3_module methods to capi.sqlite3_vtab
     objects.

     The API docs are in the API-internal StructPtrMapper().
  */
  vtab.xVtab = StructPtrMapper('xVtab', capi.sqlite3_vtab);

  /**
     A lifetime-management object for mapping `sqlite3_vtab_cursor*`
     instances in sqlite3_module methods to capi.sqlite3_vtab_cursor
     objects.

     The API docs are in the API-internal StructPtrMapper().
  */
  vtab.xCursor = StructPtrMapper('xCursor', capi.sqlite3_vtab_cursor);

  /**
     Convenience form of creating an sqlite3_index_info wrapper,
     intended for use in xBestIndex implementations. Note that the
     caller is expected to call dispose() on the returned object
     before returning. Though not _strictly_ required, as that object
     does not own the pIdxInfo memory, it is nonetheless good form.
  */
  vtab.xIndexInfo = (pIdxInfo)=>new capi.sqlite3_index_info(pIdxInfo);

  /**
     Given an error object, this function returns
     sqlite3.capi.SQLITE_NOMEM if (e instanceof
     sqlite3.WasmAllocError), else it returns its
     second argument. Its intended usage is in the methods
     of a sqlite3_vfs or sqlite3_module:

     ```
     try{
      let rc = ...
      return rc;
     }catch(e){
       return sqlite3.vtab.exceptionToRc(e, sqlite3.capi.SQLITE_XYZ);
       // where SQLITE_XYZ is some call-appropriate result code.
     }
     ```
  */
  /**vfs.exceptionToRc = vtab.exceptionToRc =
    (e, defaultRc=capi.SQLITE_ERROR)=>(
      (e instanceof sqlite3.WasmAllocError)
        ? capi.SQLITE_NOMEM
        : defaultRc
    );*/

  /**
     Given an sqlite3_module method name and error object, this
     function returns sqlite3.capi.SQLITE_NOMEM if (e instanceof
     sqlite3.WasmAllocError), else it returns its second argument. Its
     intended usage is in the methods of a sqlite3_vfs or
     sqlite3_module:

     ```
     try{
      let rc = ...
      return rc;
     }catch(e){
       return sqlite3.vtab.xError(
                'xColumn', e, sqlite3.capi.SQLITE_XYZ);
       // where SQLITE_XYZ is some call-appropriate result code.
     }
     ```

     If no 3rd argument is provided, its default depends on
     the error type:

     - An sqlite3.WasmAllocError always resolves to capi.SQLITE_NOMEM.

     - If err is an SQLite3Error then its `resultCode` property
       is used.

     - If all else fails, capi.SQLITE_ERROR is used.

     If xError.errorReporter is a function, it is called in
     order to report the error, else the error is not reported.
     If that function throws, that exception is ignored.
  */
  vtab.xError = function f(methodName, err, defaultRc){
    if(f.errorReporter instanceof Function){
      try{f.errorReporter("sqlite3_module::"+methodName+"(): "+err.message);}
      catch(e){/*ignored*/}
    }
    let rc;
    if(err instanceof sqlite3.WasmAllocError) rc = capi.SQLITE_NOMEM;
    else if(arguments.length>2) rc = defaultRc;
    else if(err instanceof sqlite3.SQLite3Error) rc = err.resultCode;
    return rc || capi.SQLITE_ERROR;
  };
  vtab.xError.errorReporter = 1 ? console.error.bind(console) : false;

  /**
     "The problem" with this is that it introduces an outer function with
     a different arity than the passed-in method callback. That means we
     cannot do argc validation on these. Additionally, some methods (namely
     xConnect) may have call-specific error handling. It would be a shame to
     hard-coded that per-method support in this function.
  */
  /** vtab.methodCatcher = function(methodName, method, defaultErrRc=capi.SQLITE_ERROR){
    return function(...args){
      try { method(...args); }
      }catch(e){ return vtab.xError(methodName, e, defaultRc) }
  };
  */

  /**
     A helper for sqlite3_vtab::xRowid() and xUpdate()
     implementations. It must be passed the final argument to one of
     those methods (an output pointer to an int64 row ID) and the
     value to store at the output pointer's address. Returns the same
     as wasm.poke() and will throw if the 1st or 2nd arguments
     are invalid for that function.

     Example xRowid impl:

     ```
     const xRowid = (pCursor, ppRowid64)=>{
       const c = vtab.xCursor(pCursor);
       vtab.xRowid(ppRowid64, c.myRowId);
       return 0;
     };
     ```
  */
  vtab.xRowid = (ppRowid64, value)=>wasm.poke(ppRowid64, value, 'i64');

  /**
     A helper to initialize and set up an sqlite3_module object for
     later installation into individual databases using
     sqlite3_create_module(). Requires an object with the following
     properties:

     - `methods`: an object containing a mapping of properties with
       the C-side names of the sqlite3_module methods, e.g. xCreate,
       xBestIndex, etc., to JS implementations for those functions.
       Certain special-case handling is performed, as described below.

     - `catchExceptions` (default=false): if truthy, the given methods
       are not mapped as-is, but are instead wrapped inside wrappers
       which translate exceptions into result codes of SQLITE_ERROR or
       SQLITE_NOMEM, depending on whether the exception is an
       sqlite3.WasmAllocError. In the case of the xConnect and xCreate
       methods, the exception handler also sets the output error
       string to the exception's error string.

     - OPTIONAL `struct`: a sqlite3.capi.sqlite3_module() instance. If
       not set, one will be created automatically. If the current
       "this" is-a sqlite3_module then it is unconditionally used in
       place of `struct`.

     - OPTIONAL `iVersion`: if set, it must be an integer value and it
       gets assigned to the `$iVersion` member of the struct object.
       If it's _not_ set, and the passed-in `struct` object's `$iVersion`
       is 0 (the default) then this function attempts to define a value
       for that property based on the list of methods it has.

     If `catchExceptions` is false, it is up to the client to ensure
     that no exceptions escape the methods, as doing so would move
     them through the C API, leading to undefined
     behavior. (vtab.xError() is intended to assist in reporting
     such exceptions.)

     Certain methods may refer to the same implementation. To simplify
     the definition of such methods:

     - If `methods.xConnect` is `true` then the value of
       `methods.xCreate` is used in its place, and vice versa. sqlite
       treats xConnect/xCreate functions specially if they are exactly
       the same function (same pointer value).

     - If `methods.xDisconnect` is true then the value of
       `methods.xDestroy` is used in its place, and vice versa.

     This is to facilitate creation of those methods inline in the
     passed-in object without requiring the client to explicitly get a
     reference to one of them in order to assign it to the other
     one.

     The `catchExceptions`-installed handlers will account for
     identical references to the above functions and will install the
     same wrapper function for both.

     The given methods are expected to return integer values, as
     expected by the C API. If `catchExceptions` is truthy, the return
     value of the wrapped function will be used as-is and will be
     translated to 0 if the function returns a falsy value (e.g. if it
     does not have an explicit return). If `catchExceptions` is _not_
     active, the method implementations must explicitly return integer
     values.

     Throws on error. On success, returns the sqlite3_module object
     (`this` or `opt.struct` or a new sqlite3_module instance,
     depending on how it's called).
  */
  vtab.setupModule = function(opt){
    let createdMod = false;
    const mod = (this instanceof capi.sqlite3_module)
          ? this : (opt.struct || (createdMod = new capi.sqlite3_module()));
    try{
      const methods = opt.methods || toss("Missing 'methods' object.");
      for(const e of Object.entries({
        // -----^ ==> [k,v] triggers a broken code transformation in
        // some versions of the emsdk toolchain.
        xConnect: 'xCreate', xDisconnect: 'xDestroy'
      })){
        // Remap X=true to X=Y for certain X/Y combinations
        const k = e[0], v = e[1];
        if(true === methods[k]) methods[k] = methods[v];
        else if(true === methods[v]) methods[v] = methods[k];
      }
      if(opt.catchExceptions){
        const fwrap = function(methodName, func){
          if(['xConnect','xCreate'].indexOf(methodName) >= 0){
            return function(pDb, pAux, argc, argv, ppVtab, pzErr){
              try{return func(...arguments) || 0}
              catch(e){
                if(!(e instanceof sqlite3.WasmAllocError)){
                  wasm.dealloc(wasm.peekPtr(pzErr));
                  wasm.pokePtr(pzErr, wasm.allocCString(e.message));
                }
                return vtab.xError(methodName, e);
              }
            };
          }else{
            return function(...args){
              try{return func(...args) || 0}
              catch(e){
                return vtab.xError(methodName, e);
              }
            };
          }
        };
        const mnames = [
          'xCreate', 'xConnect', 'xBestIndex', 'xDisconnect',
          'xDestroy', 'xOpen', 'xClose', 'xFilter', 'xNext',
          'xEof', 'xColumn', 'xRowid', 'xUpdate',
          'xBegin', 'xSync', 'xCommit', 'xRollback',
          'xFindFunction', 'xRename', 'xSavepoint', 'xRelease',
          'xRollbackTo', 'xShadowName'
        ];
        const remethods = Object.create(null);
        for(const k of mnames){
          const m = methods[k];
          if(!(m instanceof Function)) continue;
          else if('xConnect'===k && methods.xCreate===m){
            remethods[k] = methods.xCreate;
          }else if('xCreate'===k && methods.xConnect===m){
            remethods[k] = methods.xConnect;
          }else{
            remethods[k] = fwrap(k, m);
          }
        }
        installMethods(mod, remethods, false);
      }else{
        // No automatic exception handling. Trust the client
        // to not throw.
        installMethods(
          mod, methods, !!opt.applyArgcCheck/*undocumented option*/
        );
      }
      if(0===mod.$iVersion){
        let v;
        if('number'===typeof opt.iVersion) v = opt.iVersion;
        else if(mod.$xShadowName) v = 3;
        else if(mod.$xSavePoint || mod.$xRelease || mod.$xRollbackTo) v = 2;
        else v = 1;
        mod.$iVersion = v;
      }
    }catch(e){
      if(createdMod) createdMod.dispose();
      throw e;
    }
    return mod;
  }/*setupModule()*/;

  /**
     Equivalent to calling vtab.setupModule() with this sqlite3_module
     object as the call's `this`.
  */
  capi.sqlite3_module.prototype.setupModule = function(opt){
    return vtab.setupModule.call(this, opt);
  };
}/*sqlite3ApiBootstrap.initializers.push()*/);
/* END FILE: api/sqlite3-v-helper.js */
/* BEGIN FILE: api/sqlite3-vfs-opfs.c-pp.js */
/* The OPFS VFS parts are elided from builds targeting node.js. */
/* END FILE: api/sqlite3-vfs-opfs.c-pp.js */
/* BEGIN FILE: api/sqlite3-vfs-opfs-sahpool.c-pp.js */
/*
  The OPFS SAH Pool VFS parts are elided from builds targeting
  node.js.
*/
/* END FILE: api/sqlite3-vfs-opfs-sahpool.c-pp.js */
/* BEGIN FILE: api/sqlite3-api-cleanup.js */
/*
  2022-07-22

  The author disclaims copyright to this source code.  In place of a
  legal notice, here is a blessing:

  *   May you do good and not evil.
  *   May you find forgiveness for yourself and forgive others.
  *   May you share freely, never taking more than you give.

  ***********************************************************************

  This file is the tail end of the sqlite3-api.js constellation,
  intended to be appended after all other sqlite3-api-*.js files so
  that it can finalize any setup and clean up any global symbols
  temporarily used for setting up the API's various subsystems.
*/
'use strict';
if('undefined' !== typeof Module){ // presumably an Emscripten build
  /**
     Install a suitable default configuration for sqlite3ApiBootstrap().
  */
  const SABC = Object.assign(
    Object.create(null), {
      exports: ('undefined'===typeof wasmExports)
        ? Module['asm']/* emscripten <=3.1.43 */
        : wasmExports  /* emscripten >=3.1.44 */,
      memory: Module.wasmMemory /* gets set if built with -sIMPORTED_MEMORY */
    },
    globalThis.sqlite3ApiConfig || {}
  );

  /**
     For current (2022-08-22) purposes, automatically call
     sqlite3ApiBootstrap().  That decision will be revisited at some
     point, as we really want client code to be able to call this to
     configure certain parts. Clients may modify
     globalThis.sqlite3ApiBootstrap.defaultConfig to tweak the default
     configuration used by a no-args call to sqlite3ApiBootstrap(),
     but must have first loaded their WASM module in order to be
     able to provide the necessary configuration state.
  */
  //console.warn("globalThis.sqlite3ApiConfig = ",globalThis.sqlite3ApiConfig);
  globalThis.sqlite3ApiConfig = SABC;
  let sqlite3;
  try{
    sqlite3 = globalThis.sqlite3ApiBootstrap();
  }catch(e){
    console.error("sqlite3ApiBootstrap() error:",e);
    throw e;
  }finally{
    delete globalThis.sqlite3ApiBootstrap;
    delete globalThis.sqlite3ApiConfig;
  }

  Module.sqlite3 = sqlite3 /* Needed for customized sqlite3InitModule() to be able to
                              pass the sqlite3 object off to the client. */;
}else{
  console.warn("This is not running in an Emscripten module context, so",
               "globalThis.sqlite3ApiBootstrap() is _not_ being called due to lack",
               "of config info for the WASM environment.",
               "It must be called manually.");
}
/* END FILE: api/sqlite3-api-cleanup.js */
/* END FILE: ./bld/sqlite3-api.c-pp.js */
/* BEGIN FILE: api/post-js-footer.js */
/* The current function scope was opened via post-js-header.js, which
   gets prepended to this at build-time. This file closes that
   scope. */
})/*postRun.push(...)*/;
/* END FILE: api/post-js-footer.js */