Bluejax is a library that wraps jQuery's
[``ajax``](https://api.jquery.com/jquery.ajax/) function in [Bluebird
promises](http://bluebirdjs.com/docs/getting-started.html).

``bluejax.try`` is the part of Bluejax that deals with retrying Ajax
queries. This library does **not** wrap jQuery's ``ajax`` call in Bluebird
promises. This makes it suitable to be used to implement query retry in cases
where the code interfacing with it expects to work with a ``jqXHR`` object.

Loading ``bluejax.try``
=======================

AMD
---

Your loader should be configured so that it can find jQuery.

CommonJS
--------

Once installed, you should just be able to do ``var bluetry =
require("bluejax.try")``. jQuery should also be installed.

``script`` elements
-------------------

If you are just loading it in a browser with ``script``. jQuery must have been
loaded beforehand. Whether or not Bluejax is loaded too, ``bluejax.try`` will be
available as ``root.bluejax.try`` (where ``root`` is whatever your global scope
is).

Using ``bluejax.try``
=====================

The module exports these items:

* ``ajax(...)`` is a function that passes all its arguments to
  ``jQuery.ajax``. By default, it returns a ``jqXHR``-like object that will be
  successful if any of the tries is successful or will fail if all the tries
  fail.

* ``make(options)`` is a utility function that creates a new ``ajax``-like
  function. The ``options`` parameter is an object containing **Bluejax
  options**. (Only Bluejax options. It does not allow setting ``jQuery.ajax``
  options.) The returned value is a new function that works like ``ajax`` but
  which has its Bluejax options set to the values contained in the ``options``
  object.

* ``perform`` is a function that is meant to be used from the main code of
  Bluejax. You should not need to use it.

* ``extractBluejaxOptions`` this is another function meant to be used from the
  main code of Bluejax. You should not need to use it.

Options
-------

``bluejax.try`` currently supports these options:

* ``tries`` tells ``bluejax.try`` to retry the query for a number of times. Note
  that the value here should be a number greater than 1. (Values less than 1
  yield undefined behavior.)

* ``shouldRetry`` is a function with the following signature
  ``shouldRetry(jqXHR, textStatus, errorThrown)``. It should return ``true`` if
  the query should be retried, or ``false`` if an error should be returned
  immediately.

  If no value is specified, the default function returns ``true`` if the
  previous query failed due to reasons **other** than the HTTP status code
  reporting an error, aborted or had a parser error. Basically, it retries the
  connection if the issue appears to be at the network level rather than an
  application issue.

* ``delay`` specifies the delay between retries, in milliseconds.

There are two ways to set the options:

* You can set set the ``bluejaxOptions`` field on a settings object passed to
  ``ajax``. Remember that ``ajax(...)`` takes the same parameters as
  ``jQuery.ajax``. For instance:

      bluejax.try.ajax({
          url: "http://example.com",
          bluejaxOptions: {
              tries: 3
          }
      });

* You can create a new ``ajax``-like function with ``make``. For instance:

      var custom = bluetry.try.make({ tries: 3 });

  would create a function that would try a query 3 times by default so calling
  ``custom("http://example.com")`` would query ``http://example.com`` three
  times if the initial queries fail.

How it Works, and Limitations
=============================

(In the following we refer to the ``ajax`` call provided by ``bluejax.try`` as
``bluejax.try.ajax`` so as to clearly distinguish it from ``$.ajax``.)

While ``bluejax.try.ajax`` is meant to be a drop-in replacement for a plain
``$.ajax`` call, there may be use-case scenarios that it cannot handle.

``bluejax.try.ajax`` operates so that from the perspective of the immediate
calling code, it behave as if only a single ``$.ajax`` call had been
made. However, in reality it is possible that more than one ``$.ajax`` call will
be made, depending on whether there are errors or not. It is not possible to
simply return the ``jqXHR`` objects created by the ``$.ajax`` calls because
these would be tied to the specific iteration in which they were created rather
than the overall result of the whole operation. Besides, none of the ``jqXHR``
objects created after the 1st try are even *available* for being returned. So
``bluejax.try.ajax`` works by creating a "wrapper jqXHR" that is resolved or
rejected depending on how the tries are resolved.

The wrapper jqXHR does *not* quite behave in the same way a regular ``jqXHR``
does. For instance, none of the global Ajax events that jQuery normally fires
are fired for this wrapper. In a case where 3 tries are needed before succeess,
we'd have three real calls to ``$.ajax``, three ``jqXHR`` objects created and
one wrapper. The global events would be fired 3 times for each call to
``$.ajax``.

The wrapper also does not allow changing the parameters of an ajax request after
``bluejax.try.ajax`` returns. You could conceivably call ``setRequestHeader`` on
the ``jqXHR`` object that ``$.ajax`` returns. Immediately after the call
returns, it is *probably* still feasible to change headers. However
``bluejax.try.ajax`` does not support doing this or trying to change any of the
parameters of the query. Specifically, you can call these methods on the object
returned by ``bluejax.try.ajax``:

* ``getResponseHeader``,

* ``getAllResponseHeaders``,

* ``abort``.

Each of these are dispatched to the "latest" ``jqXHR``, i.e. the one that was
created from the latest try. The other methods that are available on a ``jqXHR``
will result in a warning printed to the console and won't do what you are trying
to do.

It is also possible to run into situations in which ``readyState`` changes on
the wrapper in a way that makes no sense from the perspective of code that
expects a regular ``jqXHR``.

Developing ``bluejax.try``
==========================

If you produce a pull request run ``gulp lint`` and ``gulp test`` first to make
sure they run clean. If you add features, do add tests.

Coverage
--------

We need a Mocha run to test loading this code as a CommonJS module with
``script`` elements. The Karma run, which exercises over 95% of the code, uses
RequireJS to load it.

Ideally, we combine the results of the Karma runs with the result of the Mocha
run. The problem though is that as we speak, ``karma-coverage`` uses Istanbul
0.4.x but to get coverage with Mocha with code that has run through Babel, we
need Istanbul 1.0.0-alpha2 or higher. We've not been able to combine the formats
produced by the various versions.

<!--
#  LocalWords:  Bluejax jQuery's ajax jQuery jquery CommonJS bluejax url jqXHR
#  LocalWords:  GeneralAjaxError getElementById innerHTML verboseResults nginx
#  LocalWords:  textStatus errorThrown HttpError TimeoutError AbortError GETs
#  LocalWords:  ParserError ConnectivityError BrowserOfflineError AjaxError xhr
#  LocalWords:  ServerDownError NetworkDownError setDefaultOptions Bluejax's
#  LocalWords:  getDefaultOptions serverURL knownServers verboseExceptions JSON
#  LocalWords:  bluejaxOptions provideXHR onLine favicon ico ttttt
-->
