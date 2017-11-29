$.fn.toggle = function () {
    // https://forum.jquery.com/topic/beginner-function-toggle-deprecated-what-to-use-instead
    var functions = arguments;
    return this.each(function () {
        var iteration = 0;
        $(this).click(function () {
            functions[iteration].apply(this, arguments);
            iteration = (iteration + 1) % functions.length;
        })
    })
};

$.fn.removeClassRegex = function (regex) {
    // https://stackoverflow.com/a/18621161
    return $(this).removeClass(function (index, className) {
        return className.split(/\s+/).filter(function (value) {
            return regex.test(value);
        }).join(' ');
    });
};

$.fn.exists = function () {
    return this.length > 0;
}

$.extend({
    delay: function (fn, predicate) {
        if (predicate()) {
            fn();
        } else {
            setTimeout(function () {
                $.delay(fn, predicate);
            }, 0);
        }
    },
    dataset: (function () {
        // http://stackoverflow.com/a/36711150
        function parse(dataset) {
            var data = {};
            for (var i = 0; i < Object.keys(dataset).length; i++) {
                var key = Object.keys(dataset)[i];
                data = parseKey(key.split('-'), dataset[key], data);
            }
            return data;
        }

        function parseKey(keys, value, data) {
            data = data || {};
            var key = _.camelCase(keys[0]);

            if (!data[key]) {
                data[key] = {};
            }

            if (keys.length > 1) {
                keys.splice(0, 1);
                data[key] = parseKey(keys, value, data[key]);
            } else {
                data[key] = value;
            }

            return data;
        }

        function remove(el) {
            var attributes = $.map(el.attributes, function (item) {
                if (item.name.indexOf("data-") == 0) {
                    return item.name;
                }
            });
            var $el = $(el);
            $.each(attributes, function (index, element) {
                $el.removeAttr(element);
            });
        }

        function restore(el, dataset) {
            remove(el);
            _restore(el, dataset, "data-")
        }

        function _restore(el, dataset, prefix) {
            var $el = $(el);
            var keys = Object.keys(dataset);
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                var value = dataset[key];
                if (typeof value === "object") {
                    _restore(el, value, (prefix || "") + key + "--")
                } else {
                    $el.attr((prefix || "") + key.toLowerCase(), value);
                }
            }
        }

        return {
            parse: parse,
            remove: remove,
            restore: restore
        };
    })(),
    loadUrl: function (el, url) {
        var selector = "";
        var i = url.indexOf(" ");
        if (i !== -1) {
            selector = url.substring(i + 1);
            url = url.substring(0, i);
        }
        var deferred = $.Deferred();
        $.ajax({
            type: "GET",
            url: url
        }).done(function (data, textStatus, jqXHR) {
            // http://api.jquery.com/jquery.parsehtml/
            // keepScripts A Boolean indicating whether to include scripts passed in the HTML string
            if (typeof (data) === "object") {
                data = JSON.stringify(data);
            }
            var value = selector ? $("<div>").append($.parseHTML(data, true)).find(selector) : data;
            $(el).html(value);
            deferred.resolve(data, textStatus, jqXHR);
        }).fail(function (jqXHR, textStatus, errorThrown) {
            deferred.reject(jqXHR, textStatus, errorThrown);
        }).always(function () {
            deferred.always();
        });
        return deferred.promise();
    }
});