/*
 * jQuery Plugin 
 * Copyright 2015, Sergio León
 * http://panicoenlaxbox.blogspot.com/
 */
(function ($) {
    "use strict";

    function log(message, tag) {
        if (tag) {
            message = tag + ": " + message;
        }
        console.log(message);
    }

    var openedTriggers = [];

    function close(e) {
        // this DOM element
        var $trigger = $(this);
        var data = $trigger.data("panel");
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
        if (data.events.onBeforeClose) {
            if (data.events.onBeforeClose(this, data.panel) === false) {
                return false;
            }
        }
        $trigger.removeClass("tab-panel-trigger-opened");
        $(data._overlay).remove();
        delete data._overlay;
        var $panel = $(data.panel);
        $panel.removeClass("tab-panel-opened");
        $panel.hide();
        data._opened = false;
        openedTriggers.pop();
        if (data._bodyOverflow) {
            $("body").css("overflow", data._bodyOverflow);
        }
        log("onClose", data.tag);
        if (data.events.onClose) {
            data.events.onClose(this, data.panel);
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
        var data = $(currentOpenedTrigger).data("panel");

        if ($target.is(data._overlay) && !data.overlay.modal) {
            close.call(currentOpenedTrigger);
        }
    });

    function getjQueryEl(el) {
        if (el instanceof jQuery) {
            return el;
        }
        return $(el);
    }

    function getDomEl(el) {
        if (el instanceof jQuery) {
            return el[0];
        }
        return el;
    }

    function getAjaxRecipientEl(panel, appendContentToSelector) {
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
        var data = $trigger.data("panel");
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
            var el = getAjaxRecipientEl(data.panel, data.ajax.appendContentToSelector);
            if (data.ajax.removeContentBeforeLoad) {
                $(el).empty();
            }
            $(el).block();
            load(el, data.ajax.url).done(function (_data, textStatus, jqXHR) {
                log("onAjaxDone", data.tag);
                calculateTabContentHeight($trigger);
                (data.events.onAjaxDone || $.noop)(trigger, data.panel, el, _data, textStatus, jqXHR);
            }).fail(function (jqXHR, textStatus, errorThrown) {
                (data.events.onAjaxFail || $.noop)(trigger, data.panel, jqXHR, textStatus, errorThrown);
            }).always(function () {
                $(el).unblock();
            });
        } else {
            calculateTabContentHeight($trigger);
        }
    }

    function calculateTabContentHeight($trigger) {
        var data = $trigger.data("panel");
        if (!data.calculateTabContentHeight) {
            return;
        }
        var $panel = $(data.panel);
        var $tabContent = $panel.find(".tab-content");
        if ($tabContent.length === 0) {
            return;
        }
        var panelHeight = $panel.height();
        var tabContentTop = $tabContent.offset().top;
        var documentScrollTop = $(document).scrollTop();
        var height;
        if (documentScrollTop === 0) {
            height = panelHeight - tabContentTop;
        } else {
            height = panelHeight - (tabContentTop - documentScrollTop);
        }
        console.log("panelHeight ", panelHeight, "tabContentTop ", tabContentTop, "documentScrollTop ", documentScrollTop);
        $tabContent.height(height);
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

    function open(e) {
        // this DOM element
        var $trigger = $(this);
        var data = $trigger.data("panel");
        if (data._opened) {
            return true;
        }
        if (!data._parentTrigger && openedTriggers.length > 0) {
            close.call(openedTriggers[0], e);
        }
        var retval;
        if (data._parentTrigger) {
            retval = open.call(data._parentTrigger, e);
            if (retval === false) {
                return false;
            }
        }
        log("onBeforeOpen", data.tag);
        if (data.events.onBeforeOpen) {
            retval = data.events.onBeforeOpen(this, data.panel);
            if (retval === false) {
                return false;
            }
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
        positioning($panel, data.position, data.offset);
        if (data.fillWindowHeight) {
            $panel.css({
                height: "100%",
                top: 0,
                position: "fixed"
            });
        }
        if (data.removeBodyOverflow) {
            data._bodyOverflow = $("body").css("overflow");
            $("body").css("overflow", "hidden");
        }
        zIndex = parseInt($panel.css("z-index")) - 1;
        var $overlay = $("<div />", {
            "data-role": "panel-overlay",
            css: {
                "position": "fixed",
                "top": 0,
                "right": 0,
                "left": 0,
                "bottom": 0,
                "opacity": data.overlay.options.opacity,
                "background-color": data.overlay.options.backgroundColor,
                "z-index": zIndex
            }
        });
        $("body").append($overlay);
        data._overlay = $overlay[0];
        if (data.animation.active) {
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

    var methods = {
        init: function (options) {
            // this jQuery object
            return this.each(function () {
                // this DOM element
                var settings = $.extend(true, {}, $.fn.panel.defaults, options);
                var $trigger = $(this);
                if (!$trigger.data("panel")) {
                    if (!settings.position.of) {
                        settings.position.of = this;
                    } else if (typeof settings.position.of === "function") {
                        settings.position.of = settings.position.of($trigger);
                    } else {
                        settings.position.of = getDomEl(settings.position.of);
                    }
                    settings.panel = getDomEl(settings.panel);
                    var $panel = $(settings.panel);
                    if (settings.parent.trigger) {
                        var $parentTrigger = getjQueryEl(settings.parent.trigger);
                        settings._parentTrigger = $parentTrigger[0];
                        var parentTriggerData = $parentTrigger.data("panel");
                        settings._parentPanel = parentTriggerData.panel;
                        if (!parentTriggerData._childTriggers) {
                            parentTriggerData._childTriggers = [];
                        }
                        parentTriggerData._childTriggers.push(this);
                    }
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
                    $trigger.data("panel", settings);
                    $panel.data("panel", {
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
            return this.each(function () {
                var $this = $(this);
                var data = $this.data("panel");
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
                        var _parentChildTriggers = $(data._parentTrigger).data("panel")._childTriggers;
                        var index = $.inArray(this, _parentChildTriggers);
                        _parentChildTriggers.splice(index, 1);
                    }
                    var $panel = $(data.panel);
                    $panel.removeClass("tab-panel");
                    $panel.off(".panel");
                    $panel.removeData("panel");
                    $this.off(".panel");
                    $this.removeData("panel");
                    $panel.removeClass("tab-panel-trigger");
                }
            });
        }
    };

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
        animation: {
            active: true,
            direction: "up",
            duration: "fast"
        },
        ajax: {
            appendContentToSelector: "",
            loadIfSelectorNotExist: "",
            loading: false,
            removeContentBeforeLoad: false,
            url: ""
        },
        closePanelSelector: "",
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
            options: {
                backgroundColor: "#000",
                opacity: 0.5
            }
        },
        offset: {
            left: 0,
            top: 0
        },
        panel: null,
        parent: {
            trigger: null
        },
        position: {
            my: "left top", // default "center"
            at: "left bottom", // default "center"
            of: null,
            collision: "none" //default "flip"
        },
        removeBodyOverflow: false,
        sticky: true,
        tag: null,
        zIndex: 500,
        calculateTabContentHeight: true
    };

    // $.panel.foo();
    $.extend({
        panel: (function () {
            return {
                positioning: function (panel) {
                    var $panel = getjQueryEl(panel);
                    var $trigger = $($panel.data("panel").trigger);
                    var data = $trigger.data("panel");
                    positioning($panel, data.position, data.offset);
                },
                getOpenedByTag: function (tag) {
                    for (var i = 0; i < openedTriggers.length; i++) {
                        var $trigger = $(openedTriggers[i]);
                        var data = $trigger.data("panel");
                        if (data.tag === tag) {
                            return {
                                trigger: $trigger[0],
                                panel: data.panel
                            };
                        }
                    }
                },
                getTrigger: function (panel) {
                    var $panel = getjQueryEl(panel);
                    var $trigger = $($panel.data("panel").trigger);
                    return $trigger;
                },
                getPanel: function (trigger) {
                    var $trigger = getjQueryEl(trigger);
                    var $panel = $($trigger.data("panel").panel);
                    return $panel;
                },
                getParentPanel: function (el) {
                    var $panel = getjQueryEl(el).closest(".tab-panel");
                    return $panel;
                }
            }
        })()
    });
})(jQuery);