/*
 * jQuery Plugin 
 * Copyright 2015, Sergio León
 * http://panicoenlaxbox.blogspot.com/
 */
(function ($) {
    "use strict";

    var openedTriggers = [];

    $(document).on("click.slidingPanel", function (e) {
        if (openedTriggers.length === 0 || !$.contains(document, e.target)) {
            return;
        }
        var trigger = openedTriggers[openedTriggers.length - 1];
        var data = $(trigger).data("_slidingPanel");
        if (data.overlay.modal || data.slidingPanel === e.target) {
            return;
        }
        if ((data._overlay && $(e.target).is(data._overlay)) || !$.contains(data.slidingPanel, e.target)) {
            close.call(trigger);
            return;
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

    function setOrRemoveAttr($el, name, value) {
        if (value) {
            $el.attr(name, value);
        } else {
            $el.removeAttr(name, value);
        }
    }

    function getFoundSelectorOrParentElement(el, selector) {
        if (!selector) {
            return el;
        }
        var $el = $(selector, el);
        if ($el.length === 1) {
            return $el[0];
        }
        return el;
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
        var data = $trigger.data("_slidingPanel");
        data._opened = true;
        var trigger = $trigger[0];
        if (!data._parentTrigger) {
            openedTriggers = [trigger];
        } else {
            openedTriggers.push(trigger);
        }
        (data.events.onOpen || $.noop)(trigger, data.slidingPanel);
        var cancelIfSelectorExists = data.ajax.cancelIfSelectorExists;
        var loadUrl = data.ajax.url && (!cancelIfSelectorExists || ($(cancelIfSelectorExists, data.slidingPanel).length === 0));
        if (loadUrl) {
            var el = getFoundSelectorOrParentElement(data.slidingPanel, data.ajax.appendToSelector);
            if (data.ajax.emptyBeforeLoad) {
                $(el).empty();
            }
            $(el).block();
            load(el, data.ajax.url).done(function (_data, textStatus, jqXHR) {
                (data.events.onAjaxDone || $.noop)(trigger, data.slidingPanel, el, _data, textStatus, jqXHR);
            }).fail(function (jqXHR, textStatus, errorThrown) {
                (data.events.onAjaxFail || $.noop)(trigger, data.slidingPanel, jqXHR, textStatus, errorThrown);
            }).always(function () {
                $(el).unblock();
            });
        }
    }

    function convertToPx($el, value) {
        if (isPercentage(value)) {
            value = getWidthFromPercentage($el, value);
        } else {
            value = parseInt(value);
        }
        return value;
    }

    function isPercentage(value) {
        return value.toString()[value.length - 1] === "%";
    }

    function getWidthFromPercentage($el, percentage) {
        var width = $el.parent().outerWidth();
        return ((parseInt(percentage) * width) / 100);
    }

    function positioning($el, position, offset) {
        // http://api.jqueryui.com/position/
        $el.position({
            my: position.my,
            at: position.at,
            of: position.of,
            collision: position.collision
        });
        var currentPosition = $el.position();
        $el.css({
            top: (currentPosition.top + convertToPx($el, offset.top)) + "px",
            left: (currentPosition.left + convertToPx($el, offset.left)) + "px"
        });
    }

    function createOverlay($slidingPanel, opacity, offset) {
        var $trigger = $($slidingPanel.data("_slidingPanel").trigger);
        var data = $trigger.data("_slidingPanel");
        var zIndex = parseInt($slidingPanel.css("z-index")) - 1;
        return $("<div />", {
            "data-role": "sliding-panel-overlay",
            css: {
                "position": "fixed",
                "top": offset.top,
                "right": 0,
                "left": offset.left,
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
        var data = $trigger.data("_slidingPanel");
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
        if ((data.events.onBeforeOpen || $.noop)(this, data.slidingPanel, data._slidingParentPanel) === false) {
            return false;
        }
        $trigger.addClass("sliding-panel-trigger-opened");
        var $slidingPanel = $(data.slidingPanel);
        $slidingPanel.addClass("sliding-panel-opened");
        var zIndex;
        if (data._slidingParentPanel) {
            zIndex = parseInt($(data._slidingParentPanel).css("z-index"), 10) + 1;
        } else {
            zIndex = data.zIndex;
        }
        $slidingPanel.css("z-index", zIndex).show();
        if (data._positioning) {
            positioning($slidingPanel, data.position, data.offset);
            if (data.fullScreenHeight.active) {
                var height = "100%";
                if (data.fullScreenHeight.top) {
                    height = "calc(100% - " + data.fullScreenHeight.top + ")";
                }
                $slidingPanel.css({
                    "top": data.fullScreenHeight.top,
                    "height": height
                });
            }
        }
        if (data.removeBodyOverflow) {
            data._original.bodyOverflow = $("body").css("overflow");
            $("body").css("overflow", "hidden");
        }
        var opacity = data.overlay.style.opacity;
        if (data.overlay.transparentOpacityIfNotFirst && $("[data-role='sliding-panel-overlay']:visible").length > 0) {
            opacity = 0;
        }
        if (data.overlay.active) {
            var $overlay = createOverlay($slidingPanel, opacity, {
                top: data.overlay.offset.top,
                left: data.overlay.offset.left
            });
            $("body").append($overlay);
            data._overlay = $overlay[0];
        }
        animation = animation === undefined ? data.animation.active : animation;
        if (animation) {
            $slidingPanel.hide().show("slide", {
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
        var data = $trigger.data("_slidingPanel");
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
        if ((data.events.onBeforeClose || $.noop)(this, data.slidingPanel) === false) {
            return false;
        }
        $trigger.removeClass("sliding-panel-trigger-opened");
        if (data._overlay) {
            $(data._overlay).remove();
            delete data._overlay;
        }
        var $slidingPanel = $(data.slidingPanel);
        $slidingPanel.removeClass("sliding-panel-opened").hide();
        data._opened = false;
        openedTriggers.pop();
        if (data._original.bodyOverflow) {
            $("body").css("overflow", data._original.bodyOverflow);
        }
        if (data.events.onClose) {
            data.events.onClose(this, data.slidingPanel, data._slidingParentPanel);
        }
        if (data.destroyOnClose) {
            destroy.call(this);
        }
        return true;
    }

    function destroy() {
        var $trigger = $(this);
        var data = $trigger.data("_slidingPanel");
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
                var _parentChildTriggers = $(data._parentTrigger).data("_slidingPanel")._childTriggers;
                var index = $.inArray(this, _parentChildTriggers);
                _parentChildTriggers.splice(index, 1);
            }
            var $slidingPanel = $(data.slidingPanel);
            setOrRemoveAttr($slidingPanel, "style", data._original.slidingPanel.style);
            setOrRemoveAttr($slidingPanel, "class", data._original.slidingPanel.class);
            $slidingPanel.removeData("_slidingPanel");
            $slidingPanel.off(".slidingPanel");
            setOrRemoveAttr($trigger, "style", data._original.trigger.style);
            setOrRemoveAttr($trigger, "class", data._original.trigger.class);
            $trigger.removeData("_slidingPanel");
            $trigger.off(".slidingPanel");
        }
    }

    var methods = {
        init: function (options) {
            // this jQuery object
            return this.each(function () {
                // this DOM element
                var $trigger = $(this);
                var settings = $.extend(true, {}, $.fn.slidingPanel.defaults, $.dataset.parse($trigger.data()), options);
                if (!$trigger.data("_slidingPanel")) {
                    if (!settings.position.of) {
                        settings.position.of = this;
                    } else if (typeof settings.position.of === "function") {
                        settings.position.of = settings.position.of(this);
                    } else if (typeof settings.position.of === "string") {
                        settings.position.of = $(settings.position.of)[0];
                    } else {
                        settings.position.of = getDomElement(settings.position.of);
                    }
                    if (typeof (settings.slidingPanel) === "string") {
                        settings.slidingPanel = $(settings.slidingPanel);
                    }
                    settings.slidingPanel = getDomElement(settings.slidingPanel);
                    var $slidingPanel = $(settings.slidingPanel);
                    if (typeof (settings.parentTrigger) === "string") {
                        settings.parentTrigger = $(settings.parentTrigger);
                    }
                    if (settings.parentTrigger) {
                        var $parentTrigger = getjQueryElement(settings.parentTrigger);
                        settings._parentTrigger = $parentTrigger[0];
                        var parentTriggerData = $parentTrigger.data("_slidingPanel");
                        settings._slidingParentPanel = parentTriggerData.slidingPanel;
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
                        slidingPanel: {
                            class: $slidingPanel.attr("class"),
                            style: $slidingPanel.attr("style")
                        }
                    };
                    $trigger.addClass("sliding-panel-trigger").on("click.slidingPanel", function (e) {
                        if (!settings._opened) {
                            open.call($trigger[0], e);
                        } else {
                            close.call($trigger[0], e);
                        }
                        e.stopPropagation();
                    });
                    if (settings.fullScreen || settings.fullScreenHeight.active) {
                        settings.sticky = true;
                    }
                    $slidingPanel.hide().addClass("sliding-panel").css({
                        "position": (settings.sticky ? "fixed" : "absolute")
                    });
                    if (settings.fullScreen) {
                        $slidingPanel.css({
                            "top": "0",
                            "left": "0",
                            "width": "100%",
                            "height": "100%"
                        });
                    } else if (settings.centered) {
                        $slidingPanel.css({
                            "top": "50%",
                            "left": "50%",
                            "transform": "translate(-50%, -50%)"
                        });
                    }
                    if (settings.fullScreen || settings.centered) {
                        settings.animation.active = false;
                    }
                    if (settings.fullScreen || settings.overlay.modal) {
                        settings.removeBodyOverflow = true;
                    }
                    if (settings.overlay.modal) {
                        settings.overlay.active = true;
                        settings.overlay.offset.top = 0;
                        settings.overlay.offset.left = 0;
                    }
                    settings._positioning = !settings.fullScreen && !settings.centered;
                    $slidingPanel.on("click.slidingPanel", function (e) {
                        if ($(e.target).is(settings.closeSelector)) {
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
                    $trigger.data("_slidingPanel", settings);
                    $slidingPanel.data("_slidingPanel", {
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

    $.fn.slidingPanel = function (method) {
        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === "object" || !method) {
            return methods.init.apply(this, arguments);
        } else {
            $.error("Method " + method + " does not exist on jQuery.slidingPanel");
        }
    };

    $.fn.slidingPanel.defaults = {
        destroyOnClose: false,
        animation: {
            active: true,
            direction: "up",
            duration: "fast"
        },
        ajax: {
            cancelIfSelectorExists: null,
            emptyBeforeLoad: false,
            appendToSelector: null,
            url: null
        },
        closeSelector: ".close,[data-role='close']",
        events: {
            onAjaxDone: null,
            onAjaxFail: null,
            onBeforeClose: null,
            onBeforeOpen: null,
            onClose: null,
            onOpen: null
        },
        overlay: {
            active: false,
            modal: false,
            offset: {
                top: 0,
                left: 0
            },
            transparentOpacityIfNotFirst: true,
            style: {
                backgroundColor: "#000",
                opacity: 0.5
            }
        },
        offset: {
            left: 0,
            top: 0
        },
        slidingPanel: null,
        parentTrigger: null,
        position: {
            my: "left top", // default "center"
            at: "left bottom", // default "center"
            of: null,
            collision: "none none" //default "flip"
        },
        removeBodyOverflow: false,
        sticky: false,
        zIndex: 500,
        fullScreen: false,
        fullScreenHeight: {
            active: false,
            top: 0
        },
        centered: false
    };

    $.extend({
        slidingPanel: (function () {
            return {
                initialize: function () {
                    $("[data-role='sliding-panel-trigger']").slidingPanel();
                }
            }
        })()
    });
})(jQuery);