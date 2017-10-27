/*
 * jQuery Plugin 
 * Copyright 2015, Sergio León
 * http://panicoenlaxbox.blogspot.com/
 */
(function ($) {
    "use strict";

    var pluginName = "panel";
    var pluginKey = "_" + pluginName;

    var openedTriggers = [];

    $(document).on("click." + pluginName, function (e) {
        if (openedTriggers.length === 0) {
            return;
        }
        if (!$.contains(document, e.target)) {
            return;
        }
        var currentOpenedTrigger = openedTriggers[openedTriggers.length - 1];
        var $target = $(e.target);
        var data = $(currentOpenedTrigger).data(pluginKey);
        if ($target.is(data._overlay) && !data.overlay.modal) {
            close.call(currentOpenedTrigger);
        }
    });

    function getjQueryElement(el) {
        if (el instanceof jQuery) {
            return el;
        }
        return $(el);
    }

    function getDomElement(el) {
        if (el instanceof jQuery) {
            return el[0];
        }
        return el;
    }

    function restoreOriginalAttr($el, name, value) {
        if (value) {
            $el.attr(name, value);
        } else {
            $el.removeAttr(name, value);
        }
    }

    function getAjaxRecipientElement(panel, appendContentToSelector) {
        if (!appendContentToSelector) {
            return panel;
        }
        var $el = $(appendContentToSelector, panel);
        if ($el.length === 1) {
            return $el[0];
        }
        return panel;
    }

    function load(el, url) {
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

    function openedPanel($trigger) {
        var data = $trigger.data(pluginKey);
        data._opened = true;
        var trigger = $trigger[0];
        if (!data._parentTrigger) {
            openedTriggers = [trigger];
        } else {
            openedTriggers.push(trigger);
        }
        (data.events.onOpen || $.noop)(trigger, data.panel);
        var loadIfSelectorNotExist = data.ajax.loadIfSelectorNotExist;
        var loadUrl = data.ajax.url && (!loadIfSelectorNotExist || ($(loadIfSelectorNotExist, data.panel).length === 0));
        if (loadUrl) {
            var el = getAjaxRecipientElement(data.panel, data.ajax.appendContentToSelector);
            if (data.ajax.removeContentBeforeLoad) {
                $(el).empty();
            }
            $(el).block();
            load(el, data.ajax.url).done(function (_data, textStatus, jqXHR) {
                (data.events.onAjaxDone || $.noop)(trigger, data.panel, el, _data, textStatus, jqXHR);
            }).fail(function (jqXHR, textStatus, errorThrown) {
                (data.events.onAjaxFail || $.noop)(trigger, data.panel, jqXHR, textStatus, errorThrown);
            }).always(function () {
                $(el).unblock();
            });
        }
    }

    function positioning($panel, position, offset) {
        // http://api.jqueryui.com/position/
        $panel.position({
            my: position.my,
            at: position.at,
            of: position.of,
            collision: position.collision
        });
        position = $panel.position();
        $panel.css({
            top: (position.top + offset.top) + "px",
            left: (position.left + offset.left) + "px"
        });
    }

    function createOverlay($panel, opacity) {
        var $trigger = $($panel.data(pluginKey).trigger);
        var data = $trigger.data(pluginKey);
        var zIndex = parseInt($panel.css("z-index")) - 1;
        return $("<div />", {
            "data-role": pluginName + "-overlay",
            css: {
                "position": "fixed",
                "top": 0,
                "right": 0,
                "left": 0,
                "bottom": 0,
                "opacity": opacity,
                "background-color": data.overlay.style.backgroundColor,
                "z-index": zIndex
            }
        });
    }

    function open(e, animation) {
        // this DOM element
        var $trigger = $(this);
        var data = $trigger.data(pluginKey);
        if (data._opened) {
            return true;
        }
        if (!data._parentTrigger && openedTriggers.length > 0) {
            close.call(openedTriggers[0], e);
        }
        if (data._parentTrigger) {
            if (open.call(data._parentTrigger, e, false) === false)
                return false;
        }
        if ((data.events.onBeforeOpen || $.noop)(this, data.panel) === false) {
            return false;
        }
        $trigger.addClass(pluginName + "-trigger-opened");
        var $panel = $(data.panel);
        $panel.addClass(pluginName + "-opened");
        var zIndex;
        if (data._parentPanel) {
            zIndex = parseInt($(data._parentPanel).css("z-index"), 10) + 1;
        } else {
            zIndex = data.zIndex;
        }
        $panel.css("z-index", zIndex).show();
        if (!data.centered) {
            positioning($panel, data.position, data.offset);
            if (data.fillWindowHeight) {
                $panel.css({
                    height: "100%",
                    top: 0,
                    position: "fixed"
                });
            }
        }
        if (data.removeBodyOverflow || data.overlay.modal) {
            data._original.bodyOverflow = $("body").css("overflow");
            $("body").css("overflow", "hidden");
        }
        var opacity = data.overlay.style.opacity;
        if (data.overlay.removeOpacityIfNotFirst && $("[data-role='" + pluginName + "-overlay']:visible").length > 0) {
            opacity = 0;
        }
        var $overlay = createOverlay($panel, opacity);
        $("body").append($overlay);
        data._overlay = $overlay[0];
        animation = animation === undefined ? data.animation.active : animation;
        if (animation && !data.centered) {
            $panel.hide().show("slide", {
                direction: data.animation.direction
            }, data.animation.duration, function () {
                openedPanel($trigger);
            });
        } else {
            openedPanel($trigger);
        }
        return true;
    }

    function close(e) {
        // this DOM element
        var $trigger = $(this);
        var data = $trigger.data(pluginKey);
        if (!data._opened) {
            return true;
        }
        if (data._childTriggers) {
            for (var i = 0; i < data._childTriggers.length; i++) {
                if (!close.call(data._childTriggers[i], e)) {
                    return false;
                }
            }
        }
        if ((data.events.onBeforeClose || $.noop)(this, data.panel) === false) {
            return false;
        }
        $trigger.removeClass(pluginName + "-trigger-opened");
        $(data._overlay).remove();
        delete data._overlay;
        var $panel = $(data.panel);
        $panel.removeClass(pluginName + "-opened").hide();
        data._opened = false;
        openedTriggers.pop();
        if (data._original.bodyOverflow) {
            $("body").css("overflow", data._original.bodyOverflow);
        }
        if (data.events.onClose) {
            data.events.onClose(this, data.panel);
        }
        if (data.destroyOnClose) {
            destroy.call(this);
        }
        return true;
    }

    function destroy() {
        var $trigger = $(this);
        var data = $trigger.data(pluginKey);
        if (data) {
            if (data._opened) {
                close.call(this);
            }
            if (data._childTriggers) {
                for (var i = 0; i < data._childTriggers.length; i++) {
                    methods.destroy.call($(data._childTriggers[i]));
                }
            }
            if (data._parentTrigger) {
                var _parentChildTriggers = $(data._parentTrigger).data(pluginKey)._childTriggers;
                var index = $.inArray(this, _parentChildTriggers);
                _parentChildTriggers.splice(index, 1);
            }
            var $panel = $(data.panel);
            restoreOriginalAttr($panel, "style", data._original.panel.style);
            restoreOriginalAttr($panel, "class", data._original.panel.class);
            $panel.removeData(pluginKey);
            $panel.off("." + pluginName);
            restoreOriginalAttr($trigger, "style", data._original.trigger.style);
            restoreOriginalAttr($trigger, "class", data._original.trigger.class);
            $trigger.removeData(pluginKey);
            $trigger.off("." + pluginName);
        }
    }

    var methods = {
        init: function (options) {
            // this jQuery object
            return this.each(function () {
                // this DOM element
                var $trigger = $(this);
                var settings = $.extend(true, {}, $.fn.panel.defaults, parseDataSet($trigger.data()), options);
                if (!$trigger.data(pluginKey)) {
                    if (!settings.position.of) {
                        settings.position.of = this;
                    } else if (typeof settings.position.of === "function") {
                        settings.position.of = settings.position.of(this);
                    } else if (typeof settings.position.of === "string") {
                        settings.position.of = $(settings.position.of)[0];
                    } else {
                        settings.position.of = getDomElement(settings.position.of);
                    }
                    if (typeof (settings.panel) === "string") {
                        settings.panel = $(settings.panel);
                    }
                    settings.panel = getDomElement(settings.panel);
                    var $panel = $(settings.panel);
                    if (typeof (settings.parentTrigger) === "string") {
                        settings.parentTrigger = $(settings.parentTrigger);
                    }
                    if (settings.parentTrigger) {
                        var $parentTrigger = getjQueryElement(settings.parentTrigger);
                        settings._parentTrigger = $parentTrigger[0];
                        var parentTriggerData = $parentTrigger.data(pluginKey);
                        settings._parentPanel = parentTriggerData.panel;
                        if (!parentTriggerData._childTriggers) {
                            parentTriggerData._childTriggers = [];
                        }
                        parentTriggerData._childTriggers.push(this);
                    }
                    settings._original = {
                        trigger: {
                            class: $trigger.attr("class"),
                            style: $trigger.attr("style"),
                        },
                        panel: {
                            class: $panel.attr("class"),
                            style: $panel.attr("style")
                        }
                    };
                    $trigger.addClass(pluginName + "-trigger").on("click." + pluginName, function (e) {
                        if (!settings._opened) {
                            open.call($trigger[0], e);
                        } else {
                            close.call($trigger[0], e);
                        }
                        e.stopPropagation();
                    });
                    $panel.hide().addClass(pluginName).css({
                        "position": (settings.sticky ? "fixed" : "absolute")
                    });
                    if (settings.centered) {
                        $panel.css({
                            "position": "fixed",
                            "top": "50%",
                            "left": "50%",
                            "transform": "translate(-50%, -50%)"
                        });
                    }
                    $panel.on("click." + pluginName, function (e) {
                        if ($(e.target).is(settings.closePanelSelector)) {
                            close.call($trigger[0], e);
                            e.stopPropagation();
                        } else {
                            var childTriggers = settings._childTriggers;
                            if (childTriggers) {
                                for (var i = 0; i < childTriggers.length; i++) {
                                    if (!close.call(childTriggers[i], e)) {
                                        break;
                                    }
                                }
                            }
                        }
                    });
                    $trigger.data(pluginKey, settings);
                    $panel.data(pluginKey, {
                        trigger: this
                    });
                }
            });
        },
        open: function () {
            // this jQuery object
            open.call(this[0]);
        },
        close: function () {
            // this jQuery object
            close.call(this[0]);
        },
        destroy: function () {
            // this jQuery object
            return this.each(function () {
                destroy.call(this);
            });
        }
    };

    $.fn.panel = function (method) {
        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === "object" || !method) {
            return methods.init.apply(this, arguments);
        } else {
            $.error("Method " + method + " does not exist on jQuery." + pluginName);
        }
    };

    $.fn.panel.defaults = {
        destroyOnClose: false,
        animation: {
            active: true,
            direction: "up",
            duration: "fast"
        },
        ajax: {
            appendContentToSelector: null,
            loadIfSelectorNotExist: null,
            loading: false,
            removeContentBeforeLoad: false,
            url: null
        },
        closePanelSelector: "[data-role='close']",
        events: {
            onAjaxDone: null,
            onAjaxFail: null,
            onBeforeClose: null,
            onBeforeOpen: null,
            onClose: null,
            onOpen: null
        },
        fillWindowHeight: false,
        overlay: {
            modal: false,
            style: {
                backgroundColor: "#000",
                opacity: 0.5
            },
            removeOpacityIfNotFirst: true
        },
        offset: {
            left: 0,
            top: 0
        },
        panel: null,
        parentTrigger: null,
        position: {
            my: "left top", // default "center"
            at: "left bottom", // default "center"
            of: null,
            collision: "none none" //default "flip"
        },
        removeBodyOverflow: false,
        sticky: false,
        tag: null,
        zIndex: 500,
        centered: false
    };
})(jQuery);