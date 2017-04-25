/*
 * jQuery Plugin 
 * Copyright 2015, Sergio León
 * http://panicoenlaxbox.blogspot.com/
 */
(function ($) {
    "use strict";

    var dataKey = "_panel";

    function log(message, tag) {
        if (tag) {
            message = tag + ": " + message;
        }
        //console.log(message);
    }

    var openedTriggers = [];

    function close(e) {
        // this DOM element
        var $trigger = $(this);
        var data = $trigger.data(dataKey);
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
        log("onBeforeClose", data.tag);
        if ((data.events.onBeforeClose || $.noop)(this, data.panel) === false) {
            return false;
        }
        $trigger.removeClass("tab-panel-trigger-opened");
        $(data._overlay).remove();
        delete data._overlay;
        var $panel = $(data.panel);
        $panel.removeClass("tab-panel-opened");
        $panel.hide();
        data._opened = false;
        openedTriggers.pop();
        if (data._originalBodyOverflow) {
            $("body").css("overflow", data._originalBodyOverflow);
        }
        log("onClose", data.tag);
        if (data.events.onClose) {
            data.events.onClose(this, data.panel);
        }
        if (data.destroyOnClose) {
            destroy.call(this);
        }
        return true;
    }

    $(document).on("click.panel", function (e) {
        log("document click.panel");

        if (openedTriggers.length === 0) {
            return;
        }

        if (!$.contains(document, e.target)) {
            return;
        }

        var currentOpenedTrigger = openedTriggers[openedTriggers.length - 1];
        var $target = $(e.target);
        var data = $(currentOpenedTrigger).data(dataKey);

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
        var data = $trigger.data(dataKey);
        data._opened = true;
        var trigger = $trigger[0];
        if (!data._parentTrigger) {
            openedTriggers = [trigger];
        } else {
            openedTriggers.push(trigger);
        }
        log("onOpen", data.tag);
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
                log("onAjaxDone", data.tag);
                (data.events.onAjaxDone || $.noop)(trigger, data.panel, el, _data, textStatus, jqXHR);
            }).fail(function (jqXHR, textStatus, errorThrown) {
                (data.events.onAjaxFail || $.noop)(trigger, data.panel, jqXHR, textStatus, errorThrown);
            }).always(function () {
                calculateContentHeight($trigger);
                $(el).unblock();
            });
        } else {
            calculateContentHeight($trigger);
        }
    }

    function getMarginHeight($el) {
        // outer height (including padding, border, and optionally margin)
        // inner height (including padding but not border)
        return $el.outerHeight(true) - $el.innerHeight();
    }

    function calculateContentHeight($trigger) {
        var data = $trigger.data(dataKey);
        if (!data.calculateContentHeight.active) {
            return;
        }
        var $panel = $(data.panel);
        var selector = data.calculateContentHeight.selector;
        var $el = $panel.find(selector);
        if ($el.length === 0) {
            return;
        }
        console.log(`selector ${selector}`);
        var panelHeight = $panel.height();
        console.log(`panel height ${panelHeight}`);
        var usedHeight = getUsedHeight($panel, $el);
        console.log(`used height ${usedHeight}`);
        var availableHeight = panelHeight - usedHeight - getMarginHeight($el);
        console.log(`available height ${availableHeight}`);
        $el.css({
            overflow: "auto"
        }).height(availableHeight);
    }

    function getUsedHeight($container, $except) {
        var children = $container.children().toArray();
        var except = $except[0];
        var height = 0;
        for (var i = 0; i < children.length; i++) {
            var child = children[i];
            var $child = $(child);
            if (child === except) {
                continue;
            }
            if ($.contains(child, except)) {
                height += getMarginHeight($child);
                height += getUsedHeight($child, $except);
            } else if ($child.is(":visible") && !$child.hasClass("blockUI")) {
                var childHeight = $child.outerHeight(true);
                console.log(`sum ${childHeight} from ${$child.attr("class")}`);
                height += childHeight;
            }
        }
        return height;
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

    function open(e, animation) {
        // this DOM element
        var $trigger = $(this);
        var data = $trigger.data(dataKey);
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
        log("onBeforeOpen", data.tag);
        if ((data.events.onBeforeOpen || $.noop)(this, data.panel) === false) {
            return false;
        }
        $trigger.addClass("tab-panel-trigger-opened");
        var $panel = $(data.panel);
        $panel.addClass("tab-panel-opened");
        var zIndex;
        if (data._parentPanel) {
            zIndex = parseInt($(data._parentPanel).css("z-index"), 10) + 1;
        } else {
            zIndex = data.zIndex;
        }
        $panel.css("z-index", zIndex);
        $panel.show();
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
        if (data.removeBodyOverflow) {
            data._originalBodyOverflow = $("body").css("overflow");
            $("body").css("overflow", "hidden");
        }
        zIndex = parseInt($panel.css("z-index")) - 1;
        var opacity = data.overlay.style.opacity;
        if (data.overlay.removeOpacityIfNotFirst) {
            if ($("[data-role='panel-overlay']:visible").length > 0) {
                opacity = 0;
            }
        }
        var $overlay = $("<div />", {
            "data-role": "panel-overlay",
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
        $("body").append($overlay);
        data._overlay = $overlay[0];
        animation = animation === undefined ? data.animation.active : animation;
        if (animation && !data.centered) {
            $panel.hide();
            $panel.show("slide", {
                direction: data.animation.direction
            }, data.animation.duration, function () {
                openedPanel($trigger);
            });
        } else {
            openedPanel($trigger);
        }
        return true;
    }

    function destroy() {
        var $trigger = $(this);
        var data = $trigger.data(dataKey);
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
                var _parentChildTriggers = $(data._parentTrigger).data(dataKey)._childTriggers;
                var index = $.inArray(this, _parentChildTriggers);
                _parentChildTriggers.splice(index, 1);
            }
            var $panel = $(data.panel);
            $panel.off(".panel");
            restoreAttr($panel, "style", data._originalPanelStyle);
            restoreAttr($panel, "class", data._originalPanelClass);
            $panel.removeData(dataKey);
            $trigger.off(".panel");
            restoreAttr($trigger, "style", data._originalTriggerStyle);
            restoreAttr($trigger, "class", data._originalTriggerClass);
            $trigger.removeData(dataKey);
        }
    }

    var methods = {
        init: function (options) {
            // this jQuery object
            return this.each(function () {
                // this DOM element
                var $trigger = $(this);
                var settings = $.extend(true, {}, $.fn.panel.defaults, parseDataSet($trigger.data()), options);
                if (!$trigger.data(dataKey)) {
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
                        var parentTriggerData = $parentTrigger.data(dataKey);
                        settings._parentPanel = parentTriggerData.panel;
                        if (!parentTriggerData._childTriggers) {
                            parentTriggerData._childTriggers = [];
                        }
                        parentTriggerData._childTriggers.push(this);
                    }
                    settings._originalTriggerClass = $trigger.attr("class");
                    settings._originalTriggerStyle = $trigger.attr("style");
                    settings._originalPanelClass = $panel.attr("class");
                    settings._originalPanelStyle = $panel.attr("style");
                    $trigger.addClass("tab-panel-trigger");
                    $trigger.on("click.panel", function (e) {
                        log("trigger click.panel", settings.tag);
                        if (!settings._opened) {
                            open.call($trigger[0], e);
                        } else {
                            close.call($trigger[0], e);
                        }
                        e.stopPropagation();
                    });
                    $panel.hide().addClass("tab-panel").css({
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
                    $panel.on("click.panel", function (e) {
                        log("panel click.panel", settings.tag);
                        if ($(e.target).is(settings.closePanelSelector)) {
                            close.call($trigger[0], e);
                            e.stopPropagation();
                        } else {
                            var _childTriggers = settings._childTriggers;
                            if (_childTriggers) {
                                for (var i = 0; i < _childTriggers.length; i++) {
                                    if (!close.call(_childTriggers[i], e)) {
                                        break;
                                    }
                                }
                                //e.stopPropagation();
                            }
                        }
                    });
                    $trigger.data(dataKey, settings);
                    $panel.data(dataKey, {
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

    function restoreAttr($el, name, value) {
        if (value) {
            $el.attr(name, value)
        } else {
            $el.removeAttr(name, value);
        }
    }

    $.fn.panel = function (method) {
        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === "object" || !method) {
            return methods.init.apply(this, arguments);
        } else {
            $.error("Method " + method + " does not exist on jQuery.panel");
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
        centered: false,
        calculateContentHeight: {
            active: true,
            selector: "[data-role='content']"
        }
    };

    // $.panel.foo();
    $.extend({
        panel: (function () {
            return {
                positioning: function (panel) {
                    var $panel = getjQueryElement(panel);
                    var $trigger = $($panel.data(dataKey).trigger);
                    var data = $trigger.data(dataKey);
                    if (!data.centered) {
                        positioning($panel, data.position, data.offset);
                    }
                },
                getOpenedByTag: function (tag) {
                    for (var i = 0; i < openedTriggers.length; i++) {
                        var $trigger = $(openedTriggers[i]);
                        var data = $trigger.data(dataKey);
                        if (data.tag === tag) {
                            return {
                                trigger: $trigger[0],
                                panel: data.panel
                            };
                        }
                    }
                },
                getTrigger: function (panel) {
                    var $panel = getjQueryElement(panel);
                    var $trigger = $($panel.data(dataKey).trigger);
                    return $trigger[0];
                },
                getPanel: function (trigger) {
                    var $trigger = getjQueryElement(trigger);
                    var $panel = $($trigger.data(dataKey).panel);
                    return $panel[0];
                },
                getParentPanel: function (el) {
                    var $panel = getjQueryElement(el).closest(".tab-panel");
                    return $panel[0];
                }
            }
        })()
    });
})(jQuery);